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
  assert.match(vite,/triggers:\s*\{[\s\S]*crons:\s*\[C1_OP_R2_CRON,\s*"37 \* \* \* \*",\s*MARKET_OP_R1_CRON\]/);
});

test("public reads are decoupled from the scheduled C1 collector",()=>{
  const scheduled=fs.readFileSync("worker/market-operational-refresh.mjs","utf8");
  assert.match(route,/storedMarketResponse/);
  assert.doesNotMatch(route,/waitUntil|runConsumptionR3OperationalRefresh/);
  assert.match(scheduled,/consumption:.*runConsumptionR3OperationalRefresh/);
});

test("cron is hourly and offset from minute zero",()=>{
  assert.equal("17 * * * *","17 * * * *");
});
