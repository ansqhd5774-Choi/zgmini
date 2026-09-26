import { env } from "cloudflare:workers";
import { chatGPTSignInPath, getChatGPTUser } from "../../../chatgpt-auth";
import { INFLATION_PIT_SERIES } from "../../../../worker/inflation-pit-backfill.mjs";
import { loadStoredInflationPitSeries } from "../../../../worker/inflation-pit-reader.mjs";

const ROUTE_PATH = "/api/internal/inflation-pit-validate";
const OBSERVATION_END = "2026-09-24";
const TEMPORARY = "TEMPORARY_INF09_STORED_PIT_VALIDATION_ONLY";

type Bindings = {
  DB?: any;
  KFG_V2_CANARY_OPERATOR_EMAIL?: string;
};

type SnapshotRow = {
  snapshot_sha256?: string;
  as_of?: string;
  retrieved_at?: string;
  status?: string;
  history_mode?: string;
  row_count?: number;
  latest_observation_date?: string | null;
  chunk_hashes_json?: string;
  provenance_json?: string;
};

type PitRow = {
  observationDate?: string;
  value?: number;
  releaseDate?: string;
  availableAt?: string;
  realtimeStart?: string;
  realtimeEnd?: string | null;
  vintageId?: string;
  vintageMethod?: string;
  revision?: string;
};

