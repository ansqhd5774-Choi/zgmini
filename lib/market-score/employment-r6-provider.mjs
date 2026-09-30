
import {
  EMPLOYMENT_R6_BLS_SERIES,
  EMPLOYMENT_R6_GROUPS,
  EMPLOYMENT_R6_PROVIDER_REVISION,
} from "./employment-r6-contract.mjs";
import {
  EMPLOYMENT_R4_PIT_CLASSES,
  EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION,
} from "./employment-r4-shadow-contract.mjs";
import {
  BLS_PUBLIC_API_URL,
  DOL_ETA539_URL,
  parseEta539ShadowRows,
} from "./employment-r4-shadow-provider.mjs";
import {
  BLS_BED_PUBLIC_API_URL,
  EMPLOYMENT_R4_BED_SERIES_IDS,
  parseBlsBedShadowRows,
} from "./employment-r4-bed-provider.mjs";

export const DOL_NATIONAL_CLAIMS_URL = "https://oui.doleta.gov/unemploy/wkclaims/report.asp";

const finite = value => typeof value === "number" && Number.isFinite(value);

function stable(value) {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
async function sha256Hex(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
}
function asIso(value, label) {
  const out = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (!Number.isFinite(Date.parse(out))) throw new TypeError(`${label}_INVALID`);
  return out;
}
function monthEnd(year, period) {
  const m = Number(String(period ?? "").replace(/^M/, ""));
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  return new Date(Date.UTC(Number(year), m, 0)).toISOString().slice(0, 10);
}
function quarterEnd(year, period) {
  const q = Number(String(period ?? "").replace(/^Q0?/, ""));
  if (!Number.isInteger(q) || q < 1 || q > 4) return null;
  return new Date(Date.UTC(Number(year), q * 3, 0)).toISOString().slice(0, 10);
}
function observationDate(year, period) {
  const p = String(period ?? "");
  if (/^M\d{2}$/.test(p)) return monthEnd(year, p);
  if (/^Q0?[1-4]$/.test(p)) return quarterEnd(year, p);
  return null;
}
function chunk(values, size = 25) {
  const out = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}
function errorWithCode(code, message = code) {
  const error = new Error(message);
  error.code = code;
  return error;
}
function numberText(text) {
  const n = Number(String(text ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}
function blockText(block, tag) {
  const m = String(block).match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1] : null;
}
function tagText(block, tag) {
  const m = String(block).match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : null;
}
function parseUsDate(value) {
  const m = String(value ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2]))).toISOString().slice(0, 10);
}
function footnoteRevision(item) {
  const codes = (item?.footnotes ?? []).map(x => String(x?.code ?? "").trim()).filter(Boolean);
  return codes.length ? `BLS:${codes.sort().join("+")}` : null;
}

export function planBlsYearWindows({ mode = "RELEASE", currentYear = new Date().getUTCFullYear() } = {}) {
  const y = Number(currentYear);
  if (!Number.isInteger(y) || y < 2000) throw new TypeError("CURRENT_YEAR_INVALID");
  if (mode === "BACKFILL") {
    return Object.freeze([
      Object.freeze({ startyear: String(y - 10), endyear: String(y - 1) }),
      Object.freeze({ startyear: String(y), endyear: String(y) }),
    ]);
  }
  return Object.freeze([
    Object.freeze({ startyear: String(y - 1), endyear: String(y) }),
  ]);
}

export function expectedBlsCallsForGroup(groupName, { mode = "RELEASE" } = {}) {
  const g = EMPLOYMENT_R6_GROUPS[groupName];
  if (!g) throw new Error(`GROUP_UNKNOWN:${groupName}`);
  const windows = mode === "BACKFILL" ? 2 : 1;
  if (g.kind === "BED") return Math.ceil(EMPLOYMENT_R4_BED_SERIES_IDS.length / 25) * windows;
  if (g.kind === "BLS") return Math.ceil((g.seriesIds?.length ?? 0) / 25) * windows;
  return 0;
}

