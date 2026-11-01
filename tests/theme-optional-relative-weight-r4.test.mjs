import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreRelativeThemeBasket} from '../scripts/pc-writer/theme-optional-relative-weight-r4.mjs';
import {adaptivePairWeights} from '../scripts/pc-writer/theme-optional-pair-weight-r3.mjs';

const item=(symbol,sessions,score=50,status=sessions<377?'ADAPTIVE_PROVISIONAL':'R188_COMPATIBLE')=>
 ({symbol,sessions,score,status});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);

test('R4 preserves every approved R3 long+short pair weight exactly',()=>{
 for(const short of [40,41,120,252,376,377,500,627,628,800]){
  const old=adaptivePairWeights({firstSessions:700,secondSessions:short,
   firstStatus:'R188_COMPATIBLE',secondStatus:short<377?'ADAPTIVE_PROVISIONAL':'R188_COMPATIBLE'});
  const newer=scoreRelativeThemeBasket({etfs:[item('UFO',700,65),item('NASA',short,80)]});
  close(newer.weights.UFO,old.first);
  close(newer.weights.NASA,old.second);
  close(newer.score,65*old.first+80*old.second);
 }
});

test('equal-history two young ETFs are always 50:50 (no 628-day gating)',()=>{
 for(const n of [40,120,252,376]){
  const out=scoreRelativeThemeBasket({etfs:[item('AAA',n,25),item('BBB',n,75)]});
  close(out.weights.AAA,.5);close(out.weights.BBB,.5);close(out.score,50);
  assert.equal(out.status,'ADAPTIVE_PROVISIONAL');
 }
});

test('2-year, 1-year, 40-session group gets relative rather than fixed 1/3 weights',()=>{
 const out=scoreRelativeThemeBasket({etfs:[item('AAA',700,90),item('BBB',252,60),item('CCC',40,15)]});
 assert.ok(out.weights.AAA>out.weights.BBB);
 assert.ok(out.weights.BBB>out.weights.CCC);
 close(Object.values(out.weights).reduce((a,b)=>a+b,0),1);
 assert.ok(out.score>=0&&out.score<=100);
 assert.equal(out.publicationAuthorized,false);
});

test('equal maturity has equal weights regardless of ETF count; insertion order is irrelevant',()=>{
 const first=scoreRelativeThemeBasket({etfs:[item('AAA',120,10),item('BBB',120,40),item('CCC',120,80)]});
 const reverse=scoreRelativeThemeBasket({etfs:[item('CCC',120,80),item('AAA',120,10),item('BBB',120,40)]});
 for(const symbol of ['AAA','BBB','CCC']){
  close(first.weights[symbol],1/3);close(first.weights[symbol],reverse.weights[symbol]);
 }
 close(first.score,reverse.score);
});

test('four, five, and many ETFs use one generic formula without a three-ETF cap',()=>{
 for(const sessions of [
  [700,500,120,40],
  [700,500,252,120,40],
  [700,628,500,377,252,144,120,80,41,40],
 ]){
  const etfs=sessions.map((n,i)=>item(`ETF${i+1}`,n,10+i*5));
  const actual=scoreRelativeThemeBasket({etfs});
  assert.equal(Object.keys(actual.weights).length,etfs.length);
  close(Object.values(actual.weights).reduce((sum,w)=>sum+w,0),1);
  for(let i=1;i<etfs.length;i++){
   assert.ok(actual.weights[etfs[i-1].symbol]>=actual.weights[etfs[i].symbol],
    `maturity order broken for ${etfs.length} ETFs at ${i}`);
  }
  const reversed=scoreRelativeThemeBasket({etfs:[...etfs].reverse()});
  close(actual.score,reversed.score);
  for(const symbol of etfs.map(x=>x.symbol))close(actual.weights[symbol],reversed.weights[symbol]);
 }
});

test('five equal-history ETFs normalize to 20% each, without fixed group-level ratios',()=>{
 const etfs=Array.from({length:5},(_,i)=>item(`ETF${i+1}`,120,20+i*10));
 const out=scoreRelativeThemeBasket({etfs});
 for(const weight of Object.values(out.weights))close(weight,.2);
 close(out.score,40);
});

test('historical session counts are day-local, not retroactively replaced by latest maturity',()=>{
 const early=scoreRelativeThemeBasket({etfs:[item('UFO',530,55),item('NASA',40,65)]});
 const later=scoreRelativeThemeBasket({etfs:[item('UFO',650,55),item('NASA',144,65)]});
 close(early.weights.NASA,.30);
 assert.ok(later.weights.NASA>early.weights.NASA);
 assert.ok(later.weights.NASA<.5);
});

test('R4 respects actual R2 indicator-sample status even when count-based parity differs',()=>{
 const gappedLong=scoreRelativeThemeBasket({etfs:[
  item('UFO',600,65,'ADAPTIVE_PROVISIONAL'),
  item('NASA',144,80,'ADAPTIVE_PROVISIONAL')]});
 const usualLong=scoreRelativeThemeBasket({etfs:[
  item('UFO',600,65,'R188_COMPATIBLE'),
  item('NASA',144,80,'ADAPTIVE_PROVISIONAL')]});
 close(gappedLong.score,usualLong.score);
 close(gappedLong.weights.NASA,usualLong.weights.NASA);
 assert.equal(gappedLong.status,'ADAPTIVE_PROVISIONAL');
 const shorterIntersection=scoreRelativeThemeBasket({etfs:[
  item('UFO',370,65,'R188_COMPATIBLE'),
  item('NASA',80,80,'ADAPTIVE_PROVISIONAL')]});
 assert.ok(shorterIntersection.score>=0&&shorterIntersection.score<=100);
 assert.equal(shorterIntersection.status,'ADAPTIVE_PROVISIONAL');
});

test('cannot generate false scores for a 29-session ETF or substitute missing scores',()=>{
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[item('A',29,10),item('B',29,20)]}),
  /INSUFFICIENT_REAL_SESSIONS/);
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[item('AAA',628,50),item('BBB',40,null)]}),
  /MISSING_ACTUAL_ADAPTIVE_SCORE/);
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[item('AAA',628,50),item('BBB',40,NaN)]}),
  /MISSING_ACTUAL_ADAPTIVE_SCORE/);
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[item('AAA',628,50),item('BBB',252,50,'UNVERIFIED')]}),
  /SCORER_PARITY_NOT_VERIFIED/);
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[item('AAA',40,20),item('AAA',40,30)]}),
  /DUPLICATE_TICKER/);
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[item('AAA',40)]}),
  /AT_LEAST_TWO/);
});
