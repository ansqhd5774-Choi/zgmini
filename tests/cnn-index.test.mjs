import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCnnIndex } from "../lib/cnn-index.mjs";
const now = Date.parse("2026-09-07T10:00:00Z");
const observation = { score:42.2, rating:"fear", timestamp:"2026-09-04T23:59:43Z" };
test("preserves publisher composite score and original observation date", () => {
  assert.deepEqual(parseCnnIndex({fear_and_greed:observation},now), {score:42.2,rating:"공포",observedAt:"2026-09-04T23:59:43.000Z"});
});
test("rejects missing, invalid, stale and future observations without sample fallback", () => {
  for (const patch of [{score:null},{score:"42"},{score:NaN},{score:101},{score:-1},{timestamp:"bad"},{timestamp:"2026-08-01"},{timestamp:"2026-09-09"},{rating:"unknown"}]) {
    assert.throws(() => parseCnnIndex({fear_and_greed:{...observation,...patch}},now));
  }
  assert.throws(() => parseCnnIndex({},now));
});
