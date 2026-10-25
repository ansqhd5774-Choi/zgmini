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

test('historical session counts are day-local, not retroactively replaced by latest maturity',()=>{
 const early=scoreRelativeThemeBasket({etfs:[item('UFO',530,55),item('NASA',40,65)]});
 const later=scoreRelativeThemeBasket({etfs:[item('UFO',650,55),item('NASA',144,65)]});
 close(early.weights.NASA,.30);
 assert.ok(later.weights.NASA>early.weights.NASA);
 assert.ok(later.weights.NASA<.5);
});

test('cannot generate false scores for a 29-session ETF or substitute missing scores',()=>{
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[item('A',29,10),item('B',29,20)]}),
  /INSUFFICIENT_REAL_SESSIONS/);
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[item('AAA',628,50),item('BBB',40,null)]}),
  /MISSING_ACTUAL_ADAPTIVE_SCORE/);
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[item('AAA',628,50),item('BBB',40,NaN)]}),
  /MISSING_ACTUAL_ADAPTIVE_SCORE/);
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[item('AAA',628,50),item('BBB',252,50,'R188_COMPATIBLE')]}),
  /SCORER_PARITY_NOT_VERIFIED/);
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[item('AAA',40,20),item('AAA',40,30)]}),
  /DUPLICATE_TICKER/);
 assert.throws(()=>scoreRelativeThemeBasket({etfs:[item('AAA',40)]}),
  /AT_LEAST_TWO/);
});
