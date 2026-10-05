import test from "node:test";
import assert from "node:assert/strict";
import {mergeStoredCompositeTrend,oneYearHistoryStart} from "../worker/composite-history.mjs";

test("stored composite snapshots extend the legacy trend without changing scores",()=>{
  const out=mergeStoredCompositeTrend({
    legacyTrend:[
      {label:"2026-08-31",value:51.2},
      {label:"2026-09-30",value:52.0},
    ],
    storedSnapshots:[
      {date:"2026-10-01",score:52.4},
      {date:"2026-10-02",score:51.8},
      {date:"2026-10-03",score:52.7},
    ],
    currentDate:"2026-10-04",
    currentScore:53,
  });
  assert.deepEqual(out,[
    {label:"2026-08-31",value:51.2},
    {label:"2026-09-30",value:52},
    {label:"2026-10-01",value:52.4},
    {label:"2026-10-02",value:51.8},
    {label:"2026-10-03",value:52.7},
    {label:"2026-10-04",value:53},
  ]);
});

test("stored snapshots override same-day reconstructed points and current score wins last",()=>{
  const out=mergeStoredCompositeTrend({
    legacyTrend:[{label:"2026-10-01",value:50}],
    storedSnapshots:[{date:"2026-10-01",score:51},{date:"2026-10-02",score:52}],
    currentDate:"2026-10-02",
    currentScore:53,
  });
  assert.deepEqual(out,[
    {label:"2026-10-01",value:51},
    {label:"2026-10-02",value:53},
  ]);
});

test("oneYearHistoryStart preserves UTC calendar date semantics",()=>{
  assert.equal(oneYearHistoryStart(Date.parse("2026-10-06T12:00:00Z")),"2025-10-06");
});
