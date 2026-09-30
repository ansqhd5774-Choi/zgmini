import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createGrowthR2ForwardRuntimeProbeHandler,
  createGrowthR2ProbeFetch,
  detectGrowthR2ProviderStage,
  runGrowthR2ForwardRuntimeProbe,
  sanitizeGrowthR2ProbeError,
} from "../worker/growth-r2-forward-runtime-probe.mjs";

const M3 = "https://api.census.gov/data/timeseries/eits/m3?time=2026&key=SECRET";
const BFS = "https://api.census.gov/data/timeseries/eits/bfs?time=2026&key=SECRET";
const FED_IP = "https://www.federalreserve.gov/releases/g17/Current/ipdisk/ip_sa.txt";
const FED_UTL = "https://www.federalreserve.gov/Releases/G17/Current/ipdisk/utl_sa.txt";
const BLS = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const okResponse = (status = 200) => new Response("{}", { status, headers: { "content-type": "application/json" } });

function successCollect() {
  return async ({ fetchImpl }) => {
    const urls = [M3, M3, M3, M3, BFS, FED_IP, FED_UTL, BLS];
    for (const url of urls) await fetchImpl(url, url === BLS ? { method: "POST" } : undefined);
    return {
      status: "READY",
      records: Array.from({ length: 24 }, (_, i) => ({ candidateId: `G${String(i + 1).padStart(3, "0")}` })),
      snapshots: urls.map((_, i) => ({ providerGroup: `P${i + 1}` })),
      retrievedAt: "2026-09-30T00:00:00.000Z",
      providerRequestCount: 8,
    };
  };
}

async function responseJson(response) {
  return { status: response.status, body: await response.json() };
}

