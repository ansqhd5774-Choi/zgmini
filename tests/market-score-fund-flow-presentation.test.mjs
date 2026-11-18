import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketScoreR1Handler} from '../worker/market-score-r1.mjs';
import {buildFundFlowR54} from '../lib/diagnostic-layer/open-resolution-r53-components.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';

const rows=Array.from({length:30},(_,i)=>{
 const observationDate=`${2024+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}-01`;
 const allNetRatio=i===23?0.16:(i%7-3)/10;
 return {observationDate,value:allNetRatio,allNetRatio,indexNetRatio:allNetRatio+0.24,nonIndexNetRatio:allNetRatio-0.18,allOutflowRatio:-(2.2+(i%5)*0.11)};
});
async function response(input,providerSummary={}){
 const handler=createMarketScoreR1Handler({collectInputs:async()=>({external:{registeredFundFlowRows:input},providerSummary}),orchestrate:()=>({snapshot:{diagnostics:{}}}),now:()=>new Date('2025-12-20T00:00:00Z')});
 return (await handler(new Request('https://example.test/api/market-score'))).json();
}
test('R54 public trend uses the weighted monthly score and exposes four stable indicators',async()=>{
 const body=await response(rows),domain=body.domains.find(x=>x.id==='fundFlows');
 const expected=buildFundFlowR54(rows,{asOfDate:'2025-12-20'});
 assert.equal(domain.score,expected.score);
 assert.equal(domain.weight,8);
 assert.equal(domain.status,'READY');
 assert.equal(domain.methodologyVersion,'FUND_FLOW_R54_1');
 assert.ok(domain.trend.length>1);
 assert.ok(domain.trend.every(x=>x.label<='2025-12-20'&&x.label.endsWith('-01')));
 assert.equal(domain.trend.at(-1).value,domain.score);
 assert.deepEqual(domain.indicators.map(x=>x.id),['fund-flow-54-1','fund-flow-54-2','fund-flow-54-3','fund-flow-54-4']);
 assert.ok(domain.indicators.every(x=>x.status==='READY'&&Number.isFinite(x.score)));
 assert.equal(domain.indicators[0].value,0.16);
 assert.equal(domain.indicators[0].unit,'%');
 assert.equal(body.overall.score,null);
 assert.equal(body.dataQuality.reweighted,false);
});
test('SEC R54 exposes four bounded score-only monthly factor mini histories from real calculation rows',async()=>{
 const body=await response(rows),domain=body.domains.find(x=>x.id==='fundFlows');
 const model=buildFundFlowR54(rows,{asOfDate:'2025-12-20'});
 const fields=['allNetScore','momentumScore','participationScore','redemptionScore'];
 assert.equal(domain.indicators.length,4);
 for(let i=0;i<4;i++){
  const factor=domain.indicators[i],key=fields[i];
  assert.ok(Array.isArray(factor.trend)&&factor.trend.length>1&&factor.trend.length<=13,key);
  assert.equal(factor.trend.at(-1).label,model.observationDate);
  assert.equal(factor.trend.at(-1).value,factor.score);
  for(const point of factor.trend){
   const real=model.rows.find(x=>x.observationDate===point.label);
   assert.ok(real,key+': no synthetic month');
   assert.equal(point.value,Number.isFinite(real[key])&&real[key]>=0&&real[key]<=100?real[key]:null);
   assert.equal(point.status,point.value===null?'PARTIAL':'READY');
   assert.deepEqual(Object.keys(point).sort().filter(x=>x!=='breakBefore'),
    ['label','status','value']);
   assert.ok(point.label<='2025-12-20');
   assert.equal(Object.hasOwn(point,'allNetRatio'),false);
   assert.equal(Object.hasOwn(point,'sourceReleaseDate'),false);
  }
 }
 assert.equal(domain.score,model.score);
 assert.equal(domain.weight,8);
 assert.equal(body.dataQuality.reweighted,false);
});

