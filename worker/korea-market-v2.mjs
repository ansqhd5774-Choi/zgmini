import {canonicalServiceKey,parseStockPricePage,PHASE3_POLICY} from './phase3-korea-stock-price.mjs';

export const MARKET_V2_POLICY=Object.freeze({researchOnly:true,productionEligible:false,pageSize:10000,maxPages:5,timeoutMs:8000,maxBodyBytes:16000000,cacheMs:900000});
const fail=code=>{throw new Error(code);};
export function validMarketDate(date){return typeof date==='string'&&/^\d{8}$/.test(date)&&Number.isFinite(Date.parse(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00Z`))&&new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00Z`).toISOString().slice(0,10).replaceAll('-','')===date;}
export function marketNumber(value){
 if(value==null||typeof value==='string'&&!value.trim())return {value:null,status:'MISSING'};
 if(typeof value!=='number'&&typeof value!=='string')return {value:null,status:'INVALID'};
 if(typeof value==='string'&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))return {value:null,status:'INVALID'};
 const n=Number(value);return Number.isFinite(n)?{value:n,status:'VALID'}:{value:null,status:'INVALID'};
}
const text=value=>typeof value==='string'?value.trim():'';
const stable=value=>JSON.stringify(Object.keys(value).sort().map(k=>[k,value[k]]));
export function calculateBreadth(rows){
 let up=0,flat=0,down=0,upValue=0,flatValue=0,totalTradingValue=0;
 for(const r of rows){const validReturn=Number.isFinite(r.returnPct),validValue=Number.isFinite(r.tradingValue)&&r.tradingValue>=0;
  if(validValue)totalTradingValue+=r.tradingValue;
  if(!validReturn)continue;
  if(r.returnPct>0){up++;if(validValue)upValue+=r.tradingValue;}else if(r.returnPct===0){flat++;if(validValue)flatValue+=r.tradingValue;}else down++;
 }
 const validReturnCount=up+flat+down,advanceRatio=validReturnCount?(up+0.5*flat)/validReturnCount:null;
 const advanceValueShare=totalTradingValue>0?(upValue+0.5*flatValue)/totalTradingValue:null;
 const score=advanceRatio!==null&&advanceValueShare!==null?100*(0.60*advanceRatio+0.40*advanceValueShare):null;
 const valid=score!==null&&Number.isFinite(score)&&score>=0&&score<=100&&Number.isFinite(totalTradingValue);
 return {advanceRatio,advanceValueShare,score:valid?score:null,status:valid?'VALID':'INVALID',up,flat,down,validReturnCount,totalTradingValue};
}
export function standardizeMarketSnapshot(rawRows,requestedDate,{totalCount=rawRows.length,complete=rawRows.length===totalCount,fetchedAt=null}={}){
 if(!validMarketDate(requestedDate))fail('INVALID_REQUESTED_DATE');
 const rows=[],seen=new Map();let konexExcluded=0,duplicateCount=0;const errors=new Set();
 for(const raw of rawRows){
  if(raw.basDt!==requestedDate){errors.add('DATE_MISMATCH');continue;}
  if(raw.mrktCtg==='KONEX'){konexExcluded++;continue;}
  if(!['KOSPI','KOSDAQ'].includes(raw.mrktCtg)){errors.add('UNKNOWN_MARKET');continue;}
  const shortCode=text(raw.srtnCd),isin=text(raw.isinCd);if(!shortCode){errors.add('IDENTITY_MISSING');continue;}
  const securityId=isin||`${raw.mrktCtg}:${shortCode}`,identity=`${requestedDate}:${securityId}`,fingerprint=stable(raw);
  if(seen.has(identity)){if(seen.get(identity)!==fingerprint)errors.add('DUPLICATE_CONFLICT');else duplicateCount++;continue;}seen.set(identity,fingerprint);
  const number=(field,nonnegative=false)=>{const n=marketNumber(raw[field]).value;return n!==null&&(!nonnegative||n>=0)?n:null;};
  rows.push({date:raw.basDt,securityId,shortCode,market:raw.mrktCtg,close:number('clpr',true),returnPct:number('fltRt'),tradingValue:number('trPrc',true),marketCap:number('mrktTotAmt',true)});
 }
 rows.sort((a,b)=>a.securityId.localeCompare(b.securityId));
 const universeCount=rows.length,kospiCount=rows.filter(r=>r.market==='KOSPI').length,kosdaqCount=rows.filter(r=>r.market==='KOSDAQ').length;
 const count=field=>rows.filter(r=>Number.isFinite(r[field])).length;
 const validReturnCount=count('returnPct'),validTradingValueCount=count('tradingValue'),validMarketCapCount=count('marketCap');
 const coverage=n=>universeCount?n/universeCount:null;
 const quality={universeCount,kospiCount,kosdaqCount,konexExcluded,duplicateCount,validReturnCount,validTradingValueCount,validMarketCapCount,
  returnCoverage:coverage(validReturnCount),tradingValueCoverage:coverage(validTradingValueCount),marketCapCoverage:coverage(validMarketCapCount)};
 if(!complete)errors.add('INCOMPLETE_SNAPSHOT');
 const breadth=calculateBreadth(rows);if(errors.size){breadth.score=null;breadth.status='INVALID';}
 return {researchOnly:true,productionEligible:false,requestedDate,latestObservationDate:rows.length?requestedDate:null,fetchedAt,
  rowsReceived:rawRows.length,totalCount,complete,rows,...quality,breadth,status:errors.size?'ERROR':rawRows.length===0?'NO_TRADING_OBSERVATION':breadth.status==='VALID'?'SUCCESS':'INVALID',safeErrorCode:[...errors][0]??null};
}

