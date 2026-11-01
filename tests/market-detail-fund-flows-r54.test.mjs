import test from 'node:test';
import assert from 'node:assert/strict';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';

test('fund flow R54 switches to four stable score rows only when all four indicators exist',()=>{
 const rows=marketDetailRows('fundFlows',[
  {id:'fund-flow-54-4',name:'환매 압력',status:'READY',score:48,value:2.61,unit:'%'},
  {id:'fund-flow-54-2',name:'순유입 모멘텀',status:'READY',score:55,value:-0.22,unit:'%p'},
  {id:'fund-flow-54-1',name:'전체 등록펀드 순유입',status:'READY',score:62,value:0.16,unit:'%'},
  {id:'fund-flow-54-3',name:'인덱스·비인덱스 동반 유입',status:'READY',score:71,unit:'%'},
 ]);
 assert.deepEqual(rows.map(r=>r.label),['전체 펀드 순유입','순유입 추세','펀드 동반 유입','환매 압력']);
 assert.deepEqual(rows.map(r=>r.score),[62,55,71,48]);
 assert.ok(rows.every(r=>r.raw===false));
});
test('fund flow R53 stored snapshot remains one raw row before R54 publication',()=>{
 const rows=marketDetailRows('fundFlows',[{name:'등록펀드 순유입',status:'READY',value:0.16,unit:'%',observationDate:'2026-03-01'}]);
 assert.equal(rows.length,1);assert.equal(rows[0].label,'등록펀드 순유입');assert.equal(rows[0].raw,true);assert.equal(rows[0].value,0.16);
});
test('incomplete R54 indicators fail closed instead of partially reweighting',()=>{
 const rows=marketDetailRows('fundFlows',[{id:'fund-flow-54-1',name:'전체 등록펀드 순유입',status:'READY',score:62,value:0.16,unit:'%'}]);
 assert.equal(rows.length,1);assert.equal(rows[0].label,'등록펀드 순유입');assert.equal(rows[0].score,null);assert.equal(rows[0].value,null);
});
