import test from "node:test";
import assert from "node:assert/strict";
import {mergeAlpacaRows,summarizeTickerCoverage,compareOverlap} from "../scripts/pc-writer/sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";

test("R2.5 Alpaca merge deduplicates exact rows and reports conflicting duplicates",()=>{
  const a=[{ticker:"AAA",tradeDate:"2026-01-02",currentClose:10,currentVolume:100},{ticker:"AAA",tradeDate:"2026-01-03",currentClose:11,currentVolume:110}];
  const b=[{ticker:"AAA",tradeDate:"2026-01-02",currentClose:10,currentVolume:100},{ticker:"AAA",tradeDate:"2026-01-03",currentClose:12,currentVolume:110}];
  const out=mergeAlpacaRows([a,b]);
  assert.equal(out.rows.length,2);
  assert.equal(out.conflicts.length,1);
  assert.equal(out.rows.find(r=>r.date==="2026-01-03").close,11);
});

test("R2.5 ticker coverage separates close sessions from valid volume sessions",()=>{
  const merged=mergeAlpacaRows([[{ticker:"AAA",tradeDate:"2026-01-02",currentClose:10,currentVolume:100},{ticker:"AAA",tradeDate:"2026-01-03",currentClose:11},{ticker:"BBB",tradeDate:"2026-01-03",currentClose:20,currentVolume:200}]]);
  const coverage=summarizeTickerCoverage(merged.rows);
  assert.equal(coverage.AAA.sessions,2);
  assert.equal(coverage.AAA.volumeSessions,1);
  assert.equal(coverage.AAA.firstDate,"2026-01-02");
  assert.equal(coverage.AAA.lastDate,"2026-01-03");
  assert.equal(coverage.BBB.sessions,1);
});

test("R2.5 overlap comparison is exact-date and reports relative differences",()=>{
  const alpaca=mergeAlpacaRows([[{ticker:"AAA",tradeDate:"2026-01-02",currentClose:101,currentVolume:100},{ticker:"AAA",tradeDate:"2026-01-03",currentClose:120,currentVolume:100}]]).rows;
  const ref=[{ticker:"AAA",tradeDate:"2026-01-02",currentClose:100},{ticker:"AAA",tradeDate:"2026-01-03",currentClose:100},{ticker:"AAA",tradeDate:"2026-01-04",currentClose:100}];
  const out=compareOverlap(alpaca,ref);
  assert.equal(out.pairs,2);
  assert.equal(out.aboveOnePercent,1);
  assert.equal(out.maxRelativeDifference,0.2);
});
