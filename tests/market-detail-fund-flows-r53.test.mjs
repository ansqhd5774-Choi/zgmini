import test from 'node:test';
import assert from 'node:assert/strict';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';

test('fund flow R53 renders the approved registered fund net inflow row',()=>{
 const rows=marketDetailRows('fundFlows',[{
  name:'등록펀드 순유입',
  status:'READY',
  value:1.2345,
  unit:'%',
  observationDate:'2026-03-01',
  source:'SEC Registered Fund Statistics / Section.3_Flows_Table.3.2 / All - Net',
 }]);
 assert.equal(rows.length,1);
 assert.equal(rows[0].label,'등록펀드 순유입');
 assert.equal(rows[0].raw,true);
 assert.equal(rows[0].score,null);
 assert.equal(rows[0].value,1.2345);
 assert.equal(rows[0].unit,'%');
 assert.equal(rows[0].asOfDate,'2026-03-01');
});

test('fund flow missing data keeps one approved unavailable row and no legacy labels',()=>{
 const rows=marketDetailRows('fundFlows',[]);
 assert.equal(rows.length,1);
 assert.equal(rows[0].label,'등록펀드 순유입');
 assert.equal(rows[0].raw,true);
 assert.equal(rows[0].score,null);
 assert.equal(rows[0].value,null);
 const text=JSON.stringify(rows);
 for(const legacy of ['외국인 미국주식 순매수','미국 주식 ETF·펀드 순유입','전체 TIC 순유입','위험자산 유입 비중']){
  assert.equal(text.includes(legacy),false);
 }
});
