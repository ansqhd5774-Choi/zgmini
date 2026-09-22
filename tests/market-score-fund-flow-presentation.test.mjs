import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketScoreR1Handler} from '../worker/market-score-r1.mjs';
import {buildFundFlowR53} from '../lib/diagnostic-layer/open-resolution-r53-components.mjs';

const rows=Array.from({length:30},(_,i)=>({observationDate:`${2024+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}-01`,value:i===23?0.16:(i%7-3)/10}));
async function response(input){
 const handler=createMarketScoreR1Handler({collectInputs:async()=>({external:{registeredFundFlowRows:input}}),orchestrate:()=>({snapshot:{diagnostics:{}}}),now:()=>new Date('2025-12-20T00:00:00Z')});
 return (await handler(new Request('https://example.test/api/market-score'))).json();
}
test('F1 public trend retains approved scores, monthly dates and percent units without future rows',async()=>{
 const body=await response(rows),domain=body.domains.find(x=>x.id==='fundFlows');
 const expected=buildFundFlowR53(rows,{asOfDate:'2025-12-20'});
 assert.equal(domain.score,expected.score);
 assert.equal(domain.weight,8);
 assert.equal(domain.status,'READY');
 assert.ok(domain.trend.length>1);
 assert.ok(domain.trend.every(x=>x.label<='2025-12-20'&&x.label.endsWith('-01')));
 assert.equal(domain.trend.at(-1).value,domain.score);
 assert.equal(domain.indicators[0].value,0.16);
 assert.equal(domain.indicators[0].unit,'%');
 assert.match(domain.indicators[0].source,/SEC.*All - Net/);
 assert.equal(body.overall.score,null);
 assert.equal(body.dataQuality.reweighted,false);
});
test('F1 raw zero and negative flows remain signed raw percentages, not gauge scores',async()=>{
 for(const value of [0,-0.16]){
  const domain=(await response(rows.map((row,i)=>i===23?{...row,value}:row))).domains.find(x=>x.id==='fundFlows');
  assert.equal(domain.indicators[0].value,value);
  assert.equal(domain.indicators[0].status,'READY');
  assert.equal(domain.indicators[0].score,undefined);
 }
});
test('F1 missing inputs stay null with no synthetic trend or detail',async()=>{
 const domain=(await response([])).domains.find(x=>x.id==='fundFlows');
 assert.equal(domain.score,null);
 assert.equal(domain.status,'PARTIAL');
 assert.deepEqual(domain.trend,[]);
 assert.deepEqual(domain.indicators,[]);
});
