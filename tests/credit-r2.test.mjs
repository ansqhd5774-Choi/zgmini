import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCreditR2,CREDIT_R2_CONTRACT} from '../lib/market-score/credit-r2.mjs';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';
import {createMarketScoreR1Handler} from '../worker/market-score-r1.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';

const weekly=(start,n,fn)=>{const out=[],d=new Date(start+'T12:00:00Z');for(let i=0;i<n;i++){out.push({observationDate:d.toISOString().slice(0,10),value:fn(i)});d.setUTCDate(d.getUTCDate()+7)}return out};
const daily=(start,n,fn)=>{const out=[],d=new Date(start+'T12:00:00Z');for(let i=0;i<n;i++){while(d.getUTCDay()===0||d.getUTCDay()===6)d.setUTCDate(d.getUTCDate()+1);out.push({observationDate:d.toISOString().slice(0,10),value:fn(i)});d.setUTCDate(d.getUTCDate()+1)}return out};
const cmdi=weekly('2018-01-05',430,i=>i).map((r,i)=>({...r,hy:.25+.05*Math.sin(i/15),ig:.18+.04*Math.sin(i/17),market:.2}));
const nfci=weekly('2015-01-02',650,i=>-1+i*.001+Math.sin(i/20)*.03);
const y2=daily('2015-01-02',3000,i=>2+Math.sin(i/30)*.2);
const y5=daily('2015-01-02',3000,i=>2.3+Math.sin(i/31)*.22);
const y10=daily('2015-01-02',3000,i=>2.6+Math.sin(i/32)*.24);
const y30=daily('2015-01-02',3000,i=>3+Math.sin(i/33)*.26);
const asOf=cmdi.at(-1).observationDate;
const inputs=()=>({cmdi,nfciCredit:nfci,y2,y5,y10,y30,asOfDate:asOf});

test('CREDIT R2 contract uses approved HY IG NFCI Credit and bond volatility weights',()=>{
 assert.deepEqual(CREDIT_R2_CONTRACT.weights,{hy:.35,ig:.35,nfciCredit:.10,bondVolatility:.20});
 assert.equal(CREDIT_R2_CONTRACT.nfciSeries,'NFCICREDIT');
 assert.equal(CREDIT_R2_CONTRACT.missingReweight,false);
});

test('CREDIT R2 publishes four scored indicators and nonempty native trend',()=>{
 const r=buildCreditR2(inputs());
 assert.equal(r.status,'READY');
 assert.equal(r.methodologyVersion,'CREDIT_R2_NFCI_4FACTOR_R1');
 assert.deepEqual(r.indicators.map(x=>x.id),['credit-41','credit-42','credit-43','credit-44']);
 assert.ok(r.indicators.every(x=>Number.isFinite(x.score)));
 assert.ok(r.trend.length>50);
 const c=r.componentScores;
 assert.ok(Math.abs(r.score-(.35*c.hy+.35*c.ig+.10*c.nfciCredit+.20*c.bondVolatility))<1e-12);
});

test('Market CMDI raw field cannot affect CREDIT R2 score',()=>{
 const a=buildCreditR2(inputs());
 const b=buildCreditR2({...inputs(),cmdi:cmdi.map(x=>({...x,market:.99}))});
 assert.equal(a.score,b.score);
 assert.deepEqual(a.componentScores,b.componentScores);
});

test('missing NFCICREDIT fails closed without reweighting',()=>{
 const r=buildCreditR2({...inputs(),nfciCredit:[]});
 assert.equal(r.status,'PARTIAL');
 assert.equal(r.score,null);
 assert.ok(r.missingFactors.includes('credit-43'));
});

test('NFCICREDIT null, empty and whitespace are missing, never a percentile zero or warmup row',()=>{
 const pre=nfci.slice(0,259);
 for(const raw of [null,'','  ',undefined,'NA']){
  const bad=[...pre,{...nfci[259],value:raw}];
  const r=buildCreditR2({...inputs(),nfciCredit:bad});
  assert.equal(r.status,'PARTIAL',String(raw));
  assert.equal(r.score,null,String(raw));
  assert.ok(r.missingFactors.includes('credit-43'),String(raw));
  assert.equal(r.indicators.find(x=>x.id==='credit-43').score,null,String(raw));
 }
 const without=buildCreditR2({...inputs(),nfciCredit:pre});
 assert.equal(without.status,'PARTIAL');
 assert.ok(without.missingFactors.includes('credit-43'));
});

