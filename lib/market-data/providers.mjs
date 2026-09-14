export const BLS_SERIES = Object.freeze({cpi:'CUUR0000SA0',ppi:'WPSFD4',unemployment:'LNS14000000',payrolls:'CES0000000001'});
export class ProviderError extends Error { constructor(status){super(status);this.status=status;} }
export function numberValue(v){if(typeof v==='number')return Number.isFinite(v)?v:null;if(typeof v!=='string'||!v.trim()||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v.trim()))return null;const n=Number(v);return Number.isFinite(n)?n:null;}
export function parseBls(payload){
 const messages=Array.isArray(payload?.message)?payload.message.join(' '):'';
 if(/quota|threshold|request.*limit|limit.*request/i.test(messages))throw new ProviderError('QUOTA_EXCEEDED');
 if(payload?.status!=='REQUEST_SUCCEEDED'||/registration\s*key|invalid\s*series|temporary\s*failure/i.test(messages))throw new ProviderError('REQUEST_FAILED');
 if(!Array.isArray(payload?.Results?.series))throw new ProviderError('INVALID_RESPONSE');
 const data=new Map(),statuses={};
 for(const id of Object.values(BLS_SERIES)){
  const matches=payload.Results.series.filter(s=>s.seriesID===id);
  if(!matches.length){statuses[id]='MISSING_SERIES';continue;}
  if(matches.length!==1||!Array.isArray(matches[0].data)){statuses[id]='INVALID_RESPONSE';continue;}
  const points=new Map();let invalid=false;
  for(const row of matches[0].data){
   if(row.period==='M13')continue;
   const value=numberValue(row.value);
   if(!/^\d{4}$/.test(row.year)||!/^M(0[1-9]|1[0-2])$/.test(row.period)||value===null){invalid=true;continue;}
   const date=`${row.year}-${row.period.slice(1)}-01`;
   if(points.has(date)&&points.get(date)!==value)invalid=true;
   points.set(date,value);
  }
  statuses[id]=invalid?'INVALID_RESPONSE':points.size>=2?'SUCCESS':'MISSING_SERIES';
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
export async function fetchBls({key="",now=new Date(),...options}={}){
 const start=Date.now(),from=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-14,1));
 const registered=typeof key==='string'&&!!key.trim();
 try{const result=await bounded('https://api.bls.gov/publicAPI/v2/timeseries/data/',{method:'POST',headers:{accept:'application/json','content-type':'application/json'},body:JSON.stringify({seriesid:Object.values(BLS_SERIES),startyear:String(from.getUTCFullYear()),endyear:String(now.getUTCFullYear()),...(registered?{registrationkey:key.trim()}:{})})},s=>parseBls(JSON.parse(s)),options);return {...result,durationMs:Date.now()-start,requestCount:1,registered};}
 catch(e){return {data:new Map(),statuses:Object.fromEntries(Object.values(BLS_SERIES).map(id=>[id,e.status])),status:e.status,durationMs:Date.now()-start,requestCount:1,registered};}
}
export function fredUrl(seriesId,now=new Date()){
 const url=new URL("https://fred.stlouisfed.org/graph/fredgraph.csv");url.searchParams.set("id",seriesId);url.searchParams.set("cosd",`${now.getUTCFullYear()-2}-01-01`);return url;
}
export async function fetchFred(seriesId,options={}){
 const start=Date.now(),url=fredUrl(seriesId),timings={};
 try{return {data:await bounded(url,{headers:{accept:'text/csv'}},parseFred,{...options,timings}),status:'SUCCESS',durationMs:Date.now()-start,timings};}catch(e){return {data:[],status:e.status,durationMs:Date.now()-start,timings};}
}
