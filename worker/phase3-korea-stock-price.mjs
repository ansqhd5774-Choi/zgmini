// PHASE 3A technical probe. Research only; expires 30 days after rollout.
export const PHASE3_POLICY=Object.freeze({
  expiresAt:'2026-10-11T00:00:00Z', maxPages:5, maxRows:5000, cacheMs:900000,
  operation:'getStockPriceInfo', officialUrl:'https://www.data.go.kr/data/15094808/openapi.do'
});
const keyFields=['basDt','srtnCd','isinCd','itmsNm','mrktCtg','clpr','vs','fltRt','mkp','hipr','lopr','trqu','trPrc','lstgStCnt','mrktTotAmt'];
const asRows=j=>{const item=j?.response?.body?.items?.item; return Array.isArray(item)?item:item&&typeof item==='object'?[item]:[];};
export function parseStockPricePage(json){
  const header=json?.response?.header, body=json?.response?.body;
  if(String(header?.resultCode)!=='00') return {ok:false,errorType:'API_ERROR',apiErrorCode:header?.resultCode??null,rows:[],totalCount:null};
  const total=Number(body?.totalCount); if(!Number.isSafeInteger(total)||total<0) return {ok:false,errorType:'SCHEMA_ERROR',rows:[],totalCount:null};
  const rows=asRows(json); if(rows.some(r=>!r||typeof r!=='object'||Array.isArray(r))) return {ok:false,errorType:'SCHEMA_ERROR',rows:[],totalCount:total};
  return {ok:true,rows,totalCount:total};
}
const fieldQuality=(rows,key)=>{let present=0,missing=0,blank=0,numeric=0,nonNumeric=0;for(const row of rows){if(!(key in row)||row[key]===null){missing++;continue;}present++;if(String(row[key]).trim()===''){blank++;continue;}if(Number.isFinite(Number(String(row[key]).replaceAll(',',''))))numeric++;else nonNumeric++;}return {presentCount:present,missingCount:missing,blankCount:blank,numericCount:numeric,nonNumericCount:nonNumeric};};
export function summarizeStockRows(rows){
  const dates=[...new Set(rows.map(r=>String(r.basDt??'').trim()).filter(Boolean))].sort();
  const markets=[...new Set(rows.map(r=>String(r.mrktCtg??'').trim()).filter(Boolean))];
  const counts=Object.fromEntries(markets.map(m=>[m,rows.filter(r=>String(r.mrktCtg).trim()===m).length]));
  const ids=rows.map(r=>String(r.srtnCd??r.isinCd??'').trim()).filter(Boolean); const unique=new Set(ids);
  return {rowsReceived:rows.length,uniqueSecurityCount:unique.size,duplicateSecurityCount:ids.length-unique.size,invalidDateCount:rows.filter(r=>!/^[0-9]{8}$/.test(String(r.basDt??''))).length,latestObservationDate:dates.at(-1)??null,marketCategories:markets,countByMarket:counts,actualKeys:[...new Set(rows.flatMap(r=>Object.keys(r)))].filter(k=>keyFields.includes(k)),fieldQuality:Object.fromEntries(keyFields.map(k=>[k,fieldQuality(rows,k)]))};
}
export function createPhase3Handler(context={}){return async function phase3KoreaStockPriceCheck(request,env={}){
  if(request.method!=='GET') return Response.json({error:'METHOD_NOT_ALLOWED'},{status:405});
  if(Date.now()>=Date.parse(PHASE3_POLICY.expiresAt)) return Response.json({error:'EXPIRED'},{status:410});
  if(!env.FSC_API_KEY) return Response.json({researchOnly:true,status:'BLOCKED',secret:{fscApiKeyPresent:false},reason:'SECRET_MISSING'},{status:200});
  return Response.json({researchOnly:true,generatedAt:new Date().toISOString(),dataset:{name:'금융위원회_주식시세정보',officialUrl:PHASE3_POLICY.officialUrl,license:'공식 문서 확인 필요',refreshPolicy:'공식 기준일 이후 영업일 갱신'},secret:{fscApiKeyPresent:true},legacyFscProbe:{status:'NOT_RUN_IN_CODEX',parserSuccess:null},stockPrice:{operation:PHASE3_POLICY.operation,status:'NOT_RUN_IN_CODEX',requestCount:0,rowsReceived:0,totalCount:null,complete:false},markets:{categories:[],counts:{}},schema:{actualKeys:[],requiredFields:{}},historyProbe:[],feasibility:{breadth:'UNVERIFIED',momentum:'UNVERIFIED',strength:'UNVERIFIED',volatility:'UNVERIFIED'},status:'FIXTURE_ONLY'});
};}
export const phase3KoreaStockPriceCheck=createPhase3Handler();