export function parseBlsR6Rows(payload, {
  releaseGroup,
  retrievedAt,
  releaseAt = null,
  requestedSeriesIds = null,
} = {}) {
  const rt = asIso(retrievedAt, "RETRIEVED_AT");
  const group = String(releaseGroup ?? "");
  if (!EMPLOYMENT_R6_GROUPS[group]) throw new Error(`GROUP_UNKNOWN:${group}`);
  const requested = new Set((requestedSeriesIds ?? EMPLOYMENT_R6_GROUPS[group].seriesIds ?? []).map(String));
  const rows = [];
  const returned = new Set();
  const series = Array.isArray(payload?.Results?.series) ? payload.Results.series : [];

  for (const s of series) {
    const id = String(s?.seriesID ?? "");
    const meta = EMPLOYMENT_R6_BLS_SERIES[id];
    if (!meta || !requested.has(id)) continue;
    returned.add(id);

    const data = (s?.data ?? [])
      .map(item => ({ ...item, value: Number(item?.value), observationDate: observationDate(item?.year, item?.period) }))
      .filter(item => item.observationDate && finite(item.value))
      .sort((a, b) => a.observationDate.localeCompare(b.observationDate));

    const latest = data.at(-1)?.observationDate ?? null;
    for (const item of data) {
      const isLatest = item.observationDate === latest;
      const canonical = JSON.stringify(stable({
        seriesID: id,
        year: item.year,
        period: item.period,
        value: item.value,
        footnotes: item.footnotes ?? [],
      }));
      rows.push({
        logicalSeriesId: meta.logicalSeriesId,
        provider: meta.provider,
        providerSeriesId: id,
        geographyType: meta.geographyType,
        geographyCode: meta.geographyCode,
        frequency: meta.frequency,
        unit: meta.unit,
        seasonalAdjustment: meta.seasonalAdjustment,
        populationCoverage: meta.populationCoverage,
        observationDate: item.observationDate,
        releaseDate: isLatest && releaseAt ? asIso(releaseAt, "RELEASE_AT") : null,
        availableAt: isLatest ? rt : null,
        retrievedAt: rt,
        value: item.value,
        sourceRevision: footnoteRevision(item),
        sourceHash: null,
        qualityStatus: isLatest ? "READY_FORWARD" : "READY_CURRENT_VINTAGE",
        pitClass: isLatest ? EMPLOYMENT_R4_PIT_CLASSES.forwardObserved : EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentVintage,
        schemaVersion: EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION,
        provenance: {
          releaseGroup: group,
          seriesID: id,
          observationPeriod: `${item.year}-${item.period}`,
          footnotes: item.footnotes ?? [],
        },
        _canonical: canonical,
      });
    }
  }

  return {
    rows,
    returnedSeries: [...returned].sort(),
    missingSeries: [...requested].filter(id => !returned.has(id)).sort(),
  };
}

async function finalizeBlsRowHashes(rows, responseHash) {
  const out = [];
  for (const row of rows) {
    const { _canonical, ...clean } = row;
    out.push({
      ...clean,
      sourceHash: await sha256Hex(_canonical),
      provenance: {
        ...(clean.provenance ?? {}),
        responseHash,
        rawRecordHash: await sha256Hex(_canonical),
      },
    });
  }
  return out;
}

