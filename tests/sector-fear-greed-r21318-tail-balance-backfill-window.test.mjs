import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {buildR21318WindowPlan,summarizeR21318GroupUniverse,summarizeR21318SectorCoverage} from "../scripts/pc-writer/sector-fear-greed-r21318-tail-balance-backfill-window.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));

test("R2.13.18 derives the exact missing prior-session window without lowering 756",()=>{
  const local=["2024-01-04","2024-01-05","2024-01-08","2024-01-09","2024-01-10"];
  const bench=["2024-01-02","2024-01-03",...local];
  const x=buildR21318WindowPlan(local,bench,{required:5,warmup:2});
  assert.equal(x.neededAdditionalRawSessions,2);
  assert.equal(x.targetStart,"2024-01-02");
  assert.equal(x.targetEnd,"2024-01-03");
  assert.equal(x.plannedSessions,2);
  assert.equal(x.maxPossibleScores,5);
  assert.equal(x.referenceReadyAfterPlan,true);
});

test("R2.13.18 fails closed when benchmark prior sessions are insufficient",()=>{
  const x=buildR21318WindowPlan(["2024-01-04","2024-01-05"],["2024-01-03","2024-01-04","2024-01-05"],{required:3,warmup:2});
  assert.equal(x.neededAdditionalRawSessions,3);
  assert.equal(x.benchmarkCalendarEnough,false);
  assert.equal(x.referenceReadyAfterPlan,false);
});

test("R2.13.18 coverage requires at least eight PIT-active symbols from the existing group universe",()=>{
  const entries={};for(let i=0;i<8;i++)entries[`T${i}`]=[{ticker:`T${i}`,sectorId:"technology",dateAdded:"2020-01-01",dateRemoved:null}];
  const pit={byTicker:entries};
  const universe=summarizeR21318GroupUniverse([[...Array(8)].map((_,i)=>({ticker:`T${i}`}))]);
  const coverage=summarizeR21318SectorCoverage(pit,universe.symbols,["2024-01-02"]);
  assert.equal(coverage.technology.minAvailableSymbols,8);
  assert.equal(coverage.technology.groupUniverseReady,true);
});

test("R2.13.18 remains local read-only planning and cannot execute provider backfill",()=>{
  const source=fs.readFileSync(path.join(here,"..","scripts","pc-writer","sector-fear-greed-r21318-tail-balance-backfill-window.mjs"),"utf8");
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/backfillExecuted:false/);
  assert.doesNotMatch(source,/data\.alpaca\.markets/);
  assert.doesNotMatch(source,/fetch\s*\(/);
  assert.doesNotMatch(source,/wrangler/i);
});
