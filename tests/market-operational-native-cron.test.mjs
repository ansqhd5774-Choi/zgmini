import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const vite=fs.readFileSync("vite.config.ts","utf8");
const worker=fs.readFileSync("worker/index.ts","utf8");

test("market operational refresh has a native 5-minute cron trigger",()=>{
 assert.match(vite,/const MARKET_OP_R1_CRON = "\*\/5 \* \* \* \*";/);
 assert.match(vite,/crons: \[C1_OP_R2_CRON, "37 \* \* \* \*", MARKET_OP_R1_CRON\]/);
 assert.match(worker,/controller\.cron==='\*\/5 \* \* \* \*'/);
 assert.match(worker,/refreshStoredMarketScoreSnapshot\(\{\s*env,\s*now: controller\.scheduledTime,/s);
 assert.match(worker,/runMarketOperationalRefresh\(\{\s*env,\s*now: controller\.scheduledTime,/s);
 const block=worker.slice(worker.indexOf("if(controller.cron==='*/5 * * * *')"),worker.indexOf("if(controller.cron==='37 * * * *')"));
 assert.ok(block.indexOf('refreshStoredMarketScoreSnapshot')<block.indexOf('runMarketOperationalRefresh'));
});

test("market native cron does not use HTTP waitUntil",()=>{
 const start=worker.indexOf("if(controller.cron==='*/5 * * * *')");
 const end=worker.indexOf("if(controller.cron==='37 * * * *')");
 assert.ok(start>=0&&end>start);
 const block=worker.slice(start,end);
 assert.doesNotMatch(block,/waitUntil/);
});

test("stored precompute is provider-free and precedes potentially slow collection",()=>{
 const source=fs.readFileSync("worker/market-operational-refresh.mjs","utf8");
 assert.match(source,/refreshStoredMarketScoreSnapshot/);
 assert.match(source,/providerRequests:0/);
 const fn=source.slice(source.indexOf("export async function refreshStoredMarketScoreSnapshot"),source.indexOf("function boundedFetch"));
 assert.doesNotMatch(fn,/fetchImpl|collectDiagnosticLiveInputs|collectRateR2Inputs|collectBreadthB1R3StoreOnlyR1/);
});


test("breadth partial batches stay on backlog until coverage completes",()=>{
 const source=fs.readFileSync("worker/market-operational-refresh.mjs","utf8");
 assert.match(source,/selected==='breadth'&&sourceStatus==='PARTIAL_BATCH'/);
 assert.match(source,/backlog\?'BACKLOG':'COMPLETE'/);
});

test("backlog jobs are selected before normal round-robin jobs",()=>{
 const source=fs.readFileSync("worker/market-operational-store.mjs","utf8");
 assert.match(source,/SELECT finished_at,status FROM market_collection_jobs_v1/);
 assert.match(source,/const priority=x=>x\.status==='BACKLOG'/);
 assert.match(source,/priority\(a\)-priority\(b\)/);
});


test("breadth source failure is retried ahead of normal round-robin jobs",()=>{
 const source=fs.readFileSync("worker/market-operational-store.mjs","utf8");
 assert.match(source,/x\.job==='breadth'&&x\.status==='SOURCE_FAILED'/);
 assert.match(source,/const priority=x=>/);
});


test("external market scheduler precomputes stored snapshot before slow collection",()=>{
 const start=worker.indexOf("export async function runMarketExternalRefresh");
 const end=worker.indexOf("// Image security config");
 assert.ok(start>=0&&end>start);
 const block=worker.slice(start,end);
 assert.ok(block.indexOf("refreshStoredMarketScoreSnapshot")<block.indexOf("runMarketOperationalRefresh"));
 assert.match(block,/providerRequests:precompute\?\.providerRequests\?\?0/);
 assert.match(worker,/refresh:runMarketExternalRefresh,responseBudgetMs:5000,logTag:'MARKET_EXTERNAL'/);
});
