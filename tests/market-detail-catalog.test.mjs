import test from 'node:test';
import assert from 'node:assert/strict';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';
const ids=['inflation','employment','rates','credit','growth','consumption','earnings','liquidity','fundFlows','breadth','dollarFx','commodities'];
test('all twelve cards retain four ordered rows without data',()=>{
 const rows=ids.flatMap(id=>marketDetailRows(id));assert.equal(rows.length,48);
 assert.equal(new Set(rows.map(r=>r.label)).size,48);
 assert.ok(rows.every(r=>r.score===null&&r.value===null));
});
test('commodity values are matched by identity, never by array position',()=>{
 const rows=marketDetailRows('commodities',[{name:'휘발유',status:'READY',score:51},{name:'WTI',status:'READY',score:0},{name:'구리',status:'READY',score:33}]);
 assert.deepEqual(rows.map(r=>r.score),[0,null,33,51]);
});
test('unavailable or ambiguous values and different fund universes are not substituted',()=>{
 assert.equal(marketDetailRows('fundFlows',[{name:'등록펀드 순유입',status:'READY',value:0.16}])[1].value,null);
 assert.equal(marketDetailRows('inflation',[{name:'목표안정',status:'PARTIAL',score:65}])[0].score,null);
 assert.equal(marketDetailRows('inflation',[{name:'목표안정',status:'READY',score:65},{name:'목표안정',status:'READY',score:66}])[0].score,null);
});
test('verified breadth raw values preserve zero and units',()=>{
 const r=marketDetailRows('breadth',[{name:'상승 종목 비율',status:'READY',value:0,unit:'%'}])[1];
 assert.equal(r.value,0);assert.equal(r.unit,'%');assert.equal(r.raw,true);assert.equal(r.score,null);
});


test('Growth R2 representative UI rows map by stable feature id',()=>{
 const rows=marketDetailRows('growth',[
  {id:'G060',status:'READY',score:38,observationDate:'2026-08-01'},
  {id:'G010',status:'READY',score:52,observationDate:'2026-08-01'},
  {id:'G035',status:'READY',score:41,observationDate:'2026-08-01'},
  {id:'G019',status:'READY',score:47,observationDate:'2026-08-01'},
 ]);
 assert.deepEqual(rows.map(r=>r.label),['제조업 신규주문','산업생산','비농업고용 증감','신규 사업체 신청']);
 assert.deepEqual(rows.map(r=>r.score),[52,47,41,38]);
 assert.deepEqual(rows.map(r=>r.asOfDate),['2026-08-01','2026-08-01','2026-08-01','2026-08-01']);
});
