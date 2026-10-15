const ENDPOINTS = [
  { id: "sp500Constituents", url: "https://financialmodelingprep.com/stable/sp500-constituent" },
  { id: "earningsSurprisesBulk", url: "https://financialmodelingprep.com/stable/earnings-surprises-bulk?year=2026" },
  { id: "eodBulk", url: "https://financialmodelingprep.com/stable/eod-bulk?date=2026-09-18" },
];

function classify(status, text, parsed) {
  const s = String(text || "").toLowerCase();
  if (s.includes("invalid api key") || s.includes("invalid api") || s.includes("api key is invalid")) return "KEY_REJECTED";
  if (s.includes("upgrade") || s.includes("premium") || s.includes("subscription") || s.includes("restricted endpoint") || s.includes("not available under your current subscription")) return "PLAN_RESTRICTED";
  if (status >= 200 && status < 300 && Array.isArray(parsed)) return "AVAILABLE";
  if (status >= 200 && status < 300) return "SCHEMA_UNEXPECTED";
  return "HTTP_ERROR";
}

async function requestOne(endpoint, apiKey, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const sep = endpoint.url.includes("?") ? "&" : "?";
    const res = await fetchImpl(endpoint.url + sep + "apikey=" + encodeURIComponent(apiKey), {
      method: "GET", redirect: "follow", signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}
    return {
      id: endpoint.id,
      httpStatus: res.status,
      access: classify(res.status, text, parsed),
      rowCount: Array.isArray(parsed) ? parsed.length : null,
      sampleKeys: Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object" ? Object.keys(parsed[0]).slice(0,20) : [],
    };
  } catch (e) {
    return { id:endpoint.id, httpStatus:null, access:e?.name==="AbortError"?"TIMEOUT":"TRANSPORT_ERROR", rowCount:null, sampleKeys:[] };
  } finally { clearTimeout(timer); }
}

/** @param {{apiKey?:string|null,fetchImpl?:typeof fetch,timeoutMs?:number}} [options] */
export async function runFmpRuntimeProbe({ apiKey, fetchImpl=fetch, timeoutMs=8000 }={}) {
  if (!apiKey || typeof apiKey !== "string") return {
    status:"SECRET_MISSING", secretPresent:false, keyAccepted:false, providerRequestCount:0, endpoints:[], scope:"AUTH_AND_ENDPOINT_ACCESS_ONLY"
  };
  const endpoints=[];
  let providerRequestCount=0;
  for(const endpoint of ENDPOINTS){
    providerRequestCount += 1;
    endpoints.push(await requestOne(endpoint, apiKey, fetchImpl, timeoutMs));
  }
  const rejected=endpoints.some(x=>x.access==="KEY_REJECTED");
  const accepted=endpoints.some(x=>x.access==="AVAILABLE"||x.access==="PLAN_RESTRICTED");
  return {
    status:(!rejected&&accepted)?"SUCCESS":"FAILED",
    secretPresent:true,
    keyAccepted:!rejected&&accepted,
    providerRequestCount,
    endpoints,
    scope:"AUTH_AND_ENDPOINT_ACCESS_ONLY"
  };
}
