import test from 'node:test';
import assert from 'node:assert/strict';
import {expandingPercentileValues} from '../worker/projection-builders/liquidity-optimized-components.mjs';
import {expandingPercentileRows} from '../lib/diagnostic-layer/series-math.mjs';

function legacy(values,{inverse=false,minValid=1}={}){
  const out=new Array(values.length).fill(null);
  const history=[];
  for(let i=0;i<values.length;i++){
    const value=values[i];
    if(typeof value!=='number'||!Number.isFinite(value))continue;
    history.push(value);
    if(history.length<minValid)continue;
    let lower=0,equal=0;
    for(const item of history){
      if(item<value)lower+=1;
      else if(item===value)equal+=1;
    }
    const rank=(lower+0.5*equal)/history.length;
    out[i]=100*(inverse?1-rank:rank);
  }
  return out;
}

test('optimized expanding percentile is exact-equivalent to legacy rank semantics',()=>{
  const values=[3,1,2,2,5,4,4,4,-1,0,3,8,8,7,6,NaN,5,2];
  for(const inverse of [false,true]){
    for(const minValid of [1,3,5,10]){
      assert.deepEqual(
        expandingPercentileValues(values,{inverse,minValid}),
        legacy(values,{inverse,minValid}),
      );
    }
  }
});

test('optimized row percentile preserves duplicate-date normalization contract',()=>{
  const rows=[
    {observationDate:'2026-01-01',value:3},
    {observationDate:'2026-02-01',value:1},
    {observationDate:'2026-03-01',value:2},
    {observationDate:'2026-04-01',value:2},
    {observationDate:'2026-05-01',value:5},
  ];
  const values=rows.map(x=>x.value);
  const expected=legacy(values,{inverse:true,minValid:2});
  const out=expandingPercentileRows(rows,{inverse:true,minValid:2});
  assert.deepEqual(out.map(x=>x.value),expected.filter(x=>x!==null));
  assert.deepEqual(out.map(x=>x.validHistory),[2,3,4,5]);
});
