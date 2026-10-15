import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {TARGETS,START,END,EXPECTED_SESSIONS,MAX_PROVIDER_REQUESTS,normalizeAlpacaBenchmarkBars,collectR21320} from "../scripts/pc-writer/sector-fear-greed-r21320-alpaca-benchmark-backfill.mjs";

function fixtureDates(){const out=[];let t=Date.parse(`${START}T00:00:00Z`);while(out.length<EXPECTED_SESSIONS){const date=new Date(t).toISOString().slice(0,10);if(date<=END)out.push(date);t+=86400000;}return out;}
function fixturePayload(){const dates=fixtureDates();return {bars:Object.fromEntries(TARGETS.map((ticker,ti)=>[ticker,dates.map((date,i)=>({t:`${date}T20:00:00Z`,c:100+ti+i/100,v:1000+ti+i}))])),next_page_token:null};}

test("R2.13.20 normalizes the fixed 12-benchmark one-request window and fails closed on bad provider shapes",()=>{
  const good=normalizeAlpacaBenchmarkBars(fixturePayload());
  assert.equal(TARGETS.length,12);assert.equal(good.sessions,57);assert.equal(good.totalRows,684);assert.equal(good.first,START);
  assert.throws(()=>normalizeAlpacaBenchmarkBars({...fixturePayload(),next_page_token:"more"}),/R21320_UNEXPECTED_PAGINATION/);
  const missing=fixturePayload();delete missing.bars.SPY;assert.throws(()=>normalizeAlpacaBenchmarkBars(missing),/R21320_TARGET_MISSING/);
  const short=fixturePayload();short.bars.SPY.pop();assert.throws(()=>normalizeAlpacaBenchmarkBars(short),/R21320_SESSION_COUNT_MISMATCH/);
});

test("R2.13.20 stores and verifies the approved local shadow benchmark then reuses it without another provider call",async()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r21320-"));
  fs.writeFileSync(path.join(base,"providers.env"),"APCA_API_KEY_ID=test-key\nAPCA_API_SECRET_KEY=test-secret\n");
  let calls=0;
  const fetchImpl=async()=>{calls++;return {ok:true,status:200,json:async()=>fixturePayload()};};
  const first=await collectR21320(base,{fetchImpl,now:new Date("2026-10-13T00:00:00Z")});
  assert.equal(first.status,"SHADOW_R21320_ALPACA_BENCHMARK_BACKFILL_COMPLETE");assert.equal(first.providerRequests,1);assert.equal(calls,1);assert.equal(first.storageVerified,true);assert.equal(first.totalRows,684);assert.equal(first.approvedR1ReferenceRequirement,756);assert.equal(first.productionBenchmarkSourceChanged,false);
  fs.rmSync(path.join(base,"providers.env"));
  const second=await collectR21320(base,{fetchImpl:async()=>{throw new Error("SHOULD_NOT_CALL");},now:new Date("2026-10-13T00:01:00Z")});
  assert.equal(second.providerRequests,0);assert.equal(second.mode,"REUSED_VERIFIED_LOCAL");assert.equal(second.storageVerified,true);
  fs.rmSync(base,{recursive:true,force:true});
});

test("R2.13.20 is bounded to one Alpaca call and cannot change production/public/D1/reference contracts",()=>{
  assert.equal(MAX_PROVIDER_REQUESTS,1);
  const source=fs.readFileSync(fileURLToPath(new URL("../scripts/pc-writer/sector-fear-greed-r21320-alpaca-benchmark-backfill.mjs",import.meta.url)),"utf8");
  assert.match(source,/MAX_PROVIDER_REQUESTS=1/);assert.match(source,/feed","iex"/);assert.match(source,/adjustment","split"/);
  assert.match(source,/productionBenchmarkSourceChanged:false/);assert.match(source,/publicMutation:false/);assert.match(source,/d1Mutation:false/);assert.match(source,/referenceRequirementChanged:false/);
  assert.doesNotMatch(source,/wrangler|cloudflare|D1\.prepare|publish\(/i);
});
