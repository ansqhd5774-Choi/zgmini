import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CREDIT_R2_CONTRACT,buildCreditR2} from '../lib/market-score/credit-r2.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';
import {verifiedEconomicCreditScore,verifiedEconomicCreditChart,isEconomicCreditChartCurrent} from '../lib/economic-credit-stored-display-r4.mjs';

const panel=readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
const asOfDate='2026-11-17';
const interpretation='채권·신용 R2: HY CMDI 35% + IG CMDI 35% + Chicago Fed NFCI Credit 10% + 미 국채 변동성 20%. 0=극단적 신용 스트레스, 100=매우 양호.';
const make=()=>({id:'credit',status:'READY',score:62,methodologyVersion:CREDIT_R2_CONTRACT.methodologyVersion,
 freshness:'CURRENT',interpretation,updatedAt:'2026-11-13',missingFactors:[],
 indicators:[['credit-41','HY CMDI'],['credit-42','IG CMDI'],['credit-43','NFCICREDIT'],['credit-44','2Y/5Y/10Y/30Y 20D realized volatility']]
 .map(([id,sourceKey],i)=>({id,sourceKey,status:'READY',score:62,observationDate:i<2?'2026-11-13':i===2?'2026-11-11':'2026-11-16'})),
 trend:[{label:'2026-09-04',value:58},{label:'2026-10-30',value:60},{label:'2026-11-13',value:61}]});
const week=(n,start,fn)=>{const d=new Date(start+'T12:00:00Z'),out=[];for(let i=0;i<n;i++){out.push({observationDate:d.toISOString().slice(0,10),value:fn(i)});d.setUTCDate(d.getUTCDate()+7)}return out};
const day=(n,start,fn)=>{const d=new Date(start+'T12:00:00Z'),out=[];while(out.length<n){if(![0,6].includes(d.getUTCDay()))out.push({observationDate:d.toISOString().slice(0,10),value:fn(out.length)});d.setUTCDate(d.getUTCDate()+1)}return out};
let realCache;
const actual=()=>{
 if(realCache)return realCache;
 const cmdi=week(390,'2019-01-04',i=>i).map((p,i)=>({...p,hy:.25+.05*Math.sin(i/15),ig:.18+.04*Math.sin(i/17)}));
 const nfciCredit=week(390,'2019-01-04',i=>-1+i*.001+Math.sin(i/20)*.03);
 const y2=day(460,'2024-10-01',i=>2+Math.sin(i/30)*.2);
 const y5=day(460,'2024-10-01',i=>2.3+Math.sin(i/31)*.22);
 const y10=day(460,'2024-10-01',i=>2.6+Math.sin(i/32)*.24);
 const y30=day(460,'2024-10-01',i=>3+Math.sin(i/33)*.26);
 const asOf=cmdi.at(-1).observationDate;
 const source=buildCreditR2({cmdi,nfciCredit,y2,y5,y10,y30,asOfDate:asOf});
 assert.equal(source.status,'READY');
 const publicDomain=buildCompositeMarketScore(buildCmR1DomainResults({credit:source}),{updatedAt:asOf+'T00:00:00Z'})
  .domains.find(x=>x.id==='credit');
 realCache={source,publicDomain,asOf};
 return realCache;
};