export async function fetchMarketDate(requestedDate,key,{fetchImpl=globalThis.fetch,now=Date.now,policy=MARKET_V2_POLICY}={}){
 if(!validMarketDate(requestedDate))fail('INVALID_REQUESTED_DATE');
 if(typeof key!=='string'||!key.trim())fail('KEY_MISSING');
 const all=[],pageSignatures=new Set();let totalCount=null,requestCount=0;
 try{
  for(let page=1;page<=policy.maxPages;page++){
   const url=new URL(`https://apis.data.go.kr/1160100/${PHASE3_POLICY.service}/${PHASE3_POLICY.operation}`);
   url.search=new URLSearchParams({serviceKey:canonicalServiceKey(key),resultType:'json',basDt:requestedDate,numOfRows:String(policy.pageSize),pageNo:String(page)});
   const controller=new AbortController();let timer;
   let parsed;
   try{parsed=await Promise.race([(async()=>{
    requestCount++;const response=await Reflect.apply(fetchImpl,globalThis,[url,{method:'GET',redirect:'manual',signal:controller.signal}]);
    if(!response.ok)fail('UPSTREAM_HTTP_ERROR');
    const reader=response.body?.getReader();if(!reader)fail('BODY_MISSING');let bytes=0,body='';const decoder=new TextDecoder();
    while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>policy.maxBodyBytes){await reader.cancel();fail('BODY_LIMIT');}body+=decoder.decode(part.value,{stream:true});}body+=decoder.decode();
    let json;try{json=JSON.parse(body);}catch{fail('INVALID_JSON');}
    const rawTotal=json?.response?.body?.totalCount;
    if(rawTotal==null||!/^\d+$/.test(String(rawTotal)))fail('UPSTREAM_SCHEMA_OR_API_ERROR');
    const result=parseStockPricePage(json);if(!result.ok)fail('UPSTREAM_SCHEMA_OR_API_ERROR');return result;
   })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('TIMEOUT'));},policy.timeoutMs);})]);}finally{clearTimeout(timer);}
   if(totalCount===null)totalCount=parsed.totalCount;else if(totalCount!==parsed.totalCount)fail('TOTAL_COUNT_CHANGED');
   if(parsed.rows.length>policy.pageSize)fail('PAGE_SIZE_EXCEEDED');
   const signature=JSON.stringify(parsed.rows.map(stable));if(parsed.rows.length&&pageSignatures.has(signature))fail('REPEATED_PAGE');pageSignatures.add(signature);
   all.push(...parsed.rows);if(all.length>totalCount)fail('ROW_COUNT_EXCEEDED');
   if(all.length===totalCount)return {...standardizeMarketSnapshot(all,requestedDate,{totalCount,complete:true,fetchedAt:new Date(now()).toISOString()}),requestCount};
   if(!parsed.rows.length)fail('INCOMPLETE_SNAPSHOT');
  }
  fail('REQUEST_CAP_REACHED');
 }catch(error){const safe=new Set(['UPSTREAM_HTTP_ERROR','BODY_MISSING','BODY_LIMIT','INVALID_JSON','UPSTREAM_SCHEMA_OR_API_ERROR','TIMEOUT','TOTAL_COUNT_CHANGED','PAGE_SIZE_EXCEEDED','REPEATED_PAGE','ROW_COUNT_EXCEEDED','INCOMPLETE_SNAPSHOT','REQUEST_CAP_REACHED']);
  return {...standardizeMarketSnapshot(all,requestedDate,{totalCount,complete:false,fetchedAt:new Date(now()).toISOString()}),requestCount,safeErrorCode:safe.has(error?.message)?error.message:'UPSTREAM_FAILURE'};
 }
}

