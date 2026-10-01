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

test('B1-R5 detail rows use new stable ids and formula factors',()=>{
 const rows=marketDetailRows('breadth',[
  {id:'breadth-44',name:'20일 수급 EMA',status:'READY',score:58,value:58,unit:'점'},
  {id:'breadth-42',name:'상승거래대금비율',status:'READY',score:59,value:59,unit:'%'},
  {id:'breadth-41',name:'상승종목비율',status:'READY',score:62.5,value:62.5,unit:'%'},
  {id:'breadth-43',name:'5일 수급 EMA',status:'READY',score:60,value:60,unit:'점'},
 ]);
 assert.deepEqual(rows.map(r=>r.label),['상승종목비율','상승거래대금비율','5일 수급 EMA','20일 수급 EMA']);
 assert.deepEqual(rows.map(r=>r.score),[62.5,59,60,58]);
 assert.deepEqual(rows.map(r=>r.unit),['%','%','점','점']);
});


test('Employment R54 detail rows map by stable factor id',()=>{
 const rows=marketDetailRows('employment',[
  {id:'employment-44',name:'주 실업수당 개선 비율',status:'READY',score:80,value:80,unit:'%'},
  {id:'employment-42',name:'비농업고용 3M 평균 증감',status:'READY',score:75,value:145,unit:'천명/월'},
  {id:'employment-41',name:'실업률',status:'READY',score:70,value:4.2,unit:'%'},
  {id:'employment-43',name:'신규 실업수당 4W 평균',status:'READY',score:68,value:220000,unit:'건'},
 ]);
 assert.deepEqual(rows.map(r=>r.label),['실업률','비농업고용 3M 평균 증감','신규 실업수당 4W 평균','주 실업수당 개선 비율']);
 assert.deepEqual(rows.map(r=>r.score),[70,75,68,80]);
 assert.deepEqual(rows.map(r=>r.value),[4.2,145,220000,80]);
});
