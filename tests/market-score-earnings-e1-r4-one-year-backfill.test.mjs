import test from "node:test";
import assert from "node:assert/strict";
import {earningsOneYearBackfillTargets} from "../lib/market-score/sec-earnings-e1-r4-provider.mjs";

test("E1-R4 one-year backfill targets exactly five mature quarter points",()=>{
  const targets=earningsOneYearBackfillTargets("2026-10-02",[
    {periodEnd:"2026-06-30"},
  ]);
  assert.deepEqual(targets,[
    {periodEnd:"2025-06-30",asOf:"2025-12-13"},
    {periodEnd:"2025-09-30",asOf:"2026-03-15"},
    {periodEnd:"2025-12-31",asOf:"2026-06-13"},
    {periodEnd:"2026-03-31",asOf:"2026-09-12"},
  ]);
});

test("E1-R4 one-year backfill performs zero work when five points exist",()=>{
  const targets=earningsOneYearBackfillTargets("2026-10-02",[
    "2025-06-30","2025-09-30","2025-12-31","2026-03-31","2026-06-30",
  ]);
  assert.deepEqual(targets,[]);
});
