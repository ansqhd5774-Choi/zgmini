import { collectGrowthR2ForwardRecords } from "../lib/market-score/growth-r2-forward-provider-r1.mjs";
import { GROWTH_R2_SEED_ROWS } from "../lib/market-score/growth-r2-seed-r1.mjs";

const MAX_PROVIDER_REQUESTS = 8;
const SECRET_QUERY_NAMES = new Set(["key", "api_key", "apikey", "token", "access_token"]);

function requestUrl(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (input && typeof input.url === "string") return input.url;
  return "";
}

export function detectGrowthR2ProviderStage(input) {
  const raw = requestUrl(input);
  let url;
  try { url = new URL(raw); } catch { return "UNKNOWN_PROVIDER"; }
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  if (host === "api.census.gov" && path.includes("/timeseries/eits/m3")) return "CENSUS_M3";
  if (host === "api.census.gov" && path.includes("/timeseries/eits/bfs")) return "CENSUS_BFS";
  if (host === "www.federalreserve.gov" && path.includes("/releases/g17/")) return "FED_G17";
  if (host === "api.bls.gov" && path.includes("/publicapi/v2/timeseries/data")) return "BLS_CES";
  return "UNKNOWN_PROVIDER";
}

function safeMethod(input, init) {
  if (init && typeof init.method === "string") return init.method.toUpperCase();
  if (input && typeof input === "object" && typeof input.method === "string") return input.method.toUpperCase();
  return "GET";
}

function extractTargetCandidateId(message) {
  const text = String(message || "");
  const m = text.match(/:(G\d{3})(?::|$)/);
  return m ? m[1] : null;
}

export function sanitizeGrowthR2ProbeError(error, failedStage = "UNKNOWN") {
  const name = error && typeof error.name === "string" ? error.name : "Error";
  const message = error && typeof error.message === "string" ? error.message : String(error || "UNKNOWN");
  const codeMatch = message.match(/GROWTH_R2_[A-Z0-9_]+/);
  let errorCode = codeMatch ? codeMatch[0] : null;
  if (!errorCode) {
    if (name === "SyntaxError") errorCode = "GROWTH_R2_PROBE_JSON_PARSE_ERROR";
    else if (name === "AbortError" || name === "TimeoutError") errorCode = "GROWTH_R2_PROBE_TIMEOUT";
    else if (name === "TypeError") errorCode = "GROWTH_R2_PROBE_FETCH_OR_TYPE_ERROR";
    else errorCode = "GROWTH_R2_PROBE_UNKNOWN_ERROR";
  }
  return {
    errorCode,
    errorName: name,
    failedStage,
    targetCandidateId: extractTargetCandidateId(message),
  };
}

function censusKeyPresent(apiKey) {
  return typeof apiKey === "string" && apiKey.trim().length > 0;
}

export function createGrowthR2ProbeFetch(fetchImpl, state, { maxRequests = MAX_PROVIDER_REQUESTS } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  return async function growthR2ProbeFetch(input, init) {
    const stage = detectGrowthR2ProviderStage(input);
    state.currentStage = stage;
    const method = safeMethod(input, init);
    if (state.providerRequestCount >= maxRequests) {
      state.failedStage = stage;
      state.requestBudgetExceeded = true;
      state.events.push({ sequence: state.providerRequestCount + 1, stage, method, attempted: false, budgetExceeded: true, httpStatus: null, ok: false });
      throw new Error(`GROWTH_R2_PROBE_REQUEST_BUDGET_EXCEEDED:${stage}`);
    }
    state.providerRequestCount += 1;
    const sequence = state.providerRequestCount;
    const startedAt = Date.now();
    try {
      const response = await fetchImpl(input, init);
      const httpStatus = typeof response?.status === "number" ? response.status : null;
      const ok = response?.ok === true;
      state.events.push({ sequence, stage, method, attempted: true, budgetExceeded: false, httpStatus, ok, elapsedMs: Math.max(0, Date.now() - startedAt) });
      if ((stage === "CENSUS_M3" || stage === "CENSUS_BFS") && ok) state.censusAccepted = true;
      return response;
    } catch (error) {
      state.failedStage = stage;
      state.events.push({ sequence, stage, method, attempted: true, budgetExceeded: false, httpStatus: null, ok: false, elapsedMs: Math.max(0, Date.now() - startedAt), transportError: error && typeof error.name === "string" ? error.name : "Error" });
      throw error;
    }
  };
}