function validDate(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseArray(value: unknown): any[] {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseObject(value: unknown): Record<string, any> | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function sha256Hex(value: string) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function firstRow(db: any, sql: string, args: unknown[]) {
  const stmt = db.prepare(sql).bind(...args);
  if (typeof stmt.first === "function") return await stmt.first();
  const result = await stmt.all();
  return Array.isArray(result?.results) ? result.results[0] ?? null : null;
}

function json(body: unknown, status = 200, filename?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
  };
  if (filename) headers["content-disposition"] = `attachment; filename="${filename}"`;
  return new Response(JSON.stringify(body, null, 2) + "\n", {status, headers});
}

async function authOrResponse(url: URL) {
  const user = await getChatGPTUser();
  if (!user?.email) {
    const returnTo = `${url.pathname}${url.search}`;
    const signIn = chatGPTSignInPath(returnTo);
    return {response: Response.redirect(new URL(signIn, url.origin), 302)};
  }
  const bindings = env as unknown as Bindings;
  const expected = String(bindings.KFG_V2_CANARY_OPERATOR_EMAIL ?? "").trim().toLowerCase();
  const actual = String(user.email ?? "").trim().toLowerCase();
  if (!expected) return {response: json({status:"RUNTIME_CONFIGURATION_MISSING",missing:["KFG_V2_CANARY_OPERATOR_EMAIL"],temporary:TEMPORARY},503)};
  if (!actual || actual !== expected) return {response: json({status:"FORBIDDEN",temporary:TEMPORARY},403)};
  return {response: null};
}

function normalizeForExpected(row: PitRow) {
  const availableAt = validDate(row.availableAt) ? row.availableAt
    : validDate(row.releaseDate) ? row.releaseDate
    : validDate(row.realtimeStart) ? row.realtimeStart
    : null;
  return {
    observationDate: validDate(row.observationDate) ? row.observationDate : null,
    value: finite(row.value) ? row.value : null,
    availableAt,
  };
}

function expectedAsOfRows(rows: PitRow[], asOf: string) {
  const byObservation = new Map<string, {observationDate:string;value:number;availableAt:string}>();
  for (const raw of rows) {
    const row = normalizeForExpected(raw);
    if (!row.observationDate || row.value === null || !row.availableAt) continue;
    if (row.observationDate > asOf || row.availableAt > asOf) continue;
    const prior = byObservation.get(row.observationDate);
    if (!prior || row.availableAt < prior.availableAt) {
      byObservation.set(row.observationDate, row as {observationDate:string;value:number;availableAt:string});
    }
  }
  return [...byObservation.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}

async function validateDataset(db: any, dataset: string) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const countRow = await firstRow(db,
    `SELECT COUNT(*) AS snapshot_count FROM api_history_snapshots_v1
      WHERE provider=? AND dataset=? AND history_mode='INITIAL_RELEASE_ONLY'`,
    ["FRED", dataset]);
  const snapshotCount = Number(countRow?.snapshot_count ?? 0);
  const snapshot = await firstRow(db,
    `SELECT snapshot_sha256,as_of,retrieved_at,status,history_mode,row_count,
            latest_observation_date,chunk_hashes_json,provenance_json
       FROM api_history_snapshots_v1
      WHERE provider=? AND dataset=? AND history_mode='INITIAL_RELEASE_ONLY'
      ORDER BY retrieved_at DESC LIMIT 1`,
    ["FRED", dataset]) as SnapshotRow | null;
  if (!snapshot) {
    return {dataset, pass:false, snapshotCount, errors:["SNAPSHOT_MISSING"], warnings, rowCount:0, chunkCount:0};
  }

  if (snapshot.status !== "READY_INITIAL_RELEASE_HISTORY") errors.push(`STATUS:${String(snapshot.status)}`);
  if (snapshot.history_mode !== "INITIAL_RELEASE_ONLY") errors.push(`HISTORY_MODE:${String(snapshot.history_mode)}`);
  if (snapshot.as_of !== OBSERVATION_END) errors.push(`AS_OF:${String(snapshot.as_of)}`);
  if (!validDate(snapshot.latest_observation_date)) errors.push("LATEST_OBSERVATION_DATE_INVALID");
  if (typeof snapshot.retrieved_at !== "string" || !Number.isFinite(Date.parse(snapshot.retrieved_at))) errors.push("RETRIEVED_AT_INVALID");

  const chunkHashes = parseArray(snapshot.chunk_hashes_json).filter(x=>typeof x === "string");
  if (!chunkHashes.length) errors.push("CHUNK_HASHES_EMPTY");
  if (new Set(chunkHashes).size !== chunkHashes.length) errors.push("CHUNK_HASH_DUPLICATE");
  const provenance = parseObject(snapshot.provenance_json);
  if (!provenance) errors.push("PROVENANCE_INVALID_JSON");
  else {
    if (provenance.transport !== "FRED_API_OUTPUT_TYPE_4") errors.push(`PROVENANCE_TRANSPORT:${String(provenance.transport)}`);
    if (provenance.historyMode !== "INITIAL_RELEASE_ONLY") errors.push(`PROVENANCE_MODE:${String(provenance.historyMode)}`);
    if (provenance.releaseDatePolicy !== "FRED_REALTIME_START_INITIAL_RELEASE") errors.push(`RELEASE_POLICY:${String(provenance.releaseDatePolicy)}`);
    if (provenance.availableAtPolicy !== "FRED_REALTIME_START_INITIAL_RELEASE") errors.push(`AVAILABLE_POLICY:${String(provenance.availableAtPolicy)}`);
    if (Number(provenance.requestCount) !== 1) errors.push(`REQUEST_COUNT:${String(provenance.requestCount)}`);
  }

  const allRows: PitRow[] = [];
  const chunkAudit: Array<Record<string, unknown>> = [];
  for (const chunkHash of chunkHashes) {
    const chunk = await firstRow(db,
      `SELECT chunk_sha256,first_observation_date,last_observation_date,row_count,payload_json,first_seen_at
         FROM api_history_chunks_v1
        WHERE provider=? AND dataset=? AND chunk_sha256=? LIMIT 1`,
      ["FRED", dataset, chunkHash]);
    if (!chunk) {
      errors.push(`CHUNK_MISSING:${chunkHash}`);
      continue;
    }
    const payloadJson = typeof chunk.payload_json === "string" ? chunk.payload_json : "";
    const payloadRows = parseArray(payloadJson) as PitRow[];
    const computedHash = payloadJson ? await sha256Hex(payloadJson) : null;
    const first = payloadRows[0]?.observationDate ?? null;
    const last = payloadRows.at(-1)?.observationDate ?? null;
    const chunkErrors: string[] = [];
    if (!payloadRows.length) chunkErrors.push("EMPTY");
    if (computedHash !== chunkHash || chunk.chunk_sha256 !== chunkHash) chunkErrors.push("HASH_MISMATCH");
    if (Number(chunk.row_count) !== payloadRows.length) chunkErrors.push("ROW_COUNT_MISMATCH");
    if (chunk.first_observation_date !== first) chunkErrors.push("FIRST_DATE_MISMATCH");
    if (chunk.last_observation_date !== last) chunkErrors.push("LAST_DATE_MISMATCH");
    if (chunkErrors.length) errors.push(...chunkErrors.map(x=>`CHUNK:${chunkHash}:${x}`));
    chunkAudit.push({chunkHash,rowCount:payloadRows.length,firstObservationDate:first,lastObservationDate:last,pass:chunkErrors.length===0});
    allRows.push(...payloadRows);
  }

  if (Number(snapshot.row_count) !== allRows.length) errors.push(`SNAPSHOT_ROW_COUNT:${String(snapshot.row_count)}!=${allRows.length}`);
  if (allRows.length && snapshot.latest_observation_date !== allRows.at(-1)?.observationDate) errors.push("SNAPSHOT_LATEST_DATE_MISMATCH");

  const seen = new Set<string>();
  let priorObservation: string | null = null;
  for (let i=0;i<allRows.length;i++) {
    const row = allRows[i];
    const prefix = `ROW:${i}`;
    if (!validDate(row.observationDate)) { errors.push(`${prefix}:OBSERVATION_DATE`); continue; }
    if (!finite(row.value)) errors.push(`${prefix}:VALUE`);
    if (!validDate(row.releaseDate)) errors.push(`${prefix}:RELEASE_DATE`);
    if (!validDate(row.availableAt)) errors.push(`${prefix}:AVAILABLE_AT`);
    if (!validDate(row.realtimeStart)) errors.push(`${prefix}:REALTIME_START`);
    if (validDate(row.observationDate) && row.observationDate > OBSERVATION_END) errors.push(`${prefix}:OBS_FUTURE`);
    if (validDate(row.availableAt) && row.availableAt > OBSERVATION_END) errors.push(`${prefix}:AVAILABLE_FUTURE`);
    if (row.releaseDate !== row.availableAt || row.availableAt !== row.realtimeStart) errors.push(`${prefix}:RELEASE_AVAILABLE_REALTIME_MISMATCH`);
    if (row.vintageId !== row.availableAt) errors.push(`${prefix}:VINTAGE_ID_MISMATCH`);
    if (row.vintageMethod !== "FRED_INITIAL_RELEASE_OUTPUT_TYPE_4") errors.push(`${prefix}:VINTAGE_METHOD`);
    if (row.revision !== "INITIAL_RELEASE") errors.push(`${prefix}:REVISION`);
    if (seen.has(row.observationDate)) errors.push(`${prefix}:DUPLICATE_OBSERVATION_DATE`);
    seen.add(row.observationDate);
    if (priorObservation && row.observationDate < priorObservation) errors.push(`${prefix}:ORDER`);
    priorObservation = row.observationDate;
  }

  if (provenance && typeof snapshot.snapshot_sha256 === "string") {
    const identity = JSON.stringify({schemaVersion:1,provider:"FRED",dataset,provenance,chunks:chunkHashes});
    const computedSnapshot = await sha256Hex(identity);
    if (computedSnapshot !== snapshot.snapshot_sha256) errors.push("SNAPSHOT_HASH_MISMATCH");
  }

  let midpointAsOf: string | null = null;
  let midpointExpected = 0;
  let midpointActual = 0;
  let midpointReaderStatus: string | null = null;
  let midpointLookAheadSafe = false;
  if (allRows.length) {
    const mid = allRows[Math.floor((allRows.length - 1) / 2)];
    midpointAsOf = validDate(mid?.availableAt) ? mid.availableAt! : null;
    if (!midpointAsOf) errors.push("MIDPOINT_ASOF_MISSING");
    else {
      const expected = expectedAsOfRows(allRows, midpointAsOf);
      midpointExpected = expected.length;
      const reader = await loadStoredInflationPitSeries(db,{asOf:midpointAsOf,seriesIds:[dataset]});
      const actualRows = Array.isArray(reader?.series?.[dataset]) ? reader.series[dataset] : [];
      midpointActual = actualRows.length;
      midpointReaderStatus = String(reader?.status ?? "");
      midpointLookAheadSafe = reader?.lookAheadSafe === true;
      if (reader?.status !== "READY_STORED_PIT_HISTORY") errors.push(`MIDPOINT_READER_STATUS:${String(reader?.status)}`);
      if (reader?.lookAheadSafe !== true) errors.push("MIDPOINT_LOOKAHEAD_FLAG_FALSE");
      if ((reader?.missing?.length ?? 0) !== 0) errors.push("MIDPOINT_READER_MISSING");
      if ((reader?.issues?.length ?? 0) !== 0) errors.push("MIDPOINT_READER_ISSUES");
      if (actualRows.length !== expected.length) errors.push(`MIDPOINT_COUNT:${actualRows.length}!=${expected.length}`);
      const expectedSig = expected.map(x=>`${x.observationDate}|${x.value}|${x.availableAt}`);
      const actualSig = actualRows.map((x:any)=>`${x.observationDate}|${x.value}|${x.availableAt}`);
      if (JSON.stringify(actualSig) !== JSON.stringify(expectedSig)) errors.push("MIDPOINT_READER_CONTENT_MISMATCH");
      if (actualRows.some((x:any)=>x.observationDate > midpointAsOf! || x.availableAt > midpointAsOf!)) errors.push("MIDPOINT_LOOKAHEAD_ROW_PRESENT");
    }
  }

  return {
    dataset,
    pass: errors.length === 0,
    snapshotCount,
    snapshotSha256: snapshot.snapshot_sha256 ?? null,
    asOf: snapshot.as_of ?? null,
    retrievedAt: snapshot.retrieved_at ?? null,
    rowCount: allRows.length,
    chunkCount: chunkHashes.length,
    firstObservationDate: allRows[0]?.observationDate ?? null,
    latestObservationDate: allRows.at(-1)?.observationDate ?? null,
    firstAvailableAt: allRows.find(row=>validDate(row.availableAt))?.availableAt ?? null,
    latestAvailableAt: [...allRows].reverse().find(row=>validDate(row.availableAt))?.availableAt ?? null,
    midpointAsOf,
    midpointExpected,
    midpointActual,
    midpointReaderStatus,
    midpointLookAheadSafe,
    chunkAudit,
    errors,
    warnings,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.pathname !== ROUTE_PATH) return json({status:"NOT_FOUND",temporary:TEMPORARY},404);
  const auth = await authOrResponse(url);
  if (auth.response) return auth.response;
  const bindings = env as unknown as Bindings;
  if (!bindings.DB || typeof bindings.DB.prepare !== "function") {
    return json({status:"RUNTIME_CONFIGURATION_MISSING",missing:["DB"],providerRequestCount:0,dbWrites:0,temporary:TEMPORARY},503,"ZG_PIT_V_R25.json");
  }

  try {
    const audits = [];
    for (const dataset of INFLATION_PIT_SERIES) audits.push(await validateDataset(bindings.DB,dataset));
    const finalReader = await loadStoredInflationPitSeries(bindings.DB,{asOf:OBSERVATION_END,seriesIds:[...INFLATION_PIT_SERIES]});
    const finalSeriesCount = Object.keys(finalReader?.series ?? {}).length;
    const auditErrors = audits.flatMap((audit:any)=>audit.errors.map((error:string)=>`${audit.dataset}:${error}`));
    const finalErrors: string[] = [];
    if (finalReader?.status !== "READY_STORED_PIT_HISTORY") finalErrors.push(`FINAL_READER_STATUS:${String(finalReader?.status)}`);
    if (finalReader?.lookAheadSafe !== true) finalErrors.push("FINAL_LOOKAHEAD_FLAG_FALSE");
    if ((finalReader?.missing?.length ?? 0) !== 0) finalErrors.push(`FINAL_MISSING:${(finalReader?.missing ?? []).join(",")}`);
    if ((finalReader?.issues?.length ?? 0) !== 0) finalErrors.push(`FINAL_ISSUES:${(finalReader?.issues ?? []).join(",")}`);
    if (finalSeriesCount !== INFLATION_PIT_SERIES.length) finalErrors.push(`FINAL_SERIES_COUNT:${finalSeriesCount}`);
    for (const audit of audits as any[]) {
      const count = Array.isArray(finalReader?.series?.[audit.dataset]) ? finalReader.series[audit.dataset].length : 0;
      if (count !== audit.rowCount) finalErrors.push(`${audit.dataset}:FINAL_READER_COUNT:${count}!=${audit.rowCount}`);
    }
    const errors = [...auditErrors,...finalErrors];
    const pass = errors.length === 0;
    const totalRows = audits.reduce((sum:number,audit:any)=>sum + Number(audit.rowCount ?? 0),0);
    const totalChunks = audits.reduce((sum:number,audit:any)=>sum + Number(audit.chunkCount ?? 0),0);
    return json({
      status: pass ? "PASS_STORED_PIT_VALIDATION" : "FAIL_STORED_PIT_VALIDATION",
      observationEnd: OBSERVATION_END,
      seriesCount: INFLATION_PIT_SERIES.length,
      providerRequestCount: 0,
      networkRequests: 0,
      automaticRetries: 0,
      dbWrites: 0,
      storageSummary: {validatedSeries:audits.filter((x:any)=>x.pass).length,totalRows,totalChunks},
      finalReader: {
        status: finalReader?.status ?? null,
        source: finalReader?.source ?? null,
        asOf: finalReader?.asOf ?? null,
        lookAheadSafe: finalReader?.lookAheadSafe === true,
        missing: finalReader?.missing ?? [],
        issues: finalReader?.issues ?? [],
        seriesCount: finalSeriesCount,
        snapshots: finalReader?.snapshots ?? {},
      },
      seriesAudits: audits,
      errors,
      pitSeries: finalReader?.series ?? {},
      exportPurpose: "INF09_WEIGHT_VALIDATION_INPUT",
      temporary: TEMPORARY,
      next: pass ? "INF09_WEIGHT_VALIDATION_READY" : "REVIEW_STORED_PIT_VALIDATION",
    }, pass ? 200 : 409, "ZG_PIT_V_R25.json");
  } catch (error) {
    return json({
      status:"PIT_VALIDATION_UNHANDLED_ERROR",
      providerRequestCount:0,
      networkRequests:0,
      automaticRetries:0,
      dbWrites:0,
      error:error instanceof Error ? error.message : "UNKNOWN",
      temporary:TEMPORARY,
      next:"REVIEW_STORED_PIT_VALIDATION",
    },500,"ZG_PIT_V_R25.json");
  }
}
