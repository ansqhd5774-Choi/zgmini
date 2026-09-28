import test from "node:test";
import assert from "node:assert/strict";
import {scoreInflationR2Axes,INFLATION_R2_AXES} from "../lib/diagnostic-layer/inflation-r2-stored.mjs";

test("R2 top-level score is equal 1/7 with strict missing",()=>{
  const axes=Object.fromEntries(INFLATION_R2_AXES.map((axis,index)=>[axis,10*(index+1)]));
  const out=scoreInflationR2Axes(axes);
  assert.equal(out.status,"READY");
  assert.equal(out.score,40);
  const missing=scoreInflationR2Axes({...axes,EXPECTATIONS:null});
  assert.equal(missing.status,"PARTIAL");
  assert.equal(missing.score,null);
  assert.deepEqual(missing.missing,["EXPECTATIONS"]);
});
