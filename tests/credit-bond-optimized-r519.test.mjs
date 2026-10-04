import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBondVolatilityR6 as original} from '../lib/diagnostic-layer/bond-vol-r6-components.mjs';
import {buildBondVolatilityR6 as optimized} from '../worker/projection-builders/liquidity-optimized-components.mjs';

function rows(offset){
  const out=[];
  const start=Date.UTC(2024,0,1);
  for(let i=0;i<420;i++){
    const d=new Date(start+i*86400000).toISOString().slice(0,10);
    out.push({observationDate:d,value:2+offset+Math.sin(i/17)*0.3+(i%11)*0.001});
  }
  return out;
}

test('candidate optimized bond volatility is exact-equivalent',()=>{
  const input={y2:rows(0),y5:rows(.2),y10:rows(.4),y30:rows(.6)};
  assert.deepEqual(optimized(input),original(input));
});