function lastHttpStatus(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (typeof events[i]?.httpStatus === "number") return events[i].httpStatus;
  }
  return null;
}

function safeSummary(forward) {
  const records = Array.isArray(forward?.records) ? forward.records : [];
  const snapshots = Array.isArray(forward?.snapshots) ? forward.snapshots : [];
  const candidateIds = records.map((row) => row?.candidateId).filter((value) => typeof value === "string").sort();
  const providerGroups = snapshots.map((row) => row?.providerGroup).filter((value) => typeof value === "string").sort();
  return {
    recordCount: records.length,
    snapshotCount: snapshots.length,
    candidateIds,
    providerGroups,
    retrievedAt: typeof forward?.retrievedAt === "string" ? forward.retrievedAt : null,
    reportedProviderRequestCount: Number.isFinite(forward?.providerRequestCount) ? Number(forward.providerRequestCount) : null,
  };
}

function assertNoSecretInEvents(events) {
  const text = JSON.stringify(events);
  for (const name of SECRET_QUERY_NAMES) {
    if (text.toLowerCase().includes(`${name}=`)) throw new Error("GROWTH_R2_PROBE_INTERNAL_SECRET_SERIALIZATION_GUARD");
  }
}

export async function runGrowthR2ForwardRuntimeProbe(options = {}, runtimeEnvOverride = null) {
  const safeOptions = options && typeof options === "object" && !Array.isArray(options) ? options : {};
  const {
    apiKey = null,
    env = null,
    asOf = null,
    fetchImpl = globalThis.fetch,
    now = () => new Date(),
    collectImpl = collectGrowthR2ForwardRecords,
    maxProviderRequests = MAX_PROVIDER_REQUESTS,
  } = safeOptions;
  const effectiveEnv = runtimeEnvOverride && typeof runtimeEnvOverride === "object" ? runtimeEnvOverride : env;
  const effectiveKey = censusKeyPresent(apiKey) ? apiKey.trim() : (censusKeyPresent(effectiveEnv?.CENSUS_API_KEY) ? effectiveEnv.CENSUS_API_KEY.trim() : null);
  const effectiveAsOf = typeof asOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : now().toISOString().slice(0, 10);
  const state = { providerRequestCount: 0, currentStage: "PRECHECK", failedStage: null, requestBudgetExceeded: false, censusAccepted: false, events: [] };
  if (!effectiveKey) {
    return {
      status: "RUNTIME_CONFIGURATION_MISSING",
      scope: "GROWTH_R2_FORWARD_DIAGNOSTIC_ONLY",
      asOf: effectiveAsOf,
      secretPresent: false,
      keyAccepted: false,
      providerRequestCount: 0,
      providerRequestLimit: maxProviderRequests,
      failedStage: "PRECHECK",
      errorCode: "GROWTH_R2_CENSUS_API_KEY_REQUIRED",
      targetCandidateId: null,
      httpStatus: null,
      parserSuccess: false,
      schemaValid: false,
      dbWrites: 0,
      persistence: false,
      events: [],
    };
  }
  const wrappedFetch = createGrowthR2ProbeFetch(fetchImpl, state, { maxRequests: maxProviderRequests });
  try {
    const forward = await collectImpl({
      env: { CENSUS_API_KEY: effectiveKey },
      asOf: effectiveAsOf,
      fetchImpl: wrappedFetch,
      seedRows: GROWTH_R2_SEED_ROWS,
      now,
    });
    const summary = safeSummary(forward);
    assertNoSecretInEvents(state.events);
    const schemaValid = forward?.status === "READY" && summary.recordCount === 24 && summary.candidateIds.length === 24;
    return {
      status: schemaValid ? "SUCCESS" : "UPSTREAM_ERROR",
      scope: "GROWTH_R2_FORWARD_DIAGNOSTIC_ONLY",
      asOf: effectiveAsOf,
      secretPresent: true,
      keyAccepted: state.censusAccepted,
      providerRequestCount: state.providerRequestCount,
      providerRequestLimit: maxProviderRequests,
      failedStage: schemaValid ? null : "FINAL_COVERAGE",
      errorCode: schemaValid ? null : "GROWTH_R2_PROBE_SCHEMA_OR_COVERAGE_INVALID",
      targetCandidateId: null,
      httpStatus: schemaValid ? 200 : lastHttpStatus(state.events),
      parserSuccess: schemaValid,
      schemaValid,
      dbWrites: 0,
      persistence: false,
      events: state.events,
      summary,
    };
  } catch (error) {
    const failedStage = state.failedStage || state.currentStage || "UNKNOWN";
    const sanitized = sanitizeGrowthR2ProbeError(error, failedStage);
    assertNoSecretInEvents(state.events);
    return {
      status: "UPSTREAM_ERROR",
      scope: "GROWTH_R2_FORWARD_DIAGNOSTIC_ONLY",
      asOf: effectiveAsOf,
      secretPresent: true,
      keyAccepted: state.censusAccepted,
      providerRequestCount: state.providerRequestCount,
      providerRequestLimit: maxProviderRequests,
      failedStage: sanitized.failedStage,
      errorCode: sanitized.errorCode,
      errorName: sanitized.errorName,
      targetCandidateId: sanitized.targetCandidateId,
      httpStatus: lastHttpStatus(state.events),
      parserSuccess: sanitized.errorCode !== "GROWTH_R2_PROBE_JSON_PARSE_ERROR",
      schemaValid: false,
      dbWrites: 0,
      persistence: false,
      requestBudgetExceeded: state.requestBudgetExceeded,
      events: state.events,
    };
  }
}


