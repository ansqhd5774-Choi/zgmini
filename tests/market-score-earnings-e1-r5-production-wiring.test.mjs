import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {E1_R5_PRODUCTION_CYCLE_VERSION} from "../scripts/pc-writer/earnings-r5-production-cycle-r1.mjs";
import {extractCfoProductionHistory} from "../scripts/pc-writer/backfill-earnings-r5-cfo-production-history-r1.mjs";

test("production cycle module is loadable and fixed to R1",()=>{assert.equal(E1_R5_PRODUCTION_CYCLE_VERSION,"E1-R5-PRODUCTION-CYCLE-R1");});

test("CFO seed extracts ordered historical revisions",()=>{const rows=Array.from({length:8},(_,i)=>({period:`${2024+Math.floor(i/4)}Q${i%4+1}`,closeDate:`${2024+Math.floor(i/4)}-${String((i%4)*3+1).padStart(2,"0")}-01`,s12bRevisionPublished1dp:i/10})),result=extractCfoProductionHistory({alignment:rows});assert.equal(result.length,8);assert.equal(result[0].period,"2024Q1");assert.equal(result.at(-1).period,"2025Q4");});

test("local market calculation guards and merges R5 without removing R4 diagnostic compatibility",()=>{const source=fs.readFileSync(new URL('../scripts/pc-writer/market.mjs',import.meta.url),'utf8');assert.match(source,/runEarningsR5ProductionCycle/);assert.match(source,/mergeEarningsProductionCandidate/);assert.match(source,/preserveEarningsDiagnosticCompatibility/);assert.match(source,/methodologyVersion!=="E1-R4"/);});

test("earnings detail projection and UI support R5 while retaining R4",()=>{const projection=fs.readFileSync(new URL('../worker/projection-builders/earningsRecession.ts',import.meta.url),'utf8'),ui=fs.readFileSync(new URL('../app/earnings-recession/earnings-recession-panel.tsx',import.meta.url),'utf8');assert.match(projection,/R5_IDS=\["S1"[\s\S]*"S13"\]/);assert.match(projection,/methodologyVersion==="E1-R5"/);assert.match(ui,/r5Order=\["S1"[\s\S]*"S13"\]/);assert.match(ui,/!isR5&&dev\.map/);assert.doesNotMatch(ui,/description="Main diagnostic \+ stored E1-R4"/);});
