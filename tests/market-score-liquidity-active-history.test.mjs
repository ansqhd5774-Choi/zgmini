import test from "node:test";
import assert from "node:assert/strict";
import {loadLiquidityActiveHistory} from "../worker/liquidity-active-history-reader.mjs";

test("history reader returns stored D3 public score history in ascending date order",async()=>{
  const db={
    prepare(){
      return {
        bind(){
          return {
            async all(){
              return {results:[
                {as_of_date:"2026-09-28",score:61},
                {as_of_date:"2026-09-21",score:60.5},
              ]};
            },
          };
        },
      };
    },
  };
  const out=await loadLiquidityActiveHistory(db,{asOf:"2026-09-28"});
  assert.deepEqual(out,[
    {label:"2026-09-21",value:60.5},
    {label:"2026-09-28",value:61},
  ]);
});

test("history reader fails closed to empty history when storage is unavailable",async()=>{
  assert.deepEqual(await loadLiquidityActiveHistory(null,{asOf:"2026-09-28"}),[]);
});
