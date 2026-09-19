import test from "node:test";
import assert from "node:assert/strict";
import { runFmpRuntimeProbe } from "../worker/fmp-runtime-probe.mjs";

function response(body,status=200){ return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}}); }

test("missing secret fails closed", async()=> {
  let calls=0;
  const out=await runFmpRuntimeProbe({apiKey:"",fetchImpl:async()=>{calls++;return response([])}});
  assert.equal(out.status,"SECRET_MISSING");
  assert.equal(out.providerRequestCount,0);
  assert.equal(calls,0);
});

test("exactly three provider requests", async()=> {
  let calls=0;
  const out=await runFmpRuntimeProbe({apiKey:"x",fetchImpl:async()=>{calls++;return response([{symbol:"AAPL"}])}});
  assert.equal(out.status,"SUCCESS");
  assert.equal(out.providerRequestCount,3);
  assert.equal(calls,3);
});

test("plan restriction still proves key acceptance", async()=> {
  let i=0;
  const out=await runFmpRuntimeProbe({apiKey:"x",fetchImpl:async()=>{
    i++; return i===1 ? response([{symbol:"AAPL"}]) : response({"Error Message":"Please upgrade your subscription"});
  }});
  assert.equal(out.keyAccepted,true);
  assert.equal(out.endpoints[1].access,"PLAN_RESTRICTED");
});

test("invalid key rejected", async()=> {
  const out=await runFmpRuntimeProbe({apiKey:"bad",fetchImpl:async()=>response({"Error Message":"Invalid API KEY"},401)});
  assert.equal(out.status,"FAILED");
  assert.equal(out.keyAccepted,false);
});

test("secret is never returned", async()=> {
  const secret="fixture-super-secret";
  const out=await runFmpRuntimeProbe({apiKey:secret,fetchImpl:async()=>response([{symbol:"AAPL"}])});
  assert.equal(JSON.stringify(out).includes(secret),false);
});


test("route imports the FMP runtime function contract", async()=> {
  const { readFile } = await import("node:fs/promises");
  const route = await readFile(new URL("../app/api/internal/fmp-runtime-probe/route.ts", import.meta.url), "utf8");
  assert.match(route, /import\s*\{\s*runFmpRuntimeProbe\s*\}\s*from\s*["'][^"']*fmp-runtime-probe\.mjs["']/);
  assert.doesNotMatch(route, /createCensusRuntimeProbeHandler/);
  assert.match(route, /runFmpRuntimeProbe\s*\(/);
});
