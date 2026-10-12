import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {mergeCanonicalRowsR2135,summarizeR2135ComponentOverlap} from "../scripts/pc-writer/sector-fear-greed-r2135-r24-source-sensitivity.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const scriptPath=path.join(here,"..","scripts","pc-writer","sector-fear-greed-r2135-r24-source-sensitivity.mjs");

test("R2.13.5 canonical merge deduplicates ticker-date rows with deterministic precedence",()=>{
  const result=mergeCanonicalRowsR2135([
    {source:"R7",rows:[{tradeDate:"2026-01-02",ticker:"AAA",currentClose:10,currentVolume:100}]},
    {source:"R6",rows:[{tradeDate:"2026-01-02",ticker:"AAA",currentClose:11,currentVolume:110},{tradeDate:"2026-01-02",ticker:"BBB",currentClose:20,currentVolume:200}]},
  ],[{trade_date:"2026-01-02",ticker:"AAA",current_close:12,current_volume:120}]);
  assert.equal(result.rows.length,2);
  assert.equal(result.rows.find(row=>row.ticker==="AAA")?.currentClose,12);
  assert.equal(result.diagnostics.duplicateRows,2);
  assert.equal(result.diagnostics.conflictingKeys,1);
});

test("R2.13.5 component overlap reports identical rank ordering",()=>{
  const left=Array.from({length:8},(_,i)=>({date:`2026-01-${String(i+1).padStart(2,"0")}`,score:i,lotterySuperiority:i*2}));
  const right=left.map(row=>({...row,score:row.score+10,lotterySuperiority:row.lotterySuperiority+5}));
  const score=summarizeR2135ComponentOverlap(left,right,"score");
  const lottery=summarizeR2135ComponentOverlap(left,right,"lotterySuperiority");
  assert.equal(score.n,8);
  assert.equal(score.spearman,1);
  assert.equal(lottery.spearman,1);
});

test("R2.13.5 remains local read-only Shadow research",()=>{
  const source=fs.readFileSync(scriptPath,"utf8");
  assert.equal(/\bfetch\s*\(/.test(source),false);
  assert.equal(/wrangler\s+d1|publication-ledger|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM/i.test(source),false);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/fillForwardFill:false/);
});