test('exact approved CREDIT R2 four stored factors HY/IG/NFCICREDIT/Treasury volatility 35/35/10/20',()=>{
 const p=make();
 assert.deepEqual(CREDIT_R2_CONTRACT.weights,{hy:.35,ig:.35,nfciCredit:.10,bondVolatility:.20});
 assert.equal(verifiedEconomicCreditScore(p,asOfDate),62);
 assert.deepEqual(verifiedEconomicCreditChart(p,asOfDate,62),
  p.trend.map(({label,value})=>({date:label,score:value})));
});
test('actual approved calculator to adapter to composite produces verifiable public score and historical chart',()=>{
 const {source,publicDomain,asOf}=actual();
 assert.equal(publicDomain.methodologyVersion,'CREDIT_R2_NFCI_4FACTOR_R1');
 assert.equal(verifiedEconomicCreditScore(publicDomain,asOf),source.score);
 assert.deepEqual(publicDomain.indicators.map(x=>x.id),['credit-41','credit-42','credit-43','credit-44']);
 assert.ok(verifiedEconomicCreditChart(publicDomain,asOf,source.score).length>4);
});
test('weekly CMDI latest point may predate D1 current when daily bond source changes',()=>{
 const p=make();p.indicators[3].score=82;p.score=66;p.updatedAt='2026-11-16';
 assert.equal(verifiedEconomicCreditScore(p,asOfDate),66);
 const chart=verifiedEconomicCreditChart(p,asOfDate,66);
 assert.equal(chart.at(-1).date,'2026-11-13');
 assert.equal(isEconomicCreditChartCurrent(chart,asOfDate,66),false);
});
test('older accepted 14+ day input with R2 SOFT_STALE remains explicitly stale, not imputed',()=>{
 const p=make();p.freshness='SOFT_STALE';p.indicators[2].observationDate='2026-10-16';
 assert.equal(verifiedEconomicCreditScore(p,asOfDate),62);
 assert.equal(verifiedEconomicCreditChart(p,asOfDate,62).length,3);
});
test('incorrect method, partial status, missing factor or absent source fails closed',()=>{
 for(const patch of [{methodologyVersion:'CREDIT_R1'},{methodologyVersion:null},
  {status:'PARTIAL'},{status:'UNAVAILABLE'},{freshness:'UNAVAILABLE'},{interpretation:'legacy credit'},
  {missingFactors:['credit-43']}])assert.equal(verifiedEconomicCreditScore({...make(),...patch},asOfDate),null);
});
test('all four IDs and source keys, observation dates and weighted score parity are mandatory',()=>{
 const changes=[p=>p.indicators.pop(),p=>p.indicators[0].id='credit-00',p=>p.indicators[1].sourceKey='Market CMDI',
  p=>p.indicators[1].status='PARTIAL',p=>p.indicators[2].score=null,
  p=>p.indicators[2].observationDate='2026-11-18',p=>p.indicators[3].observationDate='2026-02-30',
  p=>p.indicators[3].score=2,p=>p.score=66];
 for(const change of changes){const p=make();change(p);assert.equal(verifiedEconomicCreditScore(p,asOfDate),null);}
});
test('null/string/NaN/nonfinite/out-of-range public score is never coerced to zero',()=>{
 for(const score of [null,undefined,'62',NaN,Infinity,-1,101])
 assert.equal(verifiedEconomicCreditScore({...make(),score},asOfDate),null);
});
test('valid zero, 100, and a zero-valued source component remain legitimate',()=>{
 for(const v of [0,100]){const p=make();p.indicators.forEach(x=>x.score=v);p.score=v;
  assert.equal(verifiedEconomicCreditScore(p,asOfDate),v);}
 const p=make();p.indicators[0].score=0;p.score=62-62*.35;
 assert.equal(verifiedEconomicCreditScore(p,asOfDate),p.score);
});
test('future, invalid and outside-one-year chart observations excluded, no invented as-of point',()=>{
 const p=make();p.trend.unshift({label:'2024-10-10',value:44},{label:'2026-02-30',value:33},
  {label:'2026-11-19',value:75},{label:'2026-11-12',value:null});
 assert.deepEqual(verifiedEconomicCreditChart(p,asOfDate,62),
  make().trend.map(({label,value})=>({date:label,score:value})));
});
test('conflicting duplicate same-day score suppresses history without discarding approved headline',()=>{
 const p=make();p.trend.push({label:'2026-11-13',value:49});
 assert.equal(verifiedEconomicCreditScore(p,asOfDate),62);
 assert.deepEqual(verifiedEconomicCreditChart(p,asOfDate,62),[]);
});
test('matching explicitly stored current day point is current; mismatch cannot be shown as current',()=>{
 const p=make();p.trend.push({label:asOfDate,value:62});
 assert.equal(isEconomicCreditChartCurrent(verifiedEconomicCreditChart(p,asOfDate,62),asOfDate,62),true);
 const q=make();q.trend.push({label:asOfDate,value:60});
 assert.deepEqual(verifiedEconomicCreditChart(q,asOfDate,62),[]);
});
test('same-day identical history deduplicates, sorts, preserves genuine zero point',()=>{
 const p=make();p.trend=[...p.trend.slice().reverse(),{label:'2026-10-16',value:0},make().trend[1]];
 const chart=verifiedEconomicCreditChart(p,asOfDate,62);
 assert.equal(chart.length,4);
 assert.equal(chart.find(x=>x.date==='2026-10-16').score,0);
});
test('missing historical current point cannot create period delta even when headline verifies',()=>{
 const p=make();p.trend=[];assert.equal(verifiedEconomicCreditScore(p,asOfDate),62);
 assert.deepEqual(verifiedEconomicCreditChart(p,asOfDate,62),[]);
 assert.equal(isEconomicCreditChartCurrent([],asOfDate,62),false);
});
test('UI wires strict credit guard while preserving inflation, employment and rates boundaries',()=>{
 assert.match(panel,/id==="credit"\?verifiedEconomicCreditScore\(domain,payload\?\.asOfDate\)/);
 assert.match(panel,/verifiedEconomicCreditChart\(domain,payload\?\.asOfDate,score\)/);
 assert.match(panel,/isEconomicCreditChartCurrent\(creditChart,payload\?\.asOfDate,score\)/);
 assert.match(panel,/id==="inflation"\?inflationChart:id==="employment"\?employmentChart:id==="rates"\?rateChart:id==="credit"\?creditChart/);
 assert.match(panel,/useStoredIndex<EmploymentR6Display>\("\/api\/employment-r6\/observations"/);
});