export function parseDolNationalClaimsXml(xmlText, {
  retrievedAt,
  releaseAt = null,
} = {}) {
  const rt = asIso(retrievedAt, "RETRIEVED_AT");
  const blocks = [...String(xmlText).matchAll(/<week>([\s\S]*?)<\/week>/gi)].map(m => m[1]);
  const parsed = [];
  for (const block of blocks) {
    const date = parseUsDate(tagText(block, "weekEnded"));
    if (!date) continue;
    const ic = blockText(block, "InitialClaims");
    const cc = blockText(block, "ContinuedClaims");
    const iur = blockText(block, "IUR");
    const values = [
      ["INITIAL_CLAIMS", "DOL:UI:InitialClaims:SA", numberText(tagText(ic, "SA")), "CLAIMS_COUNT"],
      ["INITIAL_CLAIMS_4W", "DOL:UI:InitialClaims:SA4WK", numberText(tagText(ic, "SA4WK")), "CLAIMS_COUNT"],
      ["CONTINUED_CLAIMS", "DOL:UI:ContinuedClaims:SA", numberText(tagText(cc, "SA")), "CLAIMS_COUNT"],
      ["INSURED_UNEMPLOYMENT_RATE", "DOL:UI:IUR:SA", numberText(tagText(iur, "SA")), "PERCENT"],
    ];
    for (const [logicalSeriesId, providerSeriesId, value, unit] of values) {
      if (!finite(value)) continue;
      parsed.push({ date, logicalSeriesId, providerSeriesId, value, unit });
    }
  }
  const latestDate = parsed.map(x => x.date).sort().at(-1) ?? null;
  return parsed.map(item => {
    const canonical = JSON.stringify(stable(item));
    const isLatest = item.date === latestDate;
    return {
      logicalSeriesId: item.logicalSeriesId,
      provider: "DOL_ETA",
      providerSeriesId: item.providerSeriesId,
      geographyType: "NATIONAL",
      geographyCode: "US",
      frequency: "WEEKLY",
      unit: item.unit,
      seasonalAdjustment: "SA",
      populationCoverage: "UI_CLAIMS_NATIONAL",
      observationDate: item.date,
      releaseDate: isLatest && releaseAt ? asIso(releaseAt, "RELEASE_AT") : null,
      availableAt: isLatest ? rt : null,
      retrievedAt: rt,
      value: item.value,
      sourceRevision: null,
      sourceHash: null,
      qualityStatus: isLatest ? "READY_FORWARD" : "READY_CURRENT_OR_REVISED",
      pitClass: isLatest ? EMPLOYMENT_R4_PIT_CLASSES.forwardObserved : EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentOrRevised,
      schemaVersion: EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION,
      provenance: {
        sourceUrl: DOL_NATIONAL_CLAIMS_URL,
        xmlPath: item.providerSeriesId.replace("DOL:UI:", "week/").replace(/:/g, "/"),
      },
      _canonical: canonical,
    };
  });
}

async function finalizeDolRowHashes(rows, responseHash) {
  const out = [];
  for (const row of rows) {
    const { _canonical, ...clean } = row;
    out.push({
      ...clean,
      sourceHash: await sha256Hex(_canonical),
      provenance: { ...(clean.provenance ?? {}), responseHash, rawRecordHash: await sha256Hex(_canonical) },
    });
  }
  return out;
}

async function fetchText(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, options);
  const body = await response.text();
  if (!response?.ok) throw errorWithCode(`HTTP_${response?.status ?? "ERR"}`, `${url}:HTTP_${response?.status ?? "ERR"}`);
  return {
    response,
    body,
    status: Number(response.status ?? 200),
    contentType: response.headers?.get?.("content-type") ?? null,
  };
}

