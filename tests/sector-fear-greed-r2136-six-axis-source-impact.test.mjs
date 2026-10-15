import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {combineR2136SixAxis,summarizeR2136SeriesImpact,summarizeR2136DailyRank} from "../scripts/pc-writer/sector-fear-greed-r2136-six-axis-source-impact.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const scriptPath=path.join(here,"..","scripts","pc-writer","sector-fear-greed-r2136-six-axis-source-impact.mjs");

test("R2.13.6 six-axis combination preserves existing 85% base and adds 15% speculative proxy",()=>{
  const five=[{date:"2026-01-02",score:42.5},{date:"2026-01-05",score:51}];
  const spec=[{date:"2026-01-02",score:50},{date:"2026-01-05",score:80}];
  const out=combineR2136SixAxis(five,spec);
  assert.equal(out.length,2);
  assert.equal(out[0].score,50);
  assert.equal(out[1].score,63);
});

test("R2.13.6 identical final composites have zero source impact",()=>{
  const rows=Array.from({length:10},(_,i)=>({date:`2026-01-${String(i+1).padStart(2,"0")}`,score:40+i}));
  const result=summarizeR2136SeriesImpact(rows,rows);
  assert.equal(result.n,10);
  assert.equal(result.meanAbsDelta,0);
  assert.equal(result.p95AbsDelta,0);
  assert.equal(result.maxAbsDelta,0);
  assert.equal(result.bandChangeCount,0);
  assert.equal(result.severeBandChangeCount,0);
});

test("R2.13.6 daily cross-sector rank detects identical ordering",()=>{
  const sectors={};
  for(let s=0;s<4;s++){
    const canonical=[],alpaca=[];
    for(let d=1;d<=4;d++){
      const row={date:`2026-01-0${d}`,score:s*10+d};
      canonical.push(row);alpaca.push({...row,score:row.score+100});
    }
    sectors[`s${s}`]={canonical,alpaca};
  }
  const result=summarizeR2136DailyRank(sectors);
  assert.equal(result.nDates,4);
  assert.equal(result.min,1);
  assert.equal(result.last,1);
});

test("R2.13.6 remains local read-only Shadow research with no new selection gate",()=>{
  const source=fs.readFileSync(scriptPath,"utf8");
  assert.equal(/\bfetch\s*\(/.test(source),false);
  assert.equal(/wrangler\s+d1|publication-ledger|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM/i.test(source),false);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/fillForwardFill:false/);
  assert.match(source,/candidateSelected:false/);
  assert.match(source,/r24ApprovedForProduction:false/);
  assert.match(source,/NO_SELECTION_THRESHOLD_IS_INTRODUCED/);
});
