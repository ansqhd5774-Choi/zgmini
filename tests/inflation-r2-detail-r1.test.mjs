import test from "node:test";
import assert from "node:assert/strict";
import {marketDetailRows} from "../lib/market-score/detail-catalog.mjs";

test("inflation detail rows are the approved four representative R2 axes",()=>{
  const rows=marketDetailRows("inflation",[
    {name:"목표안정",status:"READY",score:71},
    {name:"기조모멘텀",status:"READY",score:62},
    {name:"기대인플레",status:"READY",score:65},
    {name:"공급압력",status:"READY",score:59},
  ]);
  assert.deepEqual(rows.map(x=>x.label),["목표안정","기조모멘텀","기대인플레","공급압력"]);
  assert.deepEqual(rows.map(x=>x.score),[71,62,65,59]);
});
