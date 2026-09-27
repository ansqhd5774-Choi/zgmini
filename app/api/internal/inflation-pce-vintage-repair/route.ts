import { env } from "cloudflare:workers";
import { chatGPTSignInPath, getChatGPTUser } from "../../../chatgpt-auth";
import { loadStoredInflationSeries } from "../../../../worker/inflation-history-reader.mjs";

const ROUTE_PATH = "/api/internal/inflation-pce-vintage-repair";
const OBSERVATION_END = "2026-09-24";
const TEMPORARY = "TEMPORARY_INF09_R29_6_PCE_VINTAGE_REPAIR_ONLY";
const OUTPUT_FILE = "ZG_PCE_R29_6.json";
const SERIES = Object.freeze(["PCEPILFE", "PCEPI"] as const);
const EXPECTED_ROWS_PER_SERIES = 313;

type Bindings = {
  DB?: any;
  FRED_API_KEY?: string;
  KFG_V2_CANARY_OPERATOR_EMAIL?: string;
};

type ScheduleRow = {
  observationDate: string;
  availableAt: string;
};

type RepairRow = {
  observationDate: string;
  availableAt: string;
  value: number;
};

function json(body: unknown, status = 200, filename?: string) {
  const headers: Record<string,string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
  };
  if (filename) headers["content-disposition"] = `attachment; filename="${filename}"`;
  return new Response(JSON.stringify(body, null, 2) + "\n", {status, headers});
}

function validDate(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0,10) === value;
}

async function authOrResponse(url: URL) {
  const user = await getChatGPTUser();
  if (!user?.email) {
    const signIn = chatGPTSignInPath(`${url.pathname}${url.search}`);
    return {response: Response.redirect(new URL(signIn, url.origin), 302)};
  }
  const bindings = env as unknown as Bindings;
  const expected = String(bindings.KFG_V2_CANARY_OPERATOR_EMAIL ?? "").trim().toLowerCase();
  const actual = String(user.email ?? "").trim().toLowerCase();
  if (!expected) return {response: json({status:"RUNTIME_CONFIGURATION_MISSING",missing:["KFG_V2_CANARY_OPERATOR_EMAIL"],temporary:TEMPORARY},503)};
  if (!actual || actual !== expected) return {response: json({status:"FORBIDDEN",temporary:TEMPORARY},403)};
  return {response: null};
}

function minusMonths(dateStr: string, n: number) {
  const [y,m,d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 - n, d));
  return dt.toISOString().slice(0,10);
}

function vintageField(seriesId: string, vintageDate: string) {
  return `${seriesId}_${vintageDate.replaceAll("-","")}`;
}

