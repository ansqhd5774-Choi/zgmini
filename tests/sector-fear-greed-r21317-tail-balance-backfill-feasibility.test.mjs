import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {summarizeR21317CalendarCapacity} from "../scripts/pc-writer/sector-fear-greed-r21317-tail-balance-backfill-feasibility.mjs";

test("R2.13.17 upper bound requires 756 scores plus 60 warmup sessions",()=>{
  const dates=Array.from({length:816},(_,i)=>{const d=new Date(Date.UTC(2020,0,1+i));return d.toISOString().slice(0,10);});
  const s=summarizeR21317CalendarCapacity(dates);
  assert.equal(s.required,756);assert.equal(s.warmup,60);assert.equal(s.maxPossibleScoreObservations,756);assert.equal(s.minimumAdditionalRawSessions,0);assert.equal(s.localCalendarEnough,true);
});

test("R2.13.17 fails closed when the local calendar cannot satisfy 756 after warmup",()=>{
  const dates=Array.from({length:790},(_,i)=>{const d=new Date(Date.UTC(2021,0,1+i));return d.toISOString().slice(0,10);});
  const s=summarizeR21317CalendarCapacity(dates);
  assert.equal(s.maxPossibleScoreObservations,730);assert.equal(s.missingScoreObservations,26);assert.equal(s.minimumAdditionalRawSessions,26);assert.equal(s.localCalendarEnough,false);
});

test("R2.13.17 remains read-only and does not lower 756 or call a provider",()=>{
  const text=fs.readFileSync(new URL("../scripts/pc-writer/sector-fear-greed-r21317-tail-balance-backfill-feasibility.mjs",import.meta.url),"utf8");
  assert.match(text,/approvedR1ReferenceRequirement:756/);assert.match(text,/providerCalls:0/);assert.match(text,/referenceRequirementChanged:false/);assert.match(text,/normalizationChanged:false/);assert.doesNotMatch(text,/fetch\s*\(/);assert.doesNotMatch(text,/wrangler|publication-ledger|INSERT\s+INTO|UPDATE\s+/i);
});
