import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {analyzeR24CalendarGap} from "../scripts/pc-writer/sector-fear-greed-r2132-r24-calendar-gap-diagnostic.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const scriptPath=path.join(here,"..","scripts","pc-writer","sector-fear-greed-r2132-r24-calendar-gap-diagnostic.mjs");
const days=n=>Array.from({length:n},(_,i)=>{const d=new Date(Date.UTC(2026,0,1+i));return d.toISOString().slice(0,10);});
const stockRows=dates=>dates.map((date,i)=>({ticker:"AAA",date,close:100+i,volume:1000+i}));
const benchRows=dates=>dates.map((date,i)=>({date,close:200+i}));

test("R2.13.2 detects one benchmark gap contaminating trailing 61-row windows",()=>{
  const dates=days(90),cutoff=dates[59],gap=dates[65],spy=dates.filter(d=>d!==gap),out=analyzeR24CalendarGap({alpacaRows:stockRows(dates),spyRows:benchRows(spy),etfRows:benchRows(dates),cutoff});
  assert.equal(out.spyDates.missingPost.includes(gap),true);
  assert.equal(out.etfDates.missingPost.length,0);
  assert.ok(out.windowEligibility.blockedBySpy>0);
  assert.equal(out.windowEligibility.blockedByEtf,0);
});

test("R2.13.2 reports eligible post-cutoff windows when calendars align",()=>{
  const dates=days(90),cutoff=dates[59],out=analyzeR24CalendarGap({alpacaRows:stockRows(dates),spyRows:benchRows(dates),etfRows:benchRows(dates),cutoff});
  assert.equal(out.spyDates.missingPost.length,0);
  assert.equal(out.etfDates.missingPost.length,0);
  assert.equal(out.windowEligibility.eligibleWindows,30);
  assert.equal(out.windowEligibility.firstEligibleDate,dates[60]);
  assert.equal(out.windowEligibility.lastEligibleDate,dates[89]);
});

test("R2.13.2 remains local read-only shadow research",()=>{
  const source=fs.readFileSync(scriptPath,"utf8");
  assert.equal(/\bfetch\s*\(/.test(source),false);
  assert.equal(/wrangler\s+d1|publication-ledger|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM/i.test(source),false);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
});