test('NFCICREDIT boolean, array, boxed zero and object cannot masquerade as valid 260th observation',()=>{
 const pre=nfci.slice(0,259);
 for(const raw of [false,true,[],[0],{},new Number(0),0n]){
  const rows=[...pre,{...nfci[259],value:raw}];
  const result=buildCreditR2({...inputs(),nfciCredit:rows});
  assert.equal(result.status,'PARTIAL',String(raw));
  assert.equal(result.score,null,String(raw));
  assert.ok(result.missingFactors.includes('credit-43'),String(raw));
  assert.equal(result.indicators.find(x=>x.id==='credit-43').score,null,String(raw));
 }
 const numerical=buildCreditR2({...inputs(),nfciCredit:[...pre,{...nfci[259],value:0}]});
 const textual=buildCreditR2({...inputs(),nfciCredit:[...pre,{...nfci[259],value:'0'}]});
 assert.equal(numerical.status,'READY');
 assert.equal(textual.status,'READY');
 assert.equal(numerical.score,textual.score);
});

test('CREDIT R2 rejects impossible observation calendar dates before the 260-row NFCI warmup',()=>{
 const pre=nfci.slice(0,259);
 for(const invalid of ['2026-02-30','2026-02-29','2026-04-31','2026-00-01','2026-13-01']){
  const result=buildCreditR2({...inputs(),nfciCredit:[...pre,{observationDate:invalid,value:0}]});
  assert.equal(result.status,'PARTIAL',invalid);
  assert.equal(result.score,null,invalid);
  assert.ok(result.missingFactors.includes('credit-43'),invalid);
  assert.equal(result.indicators.find(x=>x.id==='credit-43').score,null,invalid);
 }
 const leap=buildCreditR2({...inputs(),nfciCredit:[...pre,{observationDate:'2024-02-29',value:0}]});
 assert.equal(leap.status,'READY');
 assert.equal(leap.indicators.find(x=>x.id==='credit-43').value,0);
 assert.equal(leap.indicators.find(x=>x.id==='credit-43').observationDate,'2024-02-29');
});

test('CREDIT R2 rejects impossible as-of dates without inventing a calendar observation',()=>{
 for(const asOfDate of ['2026-02-30','2026-02-29','2026-04-31','2026-13-01']){
  const result=buildCreditR2({...inputs(),asOfDate});
  assert.equal(result.status,'UNAVAILABLE',asOfDate);
  assert.equal(result.reason,'INVALID_AS_OF',asOfDate);
  assert.equal(result.score,null,asOfDate);
 }
 const leap=buildCreditR2({...inputs(),asOfDate:'2024-02-29'});
 assert.notEqual(leap.reason,'INVALID_AS_OF');
});

test('NFCICREDIT genuine numeric zero and nonblank string zero count as valid 260th observation',()=>{
 const pre=nfci.slice(0,259);
 const observed=nfci[259];
 const numeric=buildCreditR2({...inputs(),nfciCredit:[...pre,{...observed,value:0}]});
 const textual=buildCreditR2({...inputs(),nfciCredit:[...pre,{...observed,value:'0'}]});
 assert.equal(numeric.status,'READY');
 assert.equal(textual.status,'READY');
 assert.equal(numeric.missingFactors.includes('credit-43'),false);
 assert.equal(numeric.indicators.find(x=>x.id==='credit-43').value,0);
 assert.equal(textual.indicators.find(x=>x.id==='credit-43').value,0);
 assert.equal(textual.componentScores.nfciCredit,numeric.componentScores.nfciCredit);
 assert.equal(textual.score,numeric.score);
 assert.deepEqual(CREDIT_R2_CONTRACT.weights,{hy:.35,ig:.35,nfciCredit:.10,bondVolatility:.20});
 assert.equal(CREDIT_R2_CONTRACT.nfciMinValid,260);
});

test('credit detail catalog shows four component scores in approved order',()=>{
 const r=buildCreditR2(inputs());
 const rows=marketDetailRows('credit',r.indicators);
 assert.deepEqual(rows.map(x=>x.label),['고위험 회사채','우량 회사채','신용여건','채권 변동성']);
 assert.deepEqual(rows.map(x=>x.score),r.indicators.map(x=>x.score));
 assert.ok(rows.every(x=>x.raw===false));
});