test("Growth R2 generated route preserves factory handler call contract", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const route = fs.readFileSync(path.join(here, "..", "app", "api", "internal", "growth-r2-forward-runtime-probe", "route.ts"), "utf8");
  assert.match(route, /createGrowthR2ForwardRuntimeProbeHandler/);
  assert.match(route, /authenticate\s*:\s*getChatGPTUser/);
  assert.match(route, /\benv\b/);
  assert.match(route, /const\s+handler\s*=\s*createGrowthR2ForwardRuntimeProbeHandler\s*\(/s);
  assert.match(route, /return\s+handler\s*\(\s*\)/s);
  assert.doesNotMatch(route, /runGrowthR2ForwardRuntimeProbe\s*\(/);
});

test("Growth R2 runtime probe handler factory returns callable route handler", () => {
  const handler = createGrowthR2ForwardRuntimeProbeHandler({ authenticate: async () => ({ email: "owner@example.com" }), env: { KFG_V2_CANARY_OPERATOR_EMAIL: "owner@example.com", CENSUS_API_KEY: "X" }, probeImpl: async () => ({ status: "SUCCESS", scope: "GROWTH_R2_FORWARD_DIAGNOSTIC_ONLY", providerRequestCount: 8, dbWrites: 0, persistence: false }) });
  assert.equal(typeof handler, "function");
});

test("Growth R2 runtime probe handler rejects unauthenticated before provider", async () => {
  let probes = 0;
  const handler = createGrowthR2ForwardRuntimeProbeHandler({ authenticate: async () => null, env: { KFG_V2_CANARY_OPERATOR_EMAIL: "owner@example.com", CENSUS_API_KEY: "SECRET" }, probeImpl: async () => { probes += 1; return {}; } });
  const out = await responseJson(await handler());
  assert.equal(out.status, 401);
  assert.equal(out.body.status, "UNAUTHENTICATED");
  assert.equal(out.body.providerRequestCount, 0);
  assert.equal(probes, 0);
  assert.equal(JSON.stringify(out).includes("SECRET"), false);
});

test("Growth R2 runtime probe handler rejects non-owner before provider", async () => {
  let probes = 0;
  const handler = createGrowthR2ForwardRuntimeProbeHandler({ authenticate: async () => ({ email: "other@example.com" }), env: { KFG_V2_CANARY_OPERATOR_EMAIL: "owner@example.com", CENSUS_API_KEY: "SECRET" }, probeImpl: async () => { probes += 1; return {}; } });
  const out = await responseJson(await handler());
  assert.equal(out.status, 403);
  assert.equal(out.body.status, "FORBIDDEN");
  assert.equal(out.body.providerRequestCount, 0);
  assert.equal(probes, 0);
});

test("Growth R2 runtime probe handler fails closed when owner binding is absent", async () => {
  let probes = 0;
  const handler = createGrowthR2ForwardRuntimeProbeHandler({ authenticate: async () => ({ email: "owner@example.com" }), env: { CENSUS_API_KEY: "SECRET" }, probeImpl: async () => { probes += 1; return {}; } });
  const out = await responseJson(await handler());
  assert.equal(out.status, 503);
  assert.equal(out.body.errorCode, "GROWTH_R2_OPERATOR_EMAIL_REQUIRED");
  assert.equal(probes, 0);
});

test("Growth R2 runtime probe handler calls probe exactly once for owner", async () => {
  let probes = 0;
  let seenEnv = null;
  const env = { KFG_V2_CANARY_OPERATOR_EMAIL: "OWNER@EXAMPLE.COM", CENSUS_API_KEY: "SECRET" };
  const handler = createGrowthR2ForwardRuntimeProbeHandler({ authenticate: async () => ({ email: "owner@example.com" }), env, probeImpl: async ({ env: injected }) => { probes += 1; seenEnv = injected; return { status: "SUCCESS", scope: "GROWTH_R2_FORWARD_DIAGNOSTIC_ONLY", providerRequestCount: 8, dbWrites: 0, persistence: false, events: [] }; } });
  const out = await responseJson(await handler());
  assert.equal(out.status, 200);
  assert.equal(out.body.status, "SUCCESS");
  assert.equal(probes, 1);
  assert.equal(seenEnv, env);
  assert.equal(JSON.stringify(out).includes("SECRET"), false);
});

test("Growth R2 runtime probe classifies the four provider stages without exposing URLs", () => {
  assert.equal(detectGrowthR2ProviderStage(M3), "CENSUS_M3");
  assert.equal(detectGrowthR2ProviderStage(BFS), "CENSUS_BFS");
  assert.equal(detectGrowthR2ProviderStage(FED_IP), "FED_G17");
  assert.equal(detectGrowthR2ProviderStage(FED_UTL), "FED_G17");
  assert.equal(detectGrowthR2ProviderStage(BLS), "BLS_CES");
});

test("Growth R2 runtime probe fails closed before provider calls when Census secret is absent", async () => {
  let calls = 0;
  const out = await runGrowthR2ForwardRuntimeProbe({ apiKey: "", fetchImpl: async () => { calls += 1; return okResponse(); }, collectImpl: successCollect() });
  assert.equal(out.status, "RUNTIME_CONFIGURATION_MISSING");
  assert.equal(out.errorCode, "GROWTH_R2_CENSUS_API_KEY_REQUIRED");
  assert.equal(out.providerRequestCount, 0);
  assert.equal(calls, 0);
  assert.equal(out.dbWrites, 0);
  assert.equal(out.persistence, false);
});

test("Growth R2 runtime probe success path executes exactly eight provider requests and returns summary only", async () => {
  const calls = [];
  const out = await runGrowthR2ForwardRuntimeProbe({ apiKey: "TOPSECRET", asOf: "2026-09-30", fetchImpl: async (url, init) => { calls.push([String(url), init?.method || "GET"]); return okResponse(); }, collectImpl: successCollect(), now: () => new Date("2026-09-30T00:00:00.000Z") });
  assert.equal(out.status, "SUCCESS");
  assert.equal(out.providerRequestCount, 8);
  assert.equal(calls.length, 8);
  assert.equal(out.summary.recordCount, 24);
  assert.equal(out.schemaValid, true);
  assert.equal(out.dbWrites, 0);
  assert.equal(out.persistence, false);
  const serialized = JSON.stringify(out);
  assert.equal(serialized.includes("TOPSECRET"), false);
  assert.equal(serialized.includes("key="), false);
});

test("Growth R2 runtime probe preserves failed stage and sanitized Growth error code without leaking secret URL", async () => {
  const collectImpl = async ({ fetchImpl }) => {
    await fetchImpl(M3);
    await fetchImpl(BFS);
    throw new Error("GROWTH_R2_HTTP_403:https://api.census.gov/data/timeseries/eits/bfs?key=TOPSECRET");
  };
  const out = await runGrowthR2ForwardRuntimeProbe({ apiKey: "TOPSECRET", fetchImpl: async () => okResponse(403), collectImpl });
  assert.equal(out.status, "UPSTREAM_ERROR");
  assert.equal(out.failedStage, "CENSUS_BFS");
  assert.equal(out.errorCode, "GROWTH_R2_HTTP_403");
  assert.equal(out.providerRequestCount, 2);
  const serialized = JSON.stringify(out);
  assert.equal(serialized.includes("TOPSECRET"), false);
  assert.equal(serialized.includes("api.census.gov"), false);
  assert.equal(serialized.includes("key="), false);
});

test("Growth R2 runtime probe extracts candidate id from missing-selector errors", async () => {
  const collectImpl = async ({ fetchImpl }) => { await fetchImpl(BFS); throw new Error("GROWTH_R2_BFS_MISSING:G060"); };
  const out = await runGrowthR2ForwardRuntimeProbe({ apiKey: "X", fetchImpl: async () => okResponse(), collectImpl });
  assert.equal(out.failedStage, "CENSUS_BFS");
  assert.equal(out.errorCode, "GROWTH_R2_BFS_MISSING");
  assert.equal(out.targetCandidateId, "G060");
});

test("Growth R2 runtime probe enforces the approved eight-request diagnostic ceiling", async () => {
  const collectImpl = async ({ fetchImpl }) => {
    const urls = [M3, M3, M3, M3, BFS, FED_IP, FED_UTL, BLS, BLS];
    for (const url of urls) await fetchImpl(url);
    return { status: "READY", records: [], snapshots: [] };
  };
  const out = await runGrowthR2ForwardRuntimeProbe({ apiKey: "X", fetchImpl: async () => okResponse(), collectImpl });
  assert.equal(out.status, "UPSTREAM_ERROR");
  assert.equal(out.errorCode, "GROWTH_R2_PROBE_REQUEST_BUDGET_EXCEEDED");
  assert.equal(out.providerRequestCount, 8);
  assert.equal(out.requestBudgetExceeded, true);
});

test("Growth R2 probe fetch wrapper records only stage, method and status metadata", async () => {
  const state = { providerRequestCount: 0, currentStage: "PRECHECK", failedStage: null, requestBudgetExceeded: false, censusAccepted: false, events: [] };
  const wrapped = createGrowthR2ProbeFetch(async () => okResponse(), state, { maxRequests: 8 });
  await wrapped(`${M3}&another=VALUE`);
  const serialized = JSON.stringify(state.events);
  assert.equal(serialized.includes("SECRET"), false);
  assert.equal(serialized.includes("VALUE"), false);
  assert.equal(serialized.includes("api.census.gov"), false);
  assert.equal(state.events[0].stage, "CENSUS_M3");
  assert.equal(state.events[0].httpStatus, 200);
});

test("Growth R2 probe generic errors are reduced to name/code only", () => {
  const out = sanitizeGrowthR2ProbeError(new SyntaxError("Unexpected token SECRET_PAYLOAD"), "CENSUS_M3");
  assert.deepEqual(out, { errorCode: "GROWTH_R2_PROBE_JSON_PARSE_ERROR", errorName: "SyntaxError", failedStage: "CENSUS_M3", targetCandidateId: null });
  assert.equal(JSON.stringify(out).includes("SECRET_PAYLOAD"), false);
});
