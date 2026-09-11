// Temporary PHASE 2B research endpoint. Remove this module, its import and route
// in worker/index.ts after research. It automatically closes on 2026-10-11 UTC.
import {analyzeSeries,correlationMatrix,creditComposition,QUALITY_POLICY} from './phase2-korea-analysis.mjs';
import {period} from './phase1-korea.mjs';
const BASE='https://apis.data.go.kr/1160100/service/GetKofiaStatisticsInfoService/';
export const RESEARCH_POLICY=Object.freeze({startDate:'20210101',pageSize:1000,maxPagesPerOperation:6,maxRowsPerOperation:6000,maxBodyBytes:2097152,requestTimeoutMs:12000,operationTimeoutMs:90000,cacheMs:900000,expiresAt:'2026-10-11T00:00:00Z'});
export const OPERATIONS=Object.freeze({
 credit:{operation:'getGrantingOfCreditBalanceInfo',fields:['crdTrFingWhl','crdTrLndrWhl','dpsgScrtMogFing','crdTrFingScrs','crdTrFingKosdaq']},
 capital:{operation:'getSecuritiesMarketTotalCapitalInfo',fields:['invrDpsgAmt','brkTrdUcolMny','brkTrdUcolMnyVsOppsTrdAmt','ucolMnyVsOppsTrdRlImpt','onbdDrvPrdTrRcAdvAmt','toCstRpchCndBndSlgBal']},
 cma:{operation:'getCMAStatus',fields:['actBal']}
});
class ResearchError extends Error {constructor(code){super(code);this.code=code;}}
const fail=code=>{throw new ResearchError(code);};
const calendarDate=now=>new Date(now.getTime()+9*3600000).toISOString().slice(0,10).replaceAll('-','');
const jsonResponse=(body,status=200,extra={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff',...extra}});
function decodeKey(key){try{return /%[0-9a-f]{2}/i.test(key)?decodeURIComponent(key):key;}catch{fail('KEY_ENCODING_ERROR');}}
export function historyUrl(name,key,page,endDate){
 if(!OPERATIONS[name]||!Number.isInteger(page)||page<1||page>6||!period(endDate,'D'))fail('REQUEST_INVALID');
 const u=new URL(OPERATIONS[name].operation,BASE);
 for(const [k,v] of Object.entries({serviceKey:decodeKey(key),resultType:'json',pageNo:page,numOfRows:1000,beginBasDt:'20210101',endBasDt:endDate,...(name==='cma'?{mngInvTgt:'합계'}:{})}))u.searchParams.set(k,String(v));return u;
}
async function boundedJson(response){
 if(Number(response.headers.get('content-length'))>RESEARCH_POLICY.maxBodyBytes){await response.body?.cancel();fail('BODY_TOO_LARGE');}
 const reader=response.body?.getReader();if(!reader)fail('EMPTY_BODY');let size=0,text='';const decoder=new TextDecoder();
 try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>RESEARCH_POLICY.maxBodyBytes){await reader.cancel();fail('BODY_TOO_LARGE');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}
 finally{reader.releaseLock();}
 try{return JSON.parse(text.replace(/^\uFEFF/,''));}catch{fail('JSON_PARSE_ERROR');}
}
export function parseHistoryPage(json,page){
 const header=json?.response?.header,body=json?.response?.body;
 if(String(header?.resultCode)!=='00')fail(header?.resultCode!==undefined?'API_ERROR':'API_STATUS_MISSING');
 const rawTotal=body?.totalCount;
 if(!(typeof rawTotal==='number'||typeof rawTotal==='string'&&/^\d+$/.test(rawTotal)))fail('SCHEMA_ERROR');
 const total=Number(rawTotal);if(!Number.isSafeInteger(total)||total<0)fail('SCHEMA_ERROR');
 if(body.pageNo!==undefined&&Number(body.pageNo)!==page)fail('PAGE_NUMBER_MISMATCH');
 const item=body.items?.item;
 const rows=Array.isArray(item)?item:item&&typeof item==='object'?[item]:total===0?[]:null;
 if(!rows||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)))fail('SCHEMA_ERROR');
 return {rows,total};
}
export async function fetchHistory(name,key,context={}){
 const config=OPERATIONS[name],rows=[],started=Date.now(),endDate=calendarDate(context.now??new Date());
 const status={provider:'FSC/KOFIA',operation:config.operation,status:'FAILED',secretPresent:typeof key==='string'&&!!key.trim(),requestCount:0,pagesReceived:0,rowsReceived:0,totalCount:null,complete:false,httpStatus:null,errorType:null,apiErrorCode:null};
 if(!status.secretPresent)return {rows,status:{...status,errorType:'SECRET_MISSING'}};
 let expected=null;const pageSignatures=new Set();
 try{for(let page=1;page<=RESEARCH_POLICY.maxPagesPerOperation;page++){
  const remaining=RESEARCH_POLICY.operationTimeoutMs-(Date.now()-started);if(remaining<=0)fail('OPERATION_TIMEOUT');
  const controller=new AbortController();let timer;
  try{
   const url=historyUrl(name,key,page,endDate),fetchFn=context.fetch??globalThis.fetch;
   status.requestCount++;
   const pending=(async()=>{const response=await Reflect.apply(fetchFn,globalThis,[url,{method:'GET',redirect:'manual',signal:controller.signal}]);
    status.httpStatus=response.status;
    if(!response.ok){await response.body?.cancel();fail('HTTP_ERROR');}
    const json=await boundedJson(response),code=json?.response?.header?.resultCode;
    status.apiErrorCode=typeof code==='string'&&/^\d{1,3}$/.test(code)&&code!=='00'?code:null;
    return parseHistoryPage(json,page);
   })();
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new ResearchError('REQUEST_TIMEOUT'));},Math.min(context.timeoutMs??RESEARCH_POLICY.requestTimeoutMs,remaining));});
   const batch=await Promise.race([pending,timeout]);status.pagesReceived++;
   if(expected!==null&&expected!==batch.total)fail('TOTAL_COUNT_CHANGED');expected=batch.total;status.totalCount=expected;
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(batch.rows)));
   const signature=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
   if(batch.rows.length&&pageSignatures.has(signature))fail('REPEATED_PAGE');pageSignatures.add(signature);
   if(rows.length+batch.rows.length>RESEARCH_POLICY.maxRowsPerOperation)fail('ROW_LIMIT');
   rows.push(...batch.rows);status.rowsReceived=rows.length;
   if(rows.length===expected){status.complete=true;break;}
   if(rows.length>expected)fail('TOTAL_COUNT_MISMATCH');if(!batch.rows.length)fail('PAGINATION_INCOMPLETE');
  }finally{clearTimeout(timer);}
 }
 if(!status.complete)fail('PAGE_LIMIT');
 status.status='SUCCESS';
 }catch(e){status.status=rows.length?'PARTIAL':'FAILED';status.errorType=e instanceof ResearchError?e.code:'NETWORK_OR_RUNTIME_ERROR';}
 status.elapsedMs=Date.now()-started;
 // Out-of-range rows are not used for the requested-window analysis.
 const inRange=rows.filter(r=>!period(r.basDt,'D')||(r.basDt>='20210101'&&r.basDt<=endDate));
 status.outOfRangeRows=rows.length-inRange.length;if(status.outOfRangeRows){status.status='PARTIAL';status.complete=false;status.errorType??='OUT_OF_RANGE_ROWS';}
 return {rows:inRange,status};
}
export function cmaGroups(rows){
 // Guide documents mngInvTgt=합계, with separate 개인/기관 investor categories.
 // These totals are NOT an all-investor aggregate and are NEVER summed.
 const accepted=['개인','기관'],groups=accepted.map(invrCtg=>({category:{mngInvTgt:'합계',invrCtg},rows:rows.filter(r=>r.mngInvTgt==='합계'&&r.invrCtg===invrCtg)})).filter(g=>g.rows.length);
 return {groups,diagnostics:{scope:'documented mngInvTgt=합계 only; not all CMA categories',rowsReceived:rows.length,aggregateRows:groups.reduce((n,g)=>n+g.rows.length,0),unselectedRows:rows.length-groups.reduce((n,g)=>n+g.rows.length,0),categories:groups.map(g=>({...g.category,rows:g.rows.length})),selection:'separate official investor-category totals; no summation',allInvestorAggregateAvailable:false}};
}
export async function runHistoryResearch(env,context={}){
 const now=context.now??new Date(),nowDate=calendarDate(now),key=env?.FSC_API_KEY;
 const fetched=await Promise.all(Object.keys(OPERATIONS).map(async name=>{try{return [name,await fetchHistory(name,key,{...context,now})];}catch{return [name,{rows:[],status:{operation:OPERATIONS[name].operation,status:'FAILED',complete:false,errorType:'INTERNAL_OPERATION_ERROR'}}];}}));
 const data=Object.fromEntries(fetched),series={},operations={};
 for(const name of ['credit','capital']){
  const f=data[name];operations[name]=f.status;
  for(const field of OPERATIONS[name].fields){series[field]=analyzeSeries(f.rows,{operation:OPERATIONS[name].operation,field,nowDate,complete:f.status.complete,unit:field==='ucolMnyVsOppsTrdRlImpt'?'%':null,unitSource:field==='ucolMnyVsOppsTrdRlImpt'?'official-guide':null});}
  if(f.status.status==='SUCCESS'&&OPERATIONS[name].fields.some(field=>series[field].summary.uniqueObservationCount===0)){operations[name]={...f.status,status:'PARTIAL',errorType:'SERIES_NO_VALID_OBSERVATIONS'};}
 }
 const cma=cmaGroups(data.cma.rows);operations.cma={...data.cma.status,structure:cma.diagnostics};
 if(data.cma.status.status==='SUCCESS'&&!cma.groups.length)operations.cma={...operations.cma,status:'PARTIAL',errorType:'NO_DOCUMENTED_AGGREGATE'};
 const cmaSeries=cma.groups.map(g=>analyzeSeries(g.rows,{operation:OPERATIONS.cma.operation,field:'actBal',category:g.category,nowDate,complete:data.cma.status.complete}).summary);
 const fields=['crdTrFingWhl','brkTrdUcolMny','brkTrdUcolMnyVsOppsTrdAmt','ucolMnyVsOppsTrdRlImpt','invrDpsgAmt'];
 const output={researchOnly:true,generatedAt:now.toISOString(),window:{begin:'2021-01-01',end:nowDate,extendedTo2018:false},policy:{...RESEARCH_POLICY,quality:QUALITY_POLICY,holidays:'No missing-date imputation. Calendar lag/gap screening only; no exchange holiday calendar.',standardDeviation:'population',percentiles:'linear interpolation, (n-1)*p',change1D:'1-observation percentage change, not a calendar-day return',correlationMinimumPairs:3,correlationCaution:'raw level correlation can be spurious; no automatic elimination',normalization:'feasibility only; no scores or weights'},operations,series:[...Object.values(series).map(s=>s.summary),...cmaSeries],creditComposition:creditComposition(data.credit.rows),correlations:{fields,raw:correlationMatrix(series,fields),change20:correlationMatrix(series,fields,true)},status:['credit','capital'].every(k=>operations[k].status==='SUCCESS')?'SUCCESS':['credit','capital'].some(k=>operations[k].status!=='FAILED')?'PARTIAL':'FAILED'};
 const secrets=[key];try{secrets.push(decodeKey(key??''));}catch{}
 return JSON.parse(JSON.stringify(output,(_k,v)=>typeof v==='string'&&secrets.some(s=>s&&v.includes(s))?'[REDACTED]':v));
}
export function createResearchHandler(){
 let cache=null,inFlight=false,lastAttempt=-Infinity;
 return async function(request,env){
  if(request.method!=='GET')return jsonResponse({errorType:'METHOD_NOT_ALLOWED'},405,{Allow:'GET'});
  if(new URL(request.url).search)return jsonResponse({errorType:'QUERY_NOT_ALLOWED'},400);
  const now=Date.now();if(now>=Date.parse(RESEARCH_POLICY.expiresAt))return jsonResponse({errorType:'RESEARCH_EXPIRED'},410);
  if(cache&&now-cache.at<RESEARCH_POLICY.cacheMs)return jsonResponse({...cache.data,fromCache:true});
  if(inFlight||now-lastAttempt<RESEARCH_POLICY.cacheMs)return jsonResponse({errorType:'RESEARCH_RATE_LIMIT'},429,{'Retry-After':String(Math.max(1,Math.ceil((RESEARCH_POLICY.cacheMs-(now-lastAttempt))/1000)))});
  inFlight=true;lastAttempt=now;
  try{const data=await runHistoryResearch(env);cache={at:Date.now(),data};return jsonResponse({...data,fromCache:false});}
  catch{return jsonResponse({errorType:'RESEARCH_INTERNAL_ERROR'},500);}
  finally{inFlight=false;}
 };
}
export const phase2KoreaHistoryCheck=createResearchHandler();