test('public runtime explicit CREDIT R2 overrides legacy diagnostic credit score and carries trend',async()=>{
 const series={NFCICREDIT:nfci,DGS2:y2,DGS5:y5,DGS10:y10,DGS30:y30};
 const handler=createMarketScoreR1Handler({
  now:()=>new Date(asOf+'T12:00:00Z'),
  collectInputs:async()=>({series,external:{cmdiRows:cmdi},rateR2:{series:{}}}),
  orchestrate:()=>({snapshot:{diagnostics:{creditRiskDefense:{status:'READY',score:99,missing:[]}}}}),
  loadInflationDomain:async()=>({status:'PARTIAL',score:null}),
  loadConsumptionDomain:async()=>({status:'PARTIAL',score:null}),
  loadGrowthDomain:async()=>({status:'NOT_READY',score:null}),
  loadLiquidityHistory:async()=>[],
  loadEmploymentDomain:async()=>({status:'PARTIAL',score:null}),
  collectBreadthDomain:async()=>({status:'PARTIAL',score:null}),
 });
 const response=await handler(new Request('https://example.test/api/market-score'));
 assert.equal(response.status,200);
 const credit=(await response.json()).domains.find(x=>x.id==='credit');
 const expected=buildCreditR2(inputs());
 assert.equal(credit.score,expected.score);
 assert.equal(credit.methodologyVersion,'CREDIT_R2_NFCI_4FACTOR_R1');
 assert.ok(credit.trend.length>50);
 assert.equal(credit.indicators.length,4);
 assert.notEqual(credit.score,99);
});

test('CREDIT R2 four factor mini histories are source-observation scored points, not raw series',()=>{
 const result=buildCreditR2(inputs());
 assert.equal(result.status,'READY');
 assert.deepEqual(result.indicators.map(x=>x.id),['credit-41','credit-42','credit-43','credit-44']);
 for(const item of result.indicators){
  assert.ok(item.trend.length>1,item.id);
  assert.equal(item.trend.at(-1).label,item.observationDate,item.id);
  assert.equal(item.trend.at(-1).value,item.score,item.id);
  assert.ok(item.trend.every(point=>point.label<=asOf));
  assert.ok(item.trend.every(point=>Object.keys(point).every(key=>
   ['label','value','status','breakBefore'].includes(key))));
  assert.ok(item.trend.every(point=>point.value===null||
   (Number.isFinite(point.value)&&point.value>=0&&point.value<=100)));
 }
 const domain=buildCompositeMarketScore(buildCmR1DomainResults({credit:result}),
  {updatedAt:asOf+'T00:00:00Z'}).domains.find(x=>x.id==='credit');
 assert.deepEqual(domain.indicators.map(x=>x.trend.at(-1).value),
  result.indicators.map(x=>x.score));
 assert.deepEqual(CREDIT_R2_CONTRACT.weights,{hy:.35,ig:.35,nfciCredit:.10,bondVolatility:.20});
});

test('CREDIT R2 retains weekly composite anchors, 0/null and nonfabricated mixed-cadence minis',()=>{
 const source=[
  {observationDate:'2026-10-23',hy:1,ig:0,privateRow:123},
  {observationDate:'2026-10-30',hy:null,ig:.23},
  {observationDate:'2026-11-13',hy:.15,ig:.24},
  {observationDate:'2026-11-19',hy:0,ig:0},
 ];
 const result=buildCreditR2({...inputs(),cmdi:source,asOfDate:'2026-11-18'});
 assert.equal(result.status,'READY');
 assert.equal(result.trend.at(-1).label,'2026-11-13');
 assert.equal(result.trend.some(point=>point.label==='2026-11-18'),false);
 assert.deepEqual(result.indicators[0].trend,[
  {label:'2026-10-23',value:0,status:'READY'},
  {label:'2026-10-30',value:null,status:'PARTIAL'},
  {label:'2026-11-13',value:85,status:'READY',breakBefore:true},
 ]);
 assert.equal(result.indicators[1].trend[0].value,100);
 assert.ok(result.indicators.every(x=>x.trend.every(p=>p.label<='2026-11-18')));
 assert.ok(result.indicators.every(x=>x.trend.every(p=>!Object.hasOwn(p,'privateRow'))));
 assert.equal(result.indicators[0].score,85);
});

test('CREDIT R2 conflicting duplicate factor score fails closed for mini, not valid headline',()=>{
 const input=inputs();
 const source=[
  {observationDate:'2026-10-23',hy:.2,ig:.2},
  {observationDate:'2026-11-13',hy:.15,ig:.24},
  {observationDate:'2026-11-13',hy:.30,ig:.24},
 ];
 const result=buildCreditR2({...input,cmdi:source,asOfDate:'2026-11-18'});
 assert.equal(result.status,'READY');
 assert.deepEqual(result.indicators[0].trend,[]);
 assert.ok(result.indicators[1].trend.length>0);
 assert.ok(Number.isFinite(result.score));
});
