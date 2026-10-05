import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketScoreR1Handler} from '../worker/market-score-r1.mjs';
import {buildFundFlowR54} from '../lib/diagnostic-layer/open-resolution-r53-components.mjs';

const rows=Array.from({length:30},(_,i)=>{
 const observationDate=`${2024+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}-01`;
 const allNetRatio=i===23?0.16:(i%7-3)/10;
 return {observationDate,value:allNetRatio,allNetRatio,indexNetRatio:allNetRatio+0.24,nonIndexNetRatio:allNetRatio-0.18,allOutflowRatio:-(2.2+(i%5)*0.11)};
});
async function response(input){
 const handler=createMarketScoreR1Handler({collectInputs:async()=>({external:{registeredFundFlowRows:input}}),orchestrate:()=>({snapshot:{diagnostics:{}}}),now:()=>new Date('2025-12-20T00:00:00Z')});
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
test('R54 legacy single-series rows do not receive a synthetic or reweighted score',async()=>{
 const legacy=rows.map(({observationDate,value})=>({observationDate,value}));
 const domain=(await response(legacy)).domains.find(x=>x.id==='fundFlows');
 assert.equal(domain.score,null);
 assert.equal(domain.status,'PARTIAL');
 assert.deepEqual(domain.trend,[]);
 assert.deepEqual(domain.indicators,[]);
});
