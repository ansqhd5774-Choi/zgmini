import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {C1_R3_UI4} from "../lib/market-score/consumption-c1-r3.mjs";
import {buildConsumptionC1R3SeedPlan,buildConsumptionC1R3SeedSql} from "../worker/consumption-r3-seed.mjs";

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const seed=JSON.parse(fs.readFileSync(path.join(ROOT,"..","lib","market-score","c1-r3-e6-seed.json"),"utf8"));

test("accepted E6 seed is 16 complete CORE95 snapshots / 1520 rows",()=>{
  const plan=buildConsumptionC1R3SeedPlan(seed);
  assert.equal(plan.snapshotCount,16);
  assert.equal(plan.rowCount,1520);
  assert.ok(plan.snapshots.every(x=>x.rows.length===95));
});

test("latest accepted E6 seed reproduces approved 2026-Q2 Flat-7",()=>{
  const plan=buildConsumptionC1R3SeedPlan(seed);
  const latest=plan.snapshots.at(-1);
  assert.equal(latest.scoreDate,"2026-06-30");
  assert.ok(Math.abs(latest.domainScore-42.41025093065286)<1e-12);
});

test("approved UI4 is exact and explanatory only",()=>{
  assert.deepEqual(C1_R3_UI4.map(x=>[x.id,x.name]),[
    ["C1R2_015","실질 소매판매"],
    ["C1R2_040","실질 가처분소득"],
    ["C1R2_060","개인저축률"],
    ["C1R2_096","카드 연체율"],
  ]);
});

test("seed SQL creates 1520 revision-separated rows with no network",()=>{
  const sql=buildConsumptionC1R3SeedSql(seed,{seedSha256:"seed"});
  assert.equal((sql.match(/INSERT OR REPLACE INTO c1_r3_candidate_scores_v1/g)||[]).length,1520);
  assert.match(sql,/R3\.45P/);
  assert.match(sql,/BEGIN TRANSACTION/);
  assert.match(sql,/COMMIT/);
});
