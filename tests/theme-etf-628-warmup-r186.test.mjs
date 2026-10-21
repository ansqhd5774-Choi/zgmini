import test from 'node:test';
import assert from 'node:assert/strict';
import {r158ScorePrices,R158_SYMBOLS,R158_PAIRS} from '../lib/market-score/theme-etf-provisional-score.mjs';

// Offline deterministic fixtures, not a real E: storage read or production data.
const close=(t,i)=>100+t*.9+i*.034+Math.sin((i+t)/17)*2.1+Math.cos((i+t*2)/39)*1.4;
const longSpy=Array.from({length:701},(_,i)=>close(0,i));
test('R186 trailing three scores are identical with 628 and 701 trading-day inputs',()=>{
 for(let t=1;t<R158_SYMBOLS.length;t++){
  const full=Array.from({length:701},(_,i)=>close(t,i));
  const a=r158ScorePrices(full,longSpy);
  const b=r158ScorePrices(full.slice(-628),longSpy.slice(-628));
  for(let k=0;k<3;k++){
   const lhs=a[700-k],rhs=b[627-k];
   assert.ok(Number.isFinite(rhs),R158_SYMBOLS[t]+' '+k);
   assert.ok(Math.abs(lhs-rhs)<1e-9,R158_SYMBOLS[t]+' '+k+': '+lhs+' vs '+rhs);
  }
 }
});
test('R186 252 scores need a 125-session longest lookback and a 252-item rank window',()=>{
 assert.equal(125+251+252,628);
 assert.equal(628-377+1,252);
 assert.equal(R158_PAIRS.length,7);
 // This does not assert that the current scorer computes 252 returned points:
 // r158ScorePrices currently materializes only the trailing 3.
});
