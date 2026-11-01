import test from "node:test";
import assert from "node:assert/strict";
import {marketTrendWindowR1} from "../lib/market-score/market-trend-window-r1.mjs";

test("1Y monthly inflation trend begins exactly at the 365-day boundary",()=>{
  const out=marketTrendWindowR1([
    {label:"2025-09-30",value:68},
    {label:"2025-10-31",value:70},
    {label:"2026-09-30",value:72},
    {label:"2026-10-06",value:71},
  ],365);
  assert.deepEqual(out[0],{label:"2025-10-06",value:68});
  assert.equal(out.at(-1).label,"2026-10-06");
  assert.equal((Date.parse(out.at(-1).label)-Date.parse(out[0].label))/86400000,365);
});

test("1Y monthly growth trend carries the prior monthly score to the exact boundary",()=>{
  const out=marketTrendWindowR1([
    {label:"2025-10-01",value:47},
    {label:"2025-11-01",value:49},
    {label:"2026-09-01",value:53},
    {label:"2026-10-06",value:54},
  ],365);
  assert.deepEqual(out[0],{label:"2025-10-06",value:47});
  assert.equal(out[1].label,"2025-11-01");
  assert.equal(out.at(-1).label,"2026-10-06");
});

test("an observation already on the period boundary is not duplicated",()=>{
  const out=marketTrendWindowR1([
    {label:"2025-10-06",value:48},
    {label:"2026-10-06",value:54},
  ],365);
  assert.deepEqual(out,[
    {label:"2025-10-06",value:48},
    {label:"2026-10-06",value:54},
  ]);
});
