import https from "node:https";

export const BREADTH_R2_PROVIDER_CLIENT_VERSION = "BREADTH-R2-PROVIDER-CANDIDATE-R57";

export const CFTC_TFF_DATASET_ID = "gpe5-46if";
export const CFTC_REQUIRED_CONTRACT_CODES = Object.freeze([
  "13874A",
  "209742",
  "124603",
  "33874A",
]);

const BEA_ENDPOINT = "https://apps.bea.gov/api/data";
const SEC_FRAME_BASE = "https://data.sec.gov/api/xbrl/frames";
const CFTC_ENDPOINT = `https://publicreporting.cftc.gov/resource/${CFTC_TFF_DATASET_ID}.json`;

function cleanText(value) {
  return value == null ? "" : String(value).trim();
}

function parseJsonBody(body) {
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body;
  const text = Buffer.isBuffer(body) ? body.toString("utf8") : String(body ?? "");
  return JSON.parse(text);
}

function sanitizeUrl(url) {
  const u = new URL(url);
  for (const key of [...u.searchParams.keys()]) {
    if (/userid|api.?key|token|secret|password|authorization/i.test(key)) {
      u.searchParams.set(key, "REDACTED");
    }
  }
  return u.toString();
}

export function defaultJsonRequest(url, {
  timeoutMs = 30_000,
  userAgent = "ZGMINI-Research/1.0 (https://zgmini.kr)",
} = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(u, {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        "Accept": "application/json,text/plain,*/*",
        "Connection": "close",
      },
    }, res => {
      const chunks = [];
      let bytes = 0;

      res.on("data", chunk => {
        bytes += chunk.length;
        if (bytes > 30_000_000) {
          req.destroy(new Error("BREADTH_R2_PROVIDER_MAX_BYTES"));
          return;
        }
        chunks.push(chunk);
      });

      res.on("end", () => {
        const body = Buffer.concat(chunks);
        resolve({
          status: res.statusCode || 0,
          contentType: res.headers["content-type"] || null,
          body,
          bytes,
        });
      });
    });

    req.setTimeout(timeoutMs, () => req.destroy(new Error("BREADTH_R2_PROVIDER_TIMEOUT")));
    req.on("error", reject);
    req.end();
  });
}

function assertHttpJson(response, sourceId) {
  if (!response || response.status !== 200) {
    throw new Error(`${sourceId}_HTTP_${response?.status ?? "NO_STATUS"}`);
  }
  try {
    return parseJsonBody(response.body);
  } catch {
    throw new Error(`${sourceId}_JSON_INVALID`);
  }
}

function beaErrors(obj) {
  const results = obj?.BEAAPI?.Results;
  if (!results) return [];
  const errors = results.Error;
  if (!errors) return [];
  return Array.isArray(errors) ? errors : [errors];
}

export function buildBeaForeignPortfolioUrl({
  userId,
  year = "All",
  frequency = "QNSA",
} = {}) {
  const secret = cleanText(userId);
  if (!secret) throw new Error("BEA_USERID_REQUIRED");

  const u = new URL(BEA_ENDPOINT);
  u.searchParams.set("UserID", secret);
  u.searchParams.set("method", "GetData");
  u.searchParams.set("DataSetName", "ITA");
  u.searchParams.set("Indicator", "EquityAndInvFundSharesLiabs");
  u.searchParams.set("AreaOrCountry", "AllCountries");
  u.searchParams.set("Frequency", frequency);
  u.searchParams.set("Year", year);
  u.searchParams.set("ResultFormat", "JSON");
  return u.toString();
}

export async function fetchBeaForeignPortfolio({
  userId,
  year = "All",
  frequency = "QNSA",
  requestJson = defaultJsonRequest,
} = {}) {
  const requestUrl = buildBeaForeignPortfolioUrl({ userId, year, frequency });
  const response = await requestJson(requestUrl);
  const body = assertHttpJson(response, "BEA_ITA");
  const errors = beaErrors(body);

  if (errors.length) {
    throw new Error("BEA_ITA_API_ERROR");
  }

  const data = body?.BEAAPI?.Results?.Data;
  const rows = Array.isArray(data) ? data : data ? [data] : [];

  return {
    source: "BEA_ITA",
    dataset: "ITA",
    indicator: "EquityAndInvFundSharesLiabs",
    frequency,
    year,
    request: sanitizeUrl(requestUrl),
    rows,
  };
}

