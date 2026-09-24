import { env } from "cloudflare:workers";
import { chatGPTSignInPath, getChatGPTUser } from "../../../chatgpt-auth";
import { INFLATION_PIT_BATCHES, persistInflationPitBatch } from "../../../../worker/inflation-pit-backfill.mjs";

const ROUTE_PATH = "/api/internal/inflation-pit-backfill";
const OBSERVATION_END = "2026-09-24";
const TEMPORARY = "TEMPORARY_INF09_PIT_BACKFILL_ONLY";

type Bindings = {
  DB?: any;
  FRED_API_KEY?: string;
  KFG_V2_CANARY_OPERATOR_EMAIL?: string;
};

type ExistingState = {
  present: Array<{dataset: string; rowCount: number; latestObservationDate: string | null; retrievedAt: string | null}>;
  missing: string[];
  tablePresent: boolean;
};

function json(body: unknown, status = 200, filename?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
  };
  if (filename) headers["content-disposition"] = `attachment; filename="${filename}"`;
  return new Response(JSON.stringify(body, null, 2) + "\n", {status, headers});
}

function validBatch(value: unknown): value is 1 | 2 {
  return value === 1 || value === 2;
}

function batchIds(batch: 1 | 2) {
  return [...INFLATION_PIT_BATCHES[batch - 1]];
}

async function authOrResponse(url: URL) {
  const user = await getChatGPTUser();
  if (!user?.email) {
    const returnTo = `${url.pathname}${url.search}`;
    const signIn = chatGPTSignInPath(returnTo);
    return {user: null, response: Response.redirect(new URL(signIn, url.origin), 302)};
  }
  const bindings = env as unknown as Bindings;
  const expected = String(bindings.KFG_V2_CANARY_OPERATOR_EMAIL ?? "").trim().toLowerCase();
  const actual = String(user.email ?? "").trim().toLowerCase();
  if (!expected) return {user: null, response: json({status:"RUNTIME_CONFIGURATION_MISSING", missing:["KFG_V2_CANARY_OPERATOR_EMAIL"], temporary:TEMPORARY}, 503)};
  if (!actual || actual !== expected) return {user: null, response: json({status:"FORBIDDEN", temporary:TEMPORARY}, 403)};
  return {user, response: null};
}

