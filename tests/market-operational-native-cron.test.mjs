import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const vite=fs.readFileSync("vite.config.ts","utf8");
const worker=fs.readFileSync("worker/index.ts","utf8");

test("market operational refresh has a native 5-minute cron trigger",()=>{
 assert.match(vite,/const MARKET_OP_R1_CRON = "\*\/5 \* \* \* \*";/);
 assert.match(vite,/crons: \[C1_OP_R2_CRON, "37 \* \* \* \*", MARKET_OP_R1_CRON\]/);
 assert.match(worker,/controller\.cron==='\*\/5 \* \* \* \*'/);
 assert.match(worker,/runMarketOperationalRefresh\(\{\s*env,\s*now: controller\.scheduledTime,/s);
});

test("market native cron does not use HTTP waitUntil",()=>{
 const start=worker.indexOf("if(controller.cron==='*/5 * * * *')");
 const end=worker.indexOf("if(controller.cron==='37 * * * *')");
 assert.ok(start>=0&&end>start);
 const block=worker.slice(start,end);
 assert.doesNotMatch(block,/waitUntil/);
});
