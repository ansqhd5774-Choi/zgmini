import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInflationR2StoredHistory,
  INFLATION_R2_METHOD_REVISION,
} from "../lib/diagnostic-layer/inflation-r2-stored.mjs";

const row=(month,value)=>({
  observationDate:`2024-${String(month).padStart(2,"0")}-01`,
  availableAt:`2024-${String(month).padStart(2,"0")}-25`,
  value,
});

test("I-A penalizes upward oil and gasoline prices but not falling prices",()=>{
  const monthly=[100,104,108,112,116,120,124,128,132,136,130,120];
  const series=monthly.map((value,index)=>row(index+1,value));
  const history=buildInflationR2StoredHistory({
    pitSeries:{MCOILWTICO:series,GASREGCOVM:series},
    pcePc1:{PCEPILFE:[row(1,2)],PCEPI:[row(1,2)]},
  });

  for(const id of ["WTI","GASOLINE"]){
    const ready=history[id];
    assert.ok(ready.length>=3,id);
    const upward=ready.find(item=>item.value>0);
    const downward=ready.find(item=>item.value<0);
    assert.ok(upward,`${id} upward case`);
    assert.ok(downward,`${id} downward case`);
    assert.ok(upward.risk>0,`${id} upward risk`);
    assert.ok(upward.score<100,`${id} upward penalty`);
    assert.equal(downward.risk,0,`${id} falling-price risk`);
    assert.equal(downward.score,100,`${id} falling-price safety score`);
  }
});

test("I-A changes only energy risk direction with explicit revision",()=>{
  assert.equal(INFLATION_R2_METHOD_REVISION,"INFLATION_R2_R29_56_IA");
});
