import test from "node:test";
import assert from "node:assert/strict";

import { EMPLOYMENT_R4_CORE_STATES } from "../lib/market-score/employment-r4-shadow-contract.mjs";
import { parseEta539ShadowRows } from "../lib/market-score/employment-r4-shadow-provider.mjs";

const retrievedAt = "2026-11-14T00:00:00.000Z";
const header = "st,rptdate,c2,c3";

function stateWeek(week, dcClaims) {
  return EMPLOYMENT_R4_CORE_STATES.map(state =>
    `${state},11/13/2026,${week},${state === "DC" ? dcClaims : "120"}`);
}
async function parse(lines) {
  return parseEta539ShadowRows([header, ...lines].join("\n"), {
    retrievedAt, historyWeeks: 600,
  });
}

test("ETA539: blank state claim is missing, not a fabricated zero/complete 51-state week", async () => {
  const result = await parse(stateWeek("11/07/2026", ""));
  assert.equal(result.rows.length, 0);
  assert.deepEqual(result.meta.selectedWeeks, []);
  assert.equal(result.meta.latestCompleteWeek, null);
});

test("ETA539: whitespace-only state claim is also missing", async () => {
  const result = await parse(stateWeek("11/07/2026", "   "));
  assert.equal(result.rows.length, 0);
  assert.equal(result.meta.latestCompleteWeek, null);
});

test("ETA539: explicitly reported numeric zero remains a valid 51-state observation", async () => {
  const result = await parse(stateWeek("11/07/2026", "0"));
  assert.equal(result.rows.length, 51);
  assert.equal(result.rows.find(row => row.geographyCode === "DC")?.value, 0);
  assert.equal(result.meta.latestCompleteWeek, "2026-11-07");
});

test("ETA539: a partial newer week must not replace the last complete reported week", async () => {
  const result = await parse([
    ...stateWeek("10/31/2026", "20"),
    ...stateWeek("11/07/2026", ""),
  ]);
  assert.equal(result.rows.length, 51);
  assert.equal(result.meta.latestCompleteWeek, "2026-10-31");
  assert.equal(result.rows.every(row => row.observationDate === "2026-10-31"), true);
});
