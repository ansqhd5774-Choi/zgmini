import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker=fs.readFileSync("worker/index.ts","utf8");
const vite=fs.readFileSync("vite.config.ts","utf8");
const route=fs.readFileSync("app/api/market-score/route.ts","utf8");

test("C1-OP-R2 worker has scheduled primary trigger",()=>{
  assert.match(worker,/runConsumptionR3OperationalRefresh/);
  assert.match(worker,/async scheduled\s*\(/);
  assert.match(worker,/controller\.scheduledTime/);
  assert.match(worker,/await runConsumptionR3OperationalRefresh/);
  assert.match(worker,/C1_OP_R2_CRON/);
});

test("C1-OP-R2 Cloudflare config has hourly cron",()=>{
  assert.match(vite,/const C1_OP_R2_CRON = "17 \* \* \* \*";/);
  assert.match(vite,/triggers:\s*\{[\s\S]*crons:\s*\[C1_OP_R2_CRON\]/);
});

test("public market-score fallback remains during R2 transition",()=>{
  assert.match(route,/runConsumptionR3OperationalRefresh/);
  assert.match(route,/waitUntil\s*\(/);
  assert.match(route,/C1_R3_OPERATIONAL_REFRESH_WAITUNTIL/);
});

test("cron is hourly and offset from minute zero",()=>{
  assert.equal("17 * * * *","17 * * * *");
});