/** Memory-only research contract; no persistent resources or backfill network calls. */
export class KoreaMarketHistoryStore {
 #dates=new Map();#factors=new Map();#progress=null;
 saveMarketDate(snapshot){if(!snapshot.complete||snapshot.status==='ERROR'||!validMarketDate(snapshot.requestedDate))fail('INVALID_SNAPSHOT');this.#dates.set(snapshot.requestedDate,structuredClone(snapshot));}
 getMarketDate(date){return structuredClone(this.#dates.get(date)??null);}
 getSecurityHistory(id){return [...this.#dates.values()].flatMap(s=>s.rows.filter(r=>r.securityId===id)).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>structuredClone(r));}
 saveFactorSnapshot(date,factor){if(!validMarketDate(date))fail('INVALID_DATE');this.#factors.set(date,structuredClone(factor));}
 getFactorHistory(){return [...this.#factors].sort(([a],[b])=>a.localeCompare(b)).map(([date,factor])=>({date,...structuredClone(factor)}));}
 saveBackfillProgress(progress){for(const k of ['latestProcessedDate','oldestProcessedDate'])if(progress[k]!==null&&!validMarketDate(progress[k]))fail('INVALID_CHECKPOINT');for(const k of ['successfulTradingDates','requestCount','rowsProcessed'])if(!Number.isSafeInteger(progress[k])||progress[k]<0)fail('INVALID_CHECKPOINT');if(!['IDLE','RUNNING','PAUSED','COMPLETE','ERROR'].includes(progress.status))fail('INVALID_CHECKPOINT');this.#progress=structuredClone(progress);}
 getBackfillProgress(){return structuredClone(this.#progress);}
}
export function createMarketSnapshotHandler({fetchImpl=globalThis.fetch,now=Date.now,runtime=false}={}){
 const cache=new Map(),pending=new Map();
 return async(request,env={})=>{
  const requestedDate=new URL(request.url).searchParams.get('basDt');
  const base={researchOnly:true,productionEligible:false,provider:PHASE3_POLICY.service,operation:PHASE3_POLICY.operation,requestedDate};
  if(request.method!=='GET')return Response.json({researchOnly:true,safeErrorCode:'METHOD_NOT_ALLOWED'},{status:405});
  if(!validMarketDate(requestedDate))return Response.json({...base,safeErrorCode:'INVALID_REQUESTED_DATE'},{status:400});
  if(now()>=Date.parse(PHASE3_POLICY.expiresAt))return Response.json({...base,safeErrorCode:'EXPIRED'},{status:410});
  if(!runtime||!env.FSC_API_KEY)return Response.json({...base,status:'BLOCKED',requestCount:0,safeErrorCode:runtime?'KEY_MISSING':'NOT_RUN_IN_CODEX'});
  let result=cache.get(requestedDate);if(!result||now()-result.at>=MARKET_V2_POLICY.cacheMs){
   if(!pending.has(requestedDate))pending.set(requestedDate,fetchMarketDate(requestedDate,env.FSC_API_KEY,{fetchImpl,now}).then(value=>{if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(requestedDate,{at:now(),value});return value;}).finally(()=>pending.delete(requestedDate)));
   result={value:await pending.get(requestedDate)};
  }
  const {rows,...summary}=result.value;
  return Response.json({...base,...summary,safeErrorMessage:summary.safeErrorCode?'Research snapshot validation failed.':null});
 };
}
export const marketSnapshotHandler=createMarketSnapshotHandler({runtime:true});
