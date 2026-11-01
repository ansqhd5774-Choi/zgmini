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
  assert.deepEqual(rows.map(x=>x.label),["물가 목표 안정","물가 기조","기대 물가","공급 물가 압력"]);
  assert.deepEqual(rows.map(x=>x.score),[71,62,65,59]);
});

test("inflation labels and legacy aliases preserve identity, zero and unavailable scores",()=>{
  const legacy=marketDetailRows("inflation",[
    {name:"공급압력",status:"READY",score:59},
    {name:"기대인플레",status:"READY",score:65},
    {name:"목표안정",status:"READY",score:0},
    {name:"기조모멘텀",status:"PARTIAL",score:62},
  ]);
  const current=marketDetailRows("inflation",[
    {name:"물가 기조",status:"PARTIAL",score:62},
    {name:"물가 목표 안정",status:"READY",score:0},
    {name:"공급 물가 압력",status:"READY",score:59},
    {name:"기대 물가",status:"READY",score:65},
  ]);
  assert.deepEqual(legacy.map(x=>x.score),[0,null,65,59]);
  assert.deepEqual(current,legacy);
});
