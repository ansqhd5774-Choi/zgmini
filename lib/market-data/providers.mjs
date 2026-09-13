export const BLS_SERIES = Object.freeze({cpi:'CUUR0000SA0',ppi:'WPSFD4',unemployment:'LNS14000000',payrolls:'CES0000000001'});
export class ProviderError extends Error { constructor(status){super(status);this.status=status;} }
export function numberValue(v){if(typeof v==='number')return Number.isFinite(v)?v:null;if(typeof v!=='string'||!v.trim()||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v.trim()))return null;const n=Number(v);return Number.isFinite(n)?n:null;}
// Diagnostic side channel only; never part of a provider/public result or origin evidence.
const recordBlsDetail=(details,id,failureDetailCode,context={})=>{if(details&&!details[id])details[id]={failureDetailCode,...context};};
const recordBlsBatchDetail=(details,code)=>{for(const id of Object.values(BLS_SERIES))recordBlsDetail(details,id,code);};
export function parseBls(payload, failureEvidence, failureDetails){
 try{return parseBlsPayload(payload,failureEvidence,failureDetails);}
 catch(error){if(!(error instanceof ProviderError))recordBlsBatchDetail(failureDetails,'BLS_PARSER_EXCEPTION');throw error;}
}
function parseBlsPayload(payload, failureEvidence, failureDetails){
 const evidence=(id,status,origin)=>{if(failureEvidence)failureEvidence[id]={status,origin};};
 const batchFailure=(status,detail)=>{recordBlsBatchDetail(failureDetails,detail);for(const id of Object.values(BLS_SERIES))evidence(id,status,'PROVIDER');throw new ProviderError(status);};
 const messages=Array.isArray(payload?.message)?payload.message.join(' '):'';
 if(/quota|threshold|request.*limit|limit.*request/i.test(messages))batchFailure('QUOTA_EXCEEDED','BLS_MESSAGE_QUOTA');
 if(payload?.status!=='REQUEST_SUCCEEDED'||/registration\s*key|invalid\s*series|temporary\s*failure/i.test(messages))batchFailure('REQUEST_FAILED',
  /registration\s*key/i.test(messages)?'BLS_MESSAGE_REGISTRATION':/invalid\s*series/i.test(messages)?'BLS_MESSAGE_INVALID_SERIES':/temporary\s*failure/i.test(messages)?'BLS_MESSAGE_TEMPORARY_FAILURE':'BLS_ENVELOPE_INVALID');
 if(!Array.isArray(payload?.Results?.series))batchFailure('INVALID_RESPONSE','BLS_RESULTS_SERIES_INVALID');
 const data=new Map(),statuses={};
 for(const id of Object.values(BLS_SERIES)){
  const matches=payload.Results.series.filter(s=>s.seriesID===id);
  if(!matches.length){recordBlsDetail(failureDetails,id,'BLS_SERIES_MISSING');statuses[id]='MISSING_SERIES';evidence(id,'MISSING_SERIES','PROVIDER');continue;}
  if(matches.length!==1||!Array.isArray(matches[0].data)){recordBlsDetail(failureDetails,id,matches.length!==1?'BLS_SERIES_DUPLICATE':'BLS_DATA_NOT_ARRAY');statuses[id]='INVALID_RESPONSE';evidence(id,'INVALID_RESPONSE','PROVIDER');continue;}
  const points=new Map();let invalid=false,rowIndex=-1;
  if(!matches[0].data.length)recordBlsDetail(failureDetails,id,'BLS_DATA_EMPTY');
  for(const row of matches[0].data){
   rowIndex++;
   if(row.period==='M13')continue;
   const value=numberValue(row.value);
   if(!/^\d{4}$/.test(row.year)||!/^M(0[1-9]|1[0-2])$/.test(row.period)||value===null){
    const yearValid=/^\d{4}$/.test(row.year),periodValid=/^M(0[1-9]|1[0-2])$/.test(row.period);
    recordBlsDetail(failureDetails,id,!yearValid?'BLS_ROW_INVALID_YEAR':!periodValid?'BLS_ROW_INVALID_PERIOD':'BLS_ROW_INVALID_VALUE',
     {rowIndex,...(yearValid&&periodValid?{observationKey:`${row.year}-${row.period.slice(1)}`}:{})});
    invalid=true;continue;
   }
   const date=`${row.year}-${row.period.slice(1)}-01`;
   if(points.has(date)&&points.get(date)!==value){recordBlsDetail(failureDetails,id,'BLS_DUPLICATE_MONTH_CONFLICT',{rowIndex,observationKey:date.slice(0,7)});invalid=true;}
   points.set(date,value);
  }
  statuses[id]=invalid?'INVALID_RESPONSE':points.size>=2?'SUCCESS':'MISSING_SERIES';
  if(!invalid&&points.size<2)recordBlsDetail(failureDetails,id,'BLS_VALID_POINTS_INSUFFICIENT');
  if(statuses[id]!=='SUCCESS')evidence(id,statuses[id],'SEMANTIC');
  if(statuses[id]==='SUCCESS')data.set(id,[...points].map(([date,value])=>({date,value})).sort((a,b)=>a.date.localeCompare(b.date)));
 }
 return {data,statuses,status:Object.values(statuses).every(s=>s==='SUCCESS')?'SUCCESS':Object.values(statuses).includes('INVALID_RESPONSE')?'INVALID_RESPONSE':'MISSING_SERIES'};
}
export function parseFred(csv){
 const lines=csv.trim().split(/\r?\n/);if(!/^(DATE|observation_date),/.test(lines[0]??''))throw new ProviderError('INVALID_RESPONSE');
 const points=new Map();for(const line of lines.slice(1)){const [date,raw]=line.split(',');if(raw==='.'||raw==='')continue;const value=numberValue(raw);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date).toISOString().slice(0,10)!==date||value===null)throw new ProviderError('INVALID_RESPONSE');if(points.has(date)&&points.get(date)!==value)throw new ProviderError('INVALID_RESPONSE');points.set(date,value);}
 if(points.size<2)throw new ProviderError('INVALID_RESPONSE');return [...points].map(([date,value])=>({date,value})).sort((a,b)=>a.date.localeCompare(b.date));
}
async function bounded(url,init,parse,{fetchImpl=globalThis.fetch,timeoutMs=8000,timings={}}={}){
 const controller=new AbortController();let timer;
 Object.assign(timings,{requestStart:Date.now(),headersReceived:null,bodyReadComplete:null,parseComplete:null});
 try{return await Promise.race([(async()=>{const r=await Reflect.apply(fetchImpl,globalThis,[url,{...init,signal:controller.signal}]);timings.headersReceived=Date.now();if(!r.ok)throw new ProviderError(r.status===429?'QUOTA_EXCEEDED':'HTTP_ERROR');const reader=r.body?.getReader();if(!reader)throw new ProviderError('INVALID_RESPONSE');let bytes=0,text='';const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2_000_000){await reader.cancel();throw new ProviderError('INVALID_RESPONSE');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();timings.bodyReadComplete=Date.now();try{const result=parse(text);timings.parseComplete=Date.now();return result;}catch(e){throw e instanceof ProviderError?e:new ProviderError('INVALID_RESPONSE');}})(),new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new ProviderError('TIMEOUT'));controller.abort();},timeoutMs);})]);}catch(e){throw e instanceof ProviderError?e:new ProviderError('REQUEST_FAILED');}finally{clearTimeout(timer);}
}
export async function fetchBls({key="",now=new Date(),failureEvidence,failureDetails,...options}={}){
 const start=Date.now(),from=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-14,1));
 const registered=typeof key==='string'&&!!key.trim();
 try{const result=await bounded('https://api.bls.gov/publicAPI/v2/timeseries/data/',{method:'POST',headers:{accept:'application/json','content-type':'application/json'},body:JSON.stringify({seriesid:Object.values(BLS_SERIES),startyear:String(from.getUTCFullYear()),endyear:String(now.getUTCFullYear()),...(registered?{registrationkey:key.trim()}:{})})},s=>{
  let payload;try{payload=JSON.parse(s);}catch(error){recordBlsBatchDetail(failureDetails,'BLS_JSON_PARSE_ERROR');throw error;}
  return parseBls(payload,failureEvidence,failureDetails);
 },options);return {...result,durationMs:Date.now()-start,requestCount:1,registered};}
 catch(e){return {data:new Map(),statuses:Object.fromEntries(Object.values(BLS_SERIES).map(id=>[id,e.status])),status:e.status,durationMs:Date.now()-start,requestCount:1,registered};}
}
export function fredUrl(seriesId,now=new Date()){
 const url=new URL("https://fred.stlouisfed.org/graph/fredgraph.csv");url.searchParams.set("id",seriesId);url.searchParams.set("cosd",`${now.getUTCFullYear()-2}-01-01`);return url;
}
export async function fetchFred(seriesId,options={}){
 const start=Date.now(),url=fredUrl(seriesId),timings={};
 try{return {data:await bounded(url,{headers:{accept:'text/csv'}},parseFred,{...options,timings}),status:'SUCCESS',durationMs:Date.now()-start,timings};}catch(e){return {data:[],status:e.status,durationMs:Date.now()-start,timings};}
}