function numericCell(v: unknown): number | null {
  if (v === null || v === undefined || v === "" || v === "." || v === "#NA") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function loadSchedule(db: any) {
  if (!db || typeof db.prepare !== "function") {
    throw new Error("DB_BINDING_MISSING");
  }
  const reader = await loadStoredInflationSeries(db,{asOf: OBSERVATION_END});
  if (!reader || typeof reader !== "object" || !reader.series || typeof reader.series !== "object") {
    throw new Error("PIT_READER_INVALID_RESULT");
  }
  if (Array.isArray(reader?.missing) && SERIES.some(id => reader.missing.includes(id))) {
    throw new Error(`PIT_READER_TARGET_MISSING_${reader.missing.filter((id:string)=>SERIES.includes(id as any)).join(",")}`);
  }
  if (Array.isArray(reader?.issues) && reader.issues.length > 0) {
    throw new Error(`PIT_READER_ISSUES_${reader.issues.join(",")}`);
  }

  const schedules: Record<string, ScheduleRow[]> = {};
  for (const seriesId of SERIES) {
    const rows = Array.isArray(reader.series?.[seriesId]) ? reader.series[seriesId] : [];
    const schedule: ScheduleRow[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const observationDate = row?.observationDate;
      const availableAt = row?.availableAt;
      if (!validDate(observationDate) || !validDate(availableAt)) continue;
      if (observationDate > OBSERVATION_END || availableAt > OBSERVATION_END) continue;
      if (seen.has(observationDate)) throw new Error(`PIT_DUPLICATE_OBSERVATION_${seriesId}_${observationDate}`);
      seen.add(observationDate);
      schedule.push({observationDate,availableAt});
    }
    schedule.sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
    if (schedule.length !== EXPECTED_ROWS_PER_SERIES) {
      throw new Error(`PIT_SCHEDULE_COUNT_${seriesId}_${schedule.length}`);
    }
    schedules[seriesId] = schedule;
  }
  return schedules as Record<"PCEPILFE"|"PCEPI",ScheduleRow[]>;
}

async function fetchSameVintagePc1(
  seriesId: "PCEPILFE" | "PCEPI",
  schedule: readonly ScheduleRow[],
  key: string
) {
  const vintages = [...new Set(schedule.map(r => r.availableAt))].sort();
  if (vintages.length > 2000) throw new Error(`VINTAGE_LIMIT_${seriesId}_${vintages.length}`);

  const u = new URL("https://api.stlouisfed.org/fred/series/observations");
  u.searchParams.set("series_id", seriesId);
  u.searchParams.set("api_key", key);
  u.searchParams.set("file_type", "json");
  u.searchParams.set("output_type", "2");
  u.searchParams.set("units", "pc1");
  u.searchParams.set("observation_start", minusMonths(schedule[0].observationDate, 12));
  u.searchParams.set("observation_end", schedule[schedule.length - 1].observationDate);
  u.searchParams.set("vintage_dates", vintages.join(","));
  u.searchParams.set("limit", "100000");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let response: Response;
  try {
    response = await fetch(u,{
      signal: controller.signal,
      headers: {accept:"application/json"},
    });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error(`FRED_HTTP_${response.status}_${seriesId}`);

  const data = await response.json() as any;
  if (data?.error_code) throw new Error(`FRED_API_ERROR_${seriesId}_${String(data.error_code)}`);
  if (Number(data?.output_type) !== 2) throw new Error(`FRED_OUTPUT_TYPE_MISMATCH_${seriesId}`);
  if (String(data?.units) !== "pc1") throw new Error(`FRED_UNITS_MISMATCH_${seriesId}`);
  if (!Array.isArray(data?.observations)) throw new Error(`FRED_SCHEMA_NO_OBSERVATIONS_${seriesId}`);

  const byDate = new Map<string,any>();
  for (const row of data.observations) {
    if (row && /^\d{4}-\d{2}-\d{2}$/.test(String(row.date ?? ""))) {
      byDate.set(row.date,row);
    }
  }

  const rows: RepairRow[] = [];
  const missing: ScheduleRow[] = [];
  for (const item of schedule) {
    const row = byDate.get(item.observationDate);
    const value = numericCell(row?.[vintageField(seriesId,item.availableAt)]);
    if (value === null) missing.push(item);
    else rows.push({observationDate:item.observationDate,availableAt:item.availableAt,value});
  }

  return {
    seriesId,
    vintageDateCount:vintages.length,
    scheduleCount:schedule.length,
    responseObservationRows:data.observations.length,
    rows,
    missing,
  };
}

function htmlPage(keyPresent: boolean, scheduleCounts: Record<string,number>) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>ZGMINI PCE Vintage Repair</title></head>
  <body style="font-family:system-ui;max-width:900px;margin:40px auto;padding:0 20px">
    <h1>ZGMINI INF-09 R29.6 — PCE Same-Vintage Repair</h1>
    <p>Temporary owner-only route.</p>
    <p>Stored PIT schedule: <strong>PCEPILFE ${scheduleCounts.PCEPILFE}, PCEPI ${scheduleCounts.PCEPI}</strong></p>
    <p>Hosted FRED key: <strong>${keyPresent ? "PRESENT" : "MISSING"}</strong></p>
    <p>Successful submit: <strong>exactly 2 FRED requests</strong>, automatic retry 0, D1 write 0.</p>
    <form method="post" action="${ROUTE_PATH}">
      <input type="hidden" name="confirm" value="PCEV2R296">
      <button type="submit" style="font-size:18px;padding:12px 18px" ${keyPresent ? "" : "disabled"}>RUN PCE REPAIR — 2 FRED REQUESTS</button>
    </form>
    <p>Click once only. Do not refresh after submitting. Result downloads as <code>${OUTPUT_FILE}</code>.</p>
  </body></html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.pathname !== ROUTE_PATH) return json({status:"NOT_FOUND",temporary:TEMPORARY},404);
  const auth = await authOrResponse(url);
  if (auth.response) return auth.response;

  const bindings = env as unknown as Bindings;
  const keyPresent = Boolean(String(bindings.FRED_API_KEY ?? "").trim());
  try {
    const schedules = await loadSchedule(bindings.DB);
    return new Response(htmlPage(keyPresent,{
      PCEPILFE:schedules.PCEPILFE.length,
      PCEPI:schedules.PCEPI.length,
    }),{
      status:200,
      headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store, max-age=0"},
    });
  } catch (error) {
    return json({
      status:"PCE_REPAIR_PRECHECK_ERROR",
      providerRequestCount:0,
      automaticRetries:0,
      dbWrites:0,
      error:error instanceof Error ? error.message : "UNKNOWN",
      temporary:TEMPORARY,
    },500);
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.pathname !== ROUTE_PATH) return json({status:"NOT_FOUND",temporary:TEMPORARY},404);
  const auth = await authOrResponse(url);
  if (auth.response) return auth.response;

  const form = await request.formData();
  if (String(form.get("confirm") ?? "") !== "PCEV2R296") {
    return json({
      status:"CONFIRMATION_MISMATCH",
      providerRequestCount:0,
      automaticRetries:0,
      dbWrites:0,
      temporary:TEMPORARY,
    },400,OUTPUT_FILE);
  }

  const bindings = env as unknown as Bindings;
  const key = String(bindings.FRED_API_KEY ?? "").trim();
  if (!key) {
    return json({
      status:"RUNTIME_CONFIGURATION_MISSING",
      missing:["FRED_API_KEY"],
      providerRequestCount:0,
      automaticRetries:0,
      dbWrites:0,
      temporary:TEMPORARY,
    },503,OUTPUT_FILE);
  }

  let providerRequestCount = 0;
  const results: any[] = [];
  try {
    const schedules = await loadSchedule(bindings.DB);

    providerRequestCount += 1;
    results.push(await fetchSameVintagePc1("PCEPILFE",schedules.PCEPILFE,key));

    providerRequestCount += 1;
    results.push(await fetchSameVintagePc1("PCEPI",schedules.PCEPI,key));

    const missingCount = results.reduce((sum,r)=>sum+r.missing.length,0);
    const pass = results.every(r =>
      r.scheduleCount === EXPECTED_ROWS_PER_SERIES
      && r.rows.length === EXPECTED_ROWS_PER_SERIES
      && r.missing.length === 0
    );

    return json({
      status: pass ? "PASS_PCE_SAME_VINTAGE_REPAIR" : "PARTIAL_PCE_SAME_VINTAGE_REPAIR",
      revision:"R29.6",
      method:"FRED_OUTPUT_TYPE_2_UNITS_PC1_AT_STORED_R25_INITIAL_RELEASE_VINTAGES",
      seriesIds:[...SERIES],
      providerRequestCount,
      automaticRetries:0,
      dbReads:"PIT_READER_ONLY",
      dbWrites:0,
      sourceWrites:0,
      missingCount,
      results,
      temporary:TEMPORARY,
      next:pass ? "GPT_R29_5_RECOMPUTE_INF09" : "REVIEW_NO_AUTOMATIC_RETRY",
    },pass ? 200 : 409,OUTPUT_FILE);
  } catch (error) {
    return json({
      status:"PCE_REPAIR_ERROR",
      revision:"R29.6",
      providerRequestCount,
      automaticRetries:0,
      dbReads:"PIT_READER_ONLY",
      dbWrites:0,
      sourceWrites:0,
      error:error instanceof Error ? error.message : "UNKNOWN",
      partialResults:results,
      temporary:TEMPORARY,
      next:"REVIEW_NO_AUTOMATIC_RETRY",
    },500,OUTPUT_FILE);
  }
}
