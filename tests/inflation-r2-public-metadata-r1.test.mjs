import test from "node:test";
import assert from "node:assert/strict";
import {projectInflationMethodologyVersion} from "../worker/market-score-r1.mjs";

test("public composite projection preserves Inflation R2 methodologyVersion",()=>{
  const composite=[
    {id:"inflation",status:"READY",score:68.3},
    {id:"breadth",status:"PARTIAL",score:null},
  ];
  const source=[
    {id:"inflation",methodologyVersion:"INFLATION_R2_R29_56"},
    {id:"breadth",methodologyVersion:"B1-R3"},
  ];
  const out=projectInflationMethodologyVersion(composite,source);
  assert.equal(out[0].methodologyVersion,"INFLATION_R2_R29_56");
  assert.deepEqual(out[1],composite[1]);
});

test("inflation methodology projection never fabricates a marker",()=>{
  const out=projectInflationMethodologyVersion(
    [{id:"inflation",status:"PARTIAL",score:null}],
    [{id:"inflation",methodologyVersion:null}],
  );
  assert.equal(out[0].methodologyVersion,null);
});