test('SEC R54 monthly factor mini preserves legitimate zero, missing and calendar gaps without interpolation',()=>{
 const snapshot={
  status:'READY',observationDate:'2026-03-01',score:47.5,
  methodologyVersion:'FUND_FLOW_R54_1',
  rows:[
   {observationDate:'2025-11-01',allNetScore:0,momentumScore:35,participationScore:40,redemptionScore:50,score:35,shock:65},
   {observationDate:'2025-12-01',allNetScore:null,momentumScore:30,participationScore:45,redemptionScore:55,score:null,shock:70},
   {observationDate:'2026-02-01',allNetScore:60,momentumScore:42,participationScore:44,redemptionScore:52,score:49,shock:58},
   {observationDate:'2026-03-01',allNetScore:70,momentumScore:40,participationScore:50,redemptionScore:60,score:55,shock:60},
   {observationDate:'2026-04-01',allNetScore:95,momentumScore:99,participationScore:99,redemptionScore:99,score:99,shock:1},
  ]
 };
 const domain=buildCmR1DomainResults({fundFlows:snapshot}).find(x=>x.id==='fundFlows');
 const first=domain.indicators[0].trend;
 assert.deepEqual(first,[
  {label:'2025-11-01',value:0,status:'READY'},
  {label:'2025-12-01',value:null,status:'PARTIAL'},
  {label:'2026-02-01',value:60,status:'READY',breakBefore:true},
  {label:'2026-03-01',value:70,status:'READY'},
 ]);
 assert.deepEqual(domain.indicators.map(x=>x.trend.at(-1).value),[70,40,50,60]);
 assert.ok(domain.indicators.every(x=>x.trend.every(row=>row.label<='2026-03-01')));
 const duplicate={...snapshot,rows:[...snapshot.rows,snapshot.rows[3]]};
 assert.deepEqual(buildCmR1DomainResults({fundFlows:duplicate})
  .find(x=>x.id==='fundFlows').indicators[0].trend,[]);
 const legacy=buildCmR1DomainResults({fundFlows:{...snapshot,status:'PARTIAL'}})
  .find(x=>x.id==='fundFlows');
 assert.deepEqual(legacy.indicators,[]);
});

test('R54 legacy single-series rows do not receive a synthetic or reweighted score',async()=>{
 const legacy=rows.map(({observationDate,value})=>({observationDate,value}));
 const domain=(await response(legacy)).domains.find(x=>x.id==='fundFlows');
 assert.equal(domain.score,null);
 assert.equal(domain.status,'PARTIAL');
 assert.deepEqual(domain.trend,[]);
 assert.deepEqual(domain.indicators,[]);
});

test('SEC R54 publishes the stored source release date separately from observation and snapshot dates',async()=>{
 const expected=buildFundFlowR54(rows,{asOfDate:'2025-12-20'});
 const body=await response(rows,{secFundFlows:{status:'READY_CURRENT_VINTAGE_RAW',sourceReleaseDate:'2025-12-19'}});
 const domain=body.domains.find(x=>x.id==='fundFlows');
 assert.equal(domain.status,'READY');
 assert.equal(domain.score,expected.score);
 assert.equal(domain.observationDate,'2025-12-01');
 assert.equal(domain.updatedAt,'2025-12-01');
 assert.equal(domain.sourceReleaseDate,'2025-12-19');
 assert.equal(domain.trend.at(-1).label,'2025-12-01');
 assert.ok(domain.indicators.every(x=>x.observationDate==='2025-12-01'));
 assert.ok(domain.indicators.every(x=>!Object.hasOwn(x,'sourceReleaseDate')));
 assert.equal(body.asOfDate,'2025-12-20');
});

test('SEC R54 does not invent or mislabel an unknown, invalid, earlier or future source release',async()=>{
 for(const sourceReleaseDate of [undefined,null,'','2025-11-30','2025-12-21','2025-02-30','2025-13-01','GET_2025-12-19']){
  const domain=(await response(rows,{secFundFlows:{sourceReleaseDate}})).domains.find(x=>x.id==='fundFlows');
  assert.equal(domain.sourceReleaseDate,null,String(sourceReleaseDate));
  assert.equal(domain.updatedAt,'2025-12-01');
  assert.equal(domain.observationDate,'2025-12-01');
 }
 const valid=(await response(rows,{secFundFlows:{sourceReleaseDate:'2025-12-19'}})).domains.find(x=>x.id==='fundFlows');
 assert.equal(valid.sourceReleaseDate,'2025-12-19');
 const legacy=rows.map(({observationDate,value})=>({observationDate,value}));
 const partial=(await response(legacy,{secFundFlows:{sourceReleaseDate:'2025-12-19'}})).domains.find(x=>x.id==='fundFlows');
 assert.equal(partial.status,'PARTIAL');
 assert.equal(partial.sourceReleaseDate,null);
});
