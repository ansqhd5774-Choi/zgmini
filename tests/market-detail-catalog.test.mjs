import test from 'node:test';
import assert from 'node:assert/strict';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';
const ids=['inflation','employment','rates','credit','growth','consumption','earnings','liquidity','fundFlows','breadth','dollarFx','commodities'];
test('detail catalog preserves the legacy one-row fund-flow snapshot until R54 indicators arrive',()=>{
 // R4 replaces the four legacy consumption rows with two score factors and one explanatory row.
 const rows=ids.flatMap(id=>marketDetailRows(id));assert.equal(rows.length,44);
 assert.equal(new Set(rows.map(r=>r.label)).size,44);
 assert.ok(rows.every(r=>r.score===null&&r.value===null));
});
test('consumption R4 exposes two score factors and unscored acceleration',()=>{
 const rows=marketDetailRows('consumption',[
  {name:'실질 소비 최근 3개월',status:'READY',score:70,value:2,unit:'% 연율'},
  {name:'실질 소비 전년 대비',status:'READY',score:60,value:1,unit:'%'},
  {name:'소비 가속·둔화',status:'READY',score:null,value:0,unit:'%p'},
 ]);
 assert.deepEqual(rows.map(row=>row.score),[70,60,null]);
 assert.equal(rows[2].raw,true);assert.equal(rows[2].value,0);
});
test('commodity values are matched by identity, never by array position',()=>{
 const rows=marketDetailRows('commodities',[{name:'휘발유',status:'READY',score:51},{name:'WTI',status:'READY',score:0},{name:'구리',status:'READY',score:33}]);
 assert.deepEqual(rows.map(r=>r.score),[0,null,33,51]);
});
test('unavailable or ambiguous values are not substituted and R53 raw display remains compatible',()=>{
 const legacy=marketDetailRows('fundFlows',[{name:'등록펀드 순유입',status:'READY',value:0.16,unit:'%'}]);
 assert.equal(legacy.length,1);assert.equal(legacy[0].raw,true);assert.equal(legacy[0].value,0.16);
 assert.equal(marketDetailRows('inflation',[{name:'목표안정',status:'PARTIAL',score:65}])[0].score,null);
 assert.equal(marketDetailRows('inflation',[{name:'목표안정',status:'READY',score:65},{name:'목표안정',status:'READY',score:66}])[0].score,null);
});
test('verified breadth raw values preserve zero and units',()=>{
 const r=marketDetailRows('breadth',[{name:'주식공급 폭',status:'READY',value:0,unit:'%'}])[1];
 assert.equal(r.value,0);assert.equal(r.unit,'%');assert.equal(r.raw,true);assert.equal(r.score,null);
});

test('E1-R5 earnings detail rows map all S1-S13 by stable id',()=>{
 const indicators=Array.from({length:13},(_,index)=>({
  id:`S${index+1}`,name:`legacy-name-${index+1}`,status:'READY',score:index+10,
  value:index+0.5,unit:'점',asOfDate:'2026-10-16',source:'fixture',
 }));
 const rows=marketDetailRows('earnings',indicators);
 assert.equal(rows.length,13);
 assert.deepEqual(rows.map(row=>row.label),[
  'EPS 성장 강도','매출 성장률','영업이익률 수준','영업이익률 변화','FCF 마진','BEA 기업이익 변화',
  'EPS 개선 기업 비율','흑자 기업 비율','이익 개선 업종 비율','생산자 원가 압력','단위노동비용 압력','미래 전망 수정','기업 가이던스 방향',
 ]);
 assert.deepEqual(rows.map(row=>row.score),Array.from({length:13},(_,index)=>index+10));
 assert.ok(rows.every(row=>row.asOfDate==='2026-10-16'&&row.source==='fixture'));
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

test('RATE R3 detail rows display scores while preserving raw metadata',()=>{
 const rows=marketDetailRows('rates',[
  {componentId:'curve',name:'장단기 금리차',status:'READY',score:64,currentValue:1.01,displayValue:'1.01%',unit:'%'},
  {componentId:'policy',name:'Fed 정책금리',status:'READY',score:21,currentRange:{lower:3.75,upper:4},displayValue:'3.75–4%',unit:'%'},
  {componentId:'real',name:'미국 10년 실질금리',status:'READY',score:12,currentValue:2.91,displayValue:'2.91%',unit:'%'},
  {componentId:'nominal',name:'미국 2년물',status:'READY',score:18,currentValue:4.89,displayValue:'4.89%',unit:'%'},
 ]);
 assert.deepEqual(rows.map(r=>r.score),[21,18,12,64]);
 assert.ok(rows.every(r=>r.raw===false));
 assert.deepEqual(rows.map(r=>r.displayValue),['3.75–4%','4.89%','2.91%','1.01%']);
});

test('B1-R5 detail rows use new stable ids and formula factors',()=>{
 const rows=marketDetailRows('breadth',[
  {id:'breadth-44',name:'20일 수급 EMA',status:'READY',score:58,value:58,unit:'점'},
  {id:'breadth-42',name:'상승거래대금비율',status:'READY',score:59,value:59,unit:'%'},
  {id:'breadth-41',name:'상승종목비율',status:'READY',score:62.5,value:62.5,unit:'%'},
  {id:'breadth-43',name:'5일 수급 EMA',status:'READY',score:60,value:60,unit:'점'},
 ]);
 assert.deepEqual(rows.map(r=>r.label),['오른 종목 비율','상승 거래비중','5일 수급 추세','20일 수급 추세']);
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
 assert.deepEqual(rows.map(r=>r.label),['실업률','일자리 증가세','실업수당 신청','지역 고용 개선']);
 assert.deepEqual(rows.map(r=>r.score),[70,75,68,80]);
 assert.deepEqual(rows.map(r=>r.value),[4.2,145,220000,80]);
});
