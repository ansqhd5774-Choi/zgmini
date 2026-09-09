// PHASE 1 diagnostics only. Never expose secrets or upstream payloads.
const result = (provider, base) => ({provider, requestAttempted:false, secretPresent:false, authSuccess:false, httpStatus:null, responseReceived:false, observationDate:null, unit:null, recordCount:0, historyAvailable:false, nullOrMissing:null, errorType:null, endpointConfigured:Boolean(base)});
let lastRunAt = 0;

async function check(provider, key, url, parse) {
  const out = result(provider, url);
  out.secretPresent = typeof key === 'string' && key.trim().length > 0;
  if (!out.secretPresent || !url) { out.errorType = out.secretPresent ? 'ENDPOINT_NOT_CONFIGURED' : 'SECRET_MISSING'; return out; }
  out.requestAttempted = true;
  try {
    const response = await fetch(url, {redirect:'manual', signal:AbortSignal.timeout(12000), headers:{accept:'application/json, application/xml'}});
    out.httpStatus = response.status; out.responseReceived = response.status >= 200 && response.status < 300;
    const body = await response.text();
    if (!out.responseReceived) { out.errorType = response.status === 401 || response.status === 403 ? 'AUTHENTICATION_REJECTED' : response.status === 429 ? 'RATE_LIMITED' : 'HTTP_ERROR'; return out; }
    const parsed = parse(body, response.headers.get('content-type') ?? '');
    out.authSuccess = parsed.authSuccess; out.observationDate = parsed.observationDate; out.unit = parsed.unit; out.recordCount = parsed.recordCount; out.historyAvailable = parsed.historyAvailable; out.nullOrMissing = parsed.nullOrMissing; out.errorType = parsed.errorType ?? null;
  } catch { out.errorType = 'NETWORK_OR_TIMEOUT'; }
  return out;
}

function jsonParse(body) { try { return JSON.parse(body); } catch { return null; } }
function genericParse(body, contentType) {
  const json = contentType.includes('json') ? jsonParse(body) : null;
  const text = body.toLowerCase();
  const authSuccess = Boolean(json) && !/(error|invalid|denied|unauthorized|fail)/.test(text);
  const rows = json?.StatisticSearch?.row ?? json?.row ?? json?.data ?? json?.RESULT?.result ?? json?.response?.body?.items?.item ?? json?.body?.items?.item ?? [];
  const list = Array.isArray(rows) ? rows : rows && typeof rows === 'object' ? [rows] : [];
  return {authSuccess, observationDate:list.at(-1)?.TIME ?? list.at(-1)?.PRD_DE ?? list.at(-1)?.date ?? list.at(-1)?.basDt ?? null, unit:list.at(-1)?.UNIT_NAME ?? list.at(-1)?.unit ?? null, recordCount:list.length, historyAvailable:list.length>1, nullOrMissing:list.some(x=>Object.values(x??{}).some(v=>v===null||v===''||v==='.' )), errorType:json?null: 'NON_JSON_RESPONSE'};
}

export async function phase1KoreaDataCheck(request, env) {
  const headers={'Cache-Control':'private, max-age=15','X-Robots-Tag':'noindex, nofollow','Content-Type':'application/json; charset=utf-8'};
  if (request.method !== 'GET') return new Response(null,{status:405,headers:{...headers,Allow:'GET'}});
  if (Date.now() - lastRunAt < 10000) return Response.json({schemaVersion:1,diagnosticOnly:true,errorType:'RATE_LIMITED'},{status:429,headers:{...headers,'Retry-After':'10'}});
  lastRunAt = Date.now();
  // Official discovery endpoints are fixed server configuration. Only API keys
  // come from Hosted Secrets; endpoint URLs never come from user input/env.
  const kosisUrl = `https://kosis.kr/openapi/statisticsSearch.do?method=getList&apiKey=${encodeURIComponent(env.KOSIS_API_KEY??'')}&searchNm=${encodeURIComponent('투자심리')}&sort=DATE&startCount=1&resultCount=1&format=json`;
  const bokUrl = `https://ecos.bok.or.kr/api/StatisticTableList/${encodeURIComponent(env.BOK_API_KEY??'')}/json/kr/1/1/`;
  // The FSC catalog confirms the dataset and its eight operations, but the
  // operation URL is not exposed without the portal's generated guide. Do not
  // guess a path or issue a misleading request.
  const fscUrl = `https://apis.data.go.kr/1160100/service/GetKofiaStatisticsInfoService/getGrantingOfCreditBalanceInfo?serviceKey=${encodeURIComponent(env.FSC_API_KEY??'')}&numOfRows=1&pageNo=1&resultType=json`;
  const [fsc,kosis,bok] = await Promise.all([check('FSC',env.FSC_API_KEY,fscUrl,genericParse),check('KOSIS',env.KOSIS_API_KEY,kosisUrl,genericParse),check('BOK',env.BOK_API_KEY,bokUrl,genericParse)]);
  return Response.json({schemaVersion:1,diagnosticOnly:true,fsc,kosis,bok},{headers});
}