async function readExisting(db: any, ids: string[]): Promise<ExistingState> {
  if (!db || typeof db.prepare !== "function") return {present:[], missing:[...ids], tablePresent:false};
  const present: ExistingState["present"] = [];
  for (const dataset of ids) {
    try {
      const stmt = db.prepare(`SELECT dataset,row_count,latest_observation_date,retrieved_at
        FROM api_history_snapshots_v1
        WHERE provider=? AND dataset=? AND history_mode='INITIAL_RELEASE_ONLY'
        ORDER BY retrieved_at DESC LIMIT 1`).bind("FRED", dataset);
      const row = typeof stmt.first === "function"
        ? await stmt.first()
        : (await stmt.all())?.results?.[0] ?? null;
      if (row) present.push({
        dataset,
        rowCount: Number(row.row_count ?? 0),
        latestObservationDate: typeof row.latest_observation_date === "string" ? row.latest_observation_date : null,
        retrievedAt: typeof row.retrieved_at === "string" ? row.retrieved_at : null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/no such table|does not exist/i.test(message)) return {present:[], missing:[...ids], tablePresent:false};
      throw error;
    }
  }
  const have = new Set(present.map(row => row.dataset));
  return {present, missing:ids.filter(id => !have.has(id)), tablePresent:true};
}

function htmlPage(batch: 1 | 2, existing: ExistingState) {
  const ids = batchIds(batch);
  const partial = existing.present.length > 0 && existing.present.length < ids.length;
  const complete = existing.present.length === ids.length;
  const button = complete
    ? `<p><strong>ALREADY STORED:</strong> ${existing.present.length}/${ids.length}. Provider requests will not run.</p>`
    : partial
      ? `<p><strong>PARTIAL EXISTING:</strong> ${existing.present.length}/${ids.length}. Automatic retry is disabled. Return the evidence to GPT.</p>`
      : `<form method="post" action="${ROUTE_PATH}">
          <input type="hidden" name="batch" value="${batch}">
          <input type="hidden" name="confirm" value="PIT8B${batch}">
          <button type="submit" style="font-size:18px;padding:12px 18px">RUN PIT BATCH ${batch} — MAX 8 FRED REQUESTS</button>
        </form>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>ZGMINI PIT Batch ${batch}</title></head>
  <body style="font-family:system-ui;max-width:900px;margin:40px auto;padding:0 20px">
    <h1>ZGMINI INF-09 PIT Backfill — Batch ${batch}</h1>
    <p>Temporary owner-only route. Observation end: <code>${OBSERVATION_END}</code>.</p>
    <p>Series (${ids.length}): <code>${ids.join(", ")}</code></p>
    <p>Existing initial-release snapshots: ${existing.present.length}/${ids.length}</p>
    ${button}
    <p>Do not refresh after submitting. The result is downloaded as JSON.</p>
  </body></html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = await authOrResponse(url);
  if (auth.response) return auth.response;
  const raw = Number(url.searchParams.get("batch") ?? "1");
  if (!validBatch(raw)) return json({status:"INVALID_BATCH", temporary:TEMPORARY}, 400);
  const bindings = env as unknown as Bindings;
  if (!bindings.DB) return json({status:"RUNTIME_CONFIGURATION_MISSING", missing:["DB"], temporary:TEMPORARY}, 503);
  const existing = await readExisting(bindings.DB, batchIds(raw));
  return new Response(htmlPage(raw, existing), {
    status: 200,
    headers: {"content-type":"text/html; charset=utf-8", "cache-control":"no-store, max-age=0"},
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const auth = await authOrResponse(url);
  if (auth.response) return auth.response;
  const form = await request.formData();
  const batch = Number(form.get("batch"));
  if (!validBatch(batch)) return json({status:"INVALID_BATCH", providerRequestCount:0, automaticRetries:0, temporary:TEMPORARY}, 400);
  if (String(form.get("confirm") ?? "") !== `PIT8B${batch}`) {
    return json({status:"CONFIRMATION_MISMATCH", providerRequestCount:0, automaticRetries:0, temporary:TEMPORARY}, 400);
  }

  const bindings = env as unknown as Bindings;
  const ids = batchIds(batch);
  if (!bindings.DB) return json({status:"RUNTIME_CONFIGURATION_MISSING", missing:["DB"], providerRequestCount:0, automaticRetries:0, temporary:TEMPORARY}, 503, `ZG_PIT_B${batch}_R24.json`);
  const key = String(bindings.FRED_API_KEY ?? "").trim();
  if (!key) return json({status:"RUNTIME_CONFIGURATION_MISSING", missing:["FRED_API_KEY"], providerRequestCount:0, automaticRetries:0, temporary:TEMPORARY}, 503, `ZG_PIT_B${batch}_R24.json`);

  const before = await readExisting(bindings.DB, ids);
  if (before.present.length === ids.length) {
    return json({status:"ALREADY_STORED", batch, observationEnd:OBSERVATION_END, providerRequestCount:0, automaticRetries:0, present:before.present, temporary:TEMPORARY}, 200, `ZG_PIT_B${batch}_R24.json`);
  }
  if (before.present.length > 0) {
    return json({status:"PARTIAL_ALREADY_PRESENT_REVIEW_REQUIRED", batch, observationEnd:OBSERVATION_END, providerRequestCount:0, automaticRetries:0, present:before.present, missing:before.missing, temporary:TEMPORARY}, 409, `ZG_PIT_B${batch}_R24.json`);
  }

  try {
    const result = await persistInflationPitBatch(bindings.DB, {
      key,
      batch,
      observationEnd: OBSERVATION_END,
      retrievedAt: new Date().toISOString(),
    });
    const after = await readExisting(bindings.DB, ids);
    const pass = result.status === "STORED" && result.requestCount === 8 && result.readyCount === 8 && after.present.length === 8;
    return json({
      status: pass ? "PASS_PIT_BATCH_STORED" : result.status,
      batch,
      observationEnd: OBSERVATION_END,
      seriesIds: result.seriesIds,
      providerRequestCount: result.requestCount,
      automaticRetries: 0,
      readyCount: result.readyCount,
      failed: result.failed,
      storage: result.storage,
      postcheck: {presentCount: after.present.length, missing: after.missing, snapshots: after.present},
      temporary: TEMPORARY,
      next: pass ? (batch === 1 ? "PIT_BATCH_2_8_OF_16" : "INF09_STORED_PIT_VALIDATION") : "REVIEW_NO_AUTOMATIC_RETRY",
    }, pass ? 200 : 409, `ZG_PIT_B${batch}_R24.json`);
  } catch (error) {
    return json({
      status:"PIT_BATCH_UNHANDLED_ERROR",
      batch,
      observationEnd:OBSERVATION_END,
      providerRequestCount:"UNKNOWN_MAX_8",
      automaticRetries:0,
      error:error instanceof Error ? error.message : "UNKNOWN",
      temporary:TEMPORARY,
      next:"REVIEW_NO_AUTOMATIC_RETRY",
    }, 500, `ZG_PIT_B${batch}_R24.json`);
  }
}