export function buildSecShareFrameUrl({ year, quarter } = {}) {
  if (!Number.isInteger(year) || year < 2009 || year > 2100) {
    throw new Error("SEC_YEAR_INVALID");
  }
  if (![1, 2, 3, 4].includes(quarter)) {
    throw new Error("SEC_QUARTER_INVALID");
  }

  return `${SEC_FRAME_BASE}/us-gaap/WeightedAverageNumberOfSharesOutstandingBasic/shares/CY${year}Q${quarter}.json`;
}

export async function fetchSecShareFrame({
  year,
  quarter,
  requestJson = defaultJsonRequest,
} = {}) {
  const requestUrl = buildSecShareFrameUrl({ year, quarter });
  const response = await requestJson(requestUrl);
  const body = assertHttpJson(response, "SEC_FRAME");

  if (body?.tag !== "WeightedAverageNumberOfSharesOutstandingBasic") {
    throw new Error("SEC_FRAME_TAG_MISMATCH");
  }
  if (!Array.isArray(body?.data)) {
    throw new Error("SEC_FRAME_DATA_INVALID");
  }

  return {
    source: "SEC_XBRL_FRAME",
    taxonomy: body.taxonomy ?? "us-gaap",
    tag: body.tag,
    unit: body.uom ?? "shares",
    frame: body.ccp ?? `CY${year}Q${quarter}`,
    request: requestUrl,
    data: body.data,
  };
}

export function buildCftcTffUrl({
  limit = 500,
  offset = 0,
  order = "report_date_as_yyyy_mm_dd DESC",
} = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50_000) {
    throw new Error("CFTC_LIMIT_INVALID");
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error("CFTC_OFFSET_INVALID");
  }

  const codes = CFTC_REQUIRED_CONTRACT_CODES.map(code => `'${code}'`).join(",");
  const fields = [
    "report_date_as_yyyy_mm_dd",
    "cftc_contract_market_code",
    "open_interest_all",
    "asset_mgr_positions_long",
    "asset_mgr_positions_short",
    "lev_money_positions_long",
    "lev_money_positions_short",
  ].join(",");

  const u = new URL(CFTC_ENDPOINT);
  u.searchParams.set("$select", fields);
  u.searchParams.set("$where", `cftc_contract_market_code in(${codes})`);
  u.searchParams.set("$order", order);
  u.searchParams.set("$limit", String(limit));
  u.searchParams.set("$offset", String(offset));
  return u.toString();
}

export async function fetchCftcTff({
  limit = 500,
  offset = 0,
  order = "report_date_as_yyyy_mm_dd DESC",
  requestJson = defaultJsonRequest,
} = {}) {
  const requestUrl = buildCftcTffUrl({ limit, offset, order });
  const response = await requestJson(requestUrl);
  const body = assertHttpJson(response, "CFTC_TFF");

  if (!Array.isArray(body)) {
    throw new Error("CFTC_TFF_DATA_INVALID");
  }

  return {
    source: "CFTC_TFF_FUTURES_ONLY",
    datasetId: CFTC_TFF_DATASET_ID,
    request: requestUrl,
    rows: body,
  };
}

export function buildBreadthR2ProviderRequestPlan({
  beaUserIdPresent = false,
  secPrevious,
  secCurrent,
  cftcLimit = 500,
} = {}) {
  return {
    version: BREADTH_R2_PROVIDER_CLIENT_VERSION,
    bea: {
      enabled: Boolean(beaUserIdPresent),
      secretRequired: true,
      indicator: "EquityAndInvFundSharesLiabs",
      requestUrlStoredWithSecret: false,
    },
    sec: {
      previous: secPrevious ?? null,
      current: secCurrent ?? null,
      maxRequestsPerSecondContract: 10,
    },
    cftc: {
      datasetId: CFTC_TFF_DATASET_ID,
      requiredContracts: [...CFTC_REQUIRED_CONTRACT_CODES],
      limit: cftcLimit,
    },
    productionWired: false,
  };
}