export function createEmploymentR6Provider({
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("FETCH_REQUIRED");

  async function fetchBlsGroup(groupName, {
    mode = "RELEASE",
    releaseAt = null,
    currentYear = Number(now().toISOString().slice(0, 4)),
  } = {}) {
    const group = EMPLOYMENT_R6_GROUPS[groupName];
    if (!group || group.kind !== "BLS") throw new Error(`BLS_GROUP_INVALID:${groupName}`);
    const windows = planBlsYearWindows({ mode, currentYear });
    const batches = chunk(group.seriesIds, 25);
    const rows = [], snapshots = [], missing = new Set();
    let requestCount = 0;

    try {
      for (const window of windows) {
        for (let i = 0; i < batches.length; i++) {
          const seriesid = batches[i];
          const retrievedAt = now().toISOString();
          const requestBody = JSON.stringify({ seriesid, startyear: window.startyear, endyear: window.endyear });
          requestCount++;
          const { body, status, contentType } = await fetchText(fetchImpl, BLS_PUBLIC_API_URL, {
            method: "POST",
            headers: { "content-type": "application/json", "user-agent": "ZGMINI-R6-Employment/1.0" },
            body: requestBody,
          });
          let payload;
          try { payload = JSON.parse(body); } catch { throw errorWithCode("BLS_JSON_INVALID"); }
          if (payload?.status !== "REQUEST_SUCCEEDED") {
            const code = payload?.status === "REQUEST_NOT_PROCESSED" ? "BLS_REQUEST_NOT_PROCESSED" : `BLS_${payload?.status ?? "FAILED"}`;
            throw errorWithCode(code, `${code}:${(payload?.message ?? []).join("|")}`);
          }
          const responseHash = await sha256Hex(body);
          const parsed = parseBlsR6Rows(payload, { releaseGroup: groupName, retrievedAt, releaseAt, requestedSeriesIds: seriesid });
          rows.push(...await finalizeBlsRowHashes(parsed.rows, responseHash));
          parsed.missingSeries.forEach(id => missing.add(id));
          snapshots.push({
            releaseGroup: groupName,
            provider: "BLS",
            requestKey: `${groupName}:${window.startyear}-${window.endyear}:batch-${i + 1}`,
            releaseAt,
            retrievedAt,
            httpStatus: status,
            contentType,
            body,
            detail: { seriesid, window, responseHash },
          });
        }
      }
      return { rows, snapshots, requestCount, missingSeries: [...missing].sort() };
    } catch (error) {
      error.requestCount = requestCount;
      throw error;
    }
  }

  async function fetchDolClaims({
    mode = "RELEASE",
    releaseAt = null,
    currentYear = Number(now().toISOString().slice(0, 4)),
  } = {}) {
    const startYear = mode === "BACKFILL" ? currentYear - 10 : currentYear - 1;
    const endYear = currentYear;
    let requestCount = 0;
    try {
      const retrievedAtNational = now().toISOString();
      const params = new URLSearchParams({
        level: "us",
        final_yr: String(currentYear),
        strtdate: String(startYear),
        enddate: String(endYear),
        filetype: "xml",
        submit: "Submit",
      });
      requestCount++;
      const national = await fetchText(fetchImpl, DOL_NATIONAL_CLAIMS_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "ZGMINI-R6-Employment/1.0" },
        body: params.toString(),
      });
      const nationalHash = await sha256Hex(national.body);
      let nationalRows = parseDolNationalClaimsXml(national.body, { retrievedAt: retrievedAtNational, releaseAt });
      nationalRows = await finalizeDolRowHashes(nationalRows, nationalHash);

      const retrievedAtState = now().toISOString();
      requestCount++;
      const state = await fetchText(fetchImpl, DOL_ETA539_URL, {
        headers: { "user-agent": "ZGMINI-R6-Employment/1.0" },
      });
      const historyWeeks = mode === "BACKFILL" ? 530 : 60;
      const parsedState = await parseEta539ShadowRows(state.body, { retrievedAt: retrievedAtState, historyWeeks });
      const stateHash = await sha256Hex(state.body);

      return {
        rows: [...nationalRows, ...(parsedState.rows ?? [])],
        snapshots: [
          {
            releaseGroup: "DOL_UI_WEEKLY_CLAIMS",
            provider: "DOL_ETA",
            requestKey: `DOL_NATIONAL:${startYear}-${endYear}`,
            releaseAt,
            retrievedAt: retrievedAtNational,
            httpStatus: national.status,
            contentType: national.contentType,
            body: national.body,
            detail: { responseHash: nationalHash, mode },
          },
          {
            releaseGroup: "DOL_UI_WEEKLY_CLAIMS",
            provider: "DOL_ETA",
            requestKey: `DOL_ETA539:${historyWeeks}w`,
            releaseAt,
            retrievedAt: retrievedAtState,
            httpStatus: state.status,
            contentType: state.contentType,
            body: state.body,
            detail: { responseHash: stateHash, mode, historyWeeks, parserMeta: parsedState.meta ?? null },
          },
        ],
        requestCount,
        missingSeries: [],
      };
    } catch (error) {
      error.requestCount = requestCount;
      throw error;
    }
  }

  async function fetchBed({
    mode = "RELEASE",
    releaseAt = null,
    currentYear = Number(now().toISOString().slice(0, 4)),
  } = {}) {
    const windows = planBlsYearWindows({ mode, currentYear });
    const batches = chunk(EMPLOYMENT_R4_BED_SERIES_IDS, 25);
    const rows = [], snapshots = [], missing = new Set();
    let requestCount = 0;

    try {
      for (const window of windows) {
        for (let i = 0; i < batches.length; i++) {
          const seriesid = batches[i];
          const retrievedAt = now().toISOString();
          const requestBody = JSON.stringify({ seriesid, startyear: window.startyear, endyear: window.endyear });
          requestCount++;
          const { body, status, contentType } = await fetchText(fetchImpl, BLS_BED_PUBLIC_API_URL, {
            method: "POST",
            headers: { "content-type": "application/json", "user-agent": "ZGMINI-R6-Employment/1.0" },
            body: requestBody,
          });
          let payload;
          try { payload = JSON.parse(body); } catch { throw errorWithCode("BLS_BED_JSON_INVALID"); }
          if (payload?.status !== "REQUEST_SUCCEEDED") {
            const code = payload?.status === "REQUEST_NOT_PROCESSED" ? "BLS_REQUEST_NOT_PROCESSED" : `BLS_BED_${payload?.status ?? "FAILED"}`;
            throw errorWithCode(code, `${code}:${(payload?.message ?? []).join("|")}`);
          }
          const parsed = await parseBlsBedShadowRows(payload, { retrievedAt, requestedSeriesIds: seriesid });
          rows.push(...parsed.rows.map(row => {
            const latest = row.availableAt != null;
            return {
              ...row,
              releaseDate: latest && releaseAt ? asIso(releaseAt, "RELEASE_AT") : row.releaseDate,
            };
          }));
          (parsed.meta?.missingSeries ?? []).forEach(id => missing.add(id));
          snapshots.push({
            releaseGroup: "BLS_BED",
            provider: "BLS_BED",
            requestKey: `BLS_BED:${window.startyear}-${window.endyear}:batch-${i + 1}`,
            releaseAt,
            retrievedAt,
            httpStatus: status,
            contentType,
            body,
            detail: { seriesid, window, responseHash: parsed.meta?.responseHash ?? null },
          });
        }
      }
      return { rows, snapshots, requestCount, missingSeries: [...missing].sort() };
    } catch (error) {
      error.requestCount = requestCount;
      throw error;
    }
  }

  async function fetchGroup(groupName, options = {}) {
    if (groupName === "DOL_UI_WEEKLY_CLAIMS") return await fetchDolClaims(options);
    if (groupName === "BLS_BED") return await fetchBed(options);
    return await fetchBlsGroup(groupName, options);
  }

  return { fetchGroup, fetchBlsGroup, fetchDolClaims, fetchBed };
}

export const EMPLOYMENT_R6_PROVIDER_CONTRACT = Object.freeze({
  revision: EMPLOYMENT_R6_PROVIDER_REVISION,
  storeOnly: true,
  scoreComputed: false,
  publicOutput: false,
  initialBackfillBlsCalls: 18,
  initialBackfillDolCalls: 2,
  initialBackfillTotalCalls: 20,
  blsPublicationLagRespectedByScheduler: true,
});