function normalizeEmail(value) {
  if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  if (!value || typeof value !== "object") return null;
  const direct = [value.email, value.userEmail, value.authenticatedEmail];
  for (const candidate of direct) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim().toLowerCase();
  }
  if (value.user && typeof value.user === "object") return normalizeEmail(value.user);
  return null;
}

function probeJson(body, status = 200) {
  return Response.json(
    { temporary: "TEMPORARY_GROWTH_R2_FORWARD_RUNTIME_PROBE_ONLY", ...body },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    },
  );
}

export function createGrowthR2ForwardRuntimeProbeHandler({
  authenticate,
  env,
  probeImpl = runGrowthR2ForwardRuntimeProbe,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
} = {}) {
  return async function growthR2ForwardRuntimeProbeHandler() {
    let user = null;
    try {
      user = typeof authenticate === "function" ? await authenticate() : null;
    } catch {
      user = null;
    }
    const userEmail = normalizeEmail(user);
    if (!userEmail) {
      return probeJson({
        status: "UNAUTHENTICATED",
        scope: "GROWTH_R2_FORWARD_DIAGNOSTIC_ONLY",
        providerRequestCount: 0,
        dbWrites: 0,
        persistence: false,
      }, 401);
    }

    const ownerEmail = normalizeEmail(env?.KFG_V2_CANARY_OPERATOR_EMAIL);
    if (!ownerEmail) {
      return probeJson({
        status: "RUNTIME_CONFIGURATION_MISSING",
        scope: "GROWTH_R2_FORWARD_DIAGNOSTIC_ONLY",
        errorCode: "GROWTH_R2_OPERATOR_EMAIL_REQUIRED",
        providerRequestCount: 0,
        dbWrites: 0,
        persistence: false,
      }, 503);
    }
    if (userEmail !== ownerEmail) {
      return probeJson({
        status: "FORBIDDEN",
        scope: "GROWTH_R2_FORWARD_DIAGNOSTIC_ONLY",
        providerRequestCount: 0,
        dbWrites: 0,
        persistence: false,
      }, 403);
    }

    const out = await probeImpl({ env, fetchImpl, now });
    const status = out?.status === "SUCCESS" ? 200 : out?.status === "RUNTIME_CONFIGURATION_MISSING" ? 503 : 502;
    return probeJson(out && typeof out === "object" ? out : {
      status: "UPSTREAM_ERROR",
      scope: "GROWTH_R2_FORWARD_DIAGNOSTIC_ONLY",
      errorCode: "GROWTH_R2_PROBE_INVALID_RESULT",
      providerRequestCount: 0,
      dbWrites: 0,
      persistence: false,
    }, status);
  };
}

export const GROWTH_R2_FORWARD_RUNTIME_PROBE_CONTRACT = Object.freeze({
  scope: "GROWTH_R2_FORWARD_DIAGNOSTIC_ONLY",
  maxProviderRequests: MAX_PROVIDER_REQUESTS,
  dbWrites: 0,
  persistence: false,
  secretsReturned: false,
  reusesProductionForwardProvider: true,
});
