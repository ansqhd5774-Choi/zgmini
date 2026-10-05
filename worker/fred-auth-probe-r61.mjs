// Temporary, one-shot scheduled diagnostic. No public endpoint or source writes.
const JOB='diagnostic:fred-auth-r61:20261005';
export async function probeFredAuth(env,{fetchImpl=globalThis.fetch,now=Date.now()}={}){
 const key=typeof env?.FRED_API_KEY==='string'?env.FRED_API_KEY.trim():'';
 const safe={keyPresent:!!key,keyLength:key.length,keyFormatValid:/^[a-z0-9]{32}$/.test(key)};
 if(!safe.keyFormatValid)return {...safe,status:key?'KEY_FORMAT_INVALID':'KEY_MISSING',requestCount:0};
 const end=new Date(now).toISOString().slice(0,10),start=new Date(now-183*86400000).toISOString().slice(0,10);
 const url=new URL('https://api.stlouisfed.org/fred/series/observations');
 for(const [k,v] of Object.entries({series_id:'UNRATE',api_key:key,file_type:'json',observation_start:start,observation_end:end,limit:'12',sort_order:'desc'}))url.searchParams.set(k,v);
 const started=Date.now();let httpStatus=null;
 try{
  const r=await Reflect.apply(fetchImpl,globalThis,[url,{signal:AbortSignal.timeout(8000)}]);httpStatus=r.status;
  if(!r.ok){await r.body?.cancel();return {...safe,status:r.status===429?'QUOTA_EXCEEDED':`HTTP_${r.status}`,httpStatus,requestCount:1,elapsedMs:Date.now()-started};}
  const reader=r.body.getReader();const parts=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return {...safe,status:'BODY_LIMIT',httpStatus,requestCount:1,elapsedMs:Date.now()-started};}parts.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
  let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return {...safe,status:'INVALID_JSON',httpStatus,requestCount:1,elapsedMs:Date.now()-started};}
  const rows=Array.isArray(body.observations)?body.observations.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&x.value!=='.'&&Number.isFinite(Number(x.value))):[];
  return {...safe,status:rows.length?'READY':'NO_OBSERVATIONS',httpStatus,requestCount:1,rowCount:rows.length,latestObservationDate:rows.map(x=>x.date).sort().at(-1)??null,elapsedMs:Date.now()-started};
 }catch(e){return {...safe,status:['TimeoutError','AbortError'].includes(e?.name)?'TIMEOUT':'REQUEST_FAILED',httpStatus,requestCount:1,elapsedMs:Date.now()-started};}
}
export async function runOnceFredAuthProbe(native,now){
 const db=native.DB_CORE;if(!db)return;
 const claim=await db.prepare('INSERT OR IGNORE INTO market_collection_jobs_v1(job,status,finished_at) VALUES(?,?,?)').bind(JOB,'PROBE_CLAIMED',now).run();
 if(claim.meta?.changes!==1)return;
 const result=await probeFredAuth(native,{now});
 console.log('R61_FRED_AUTH',JSON.stringify(result));
 await db.prepare('UPDATE market_collection_jobs_v1 SET status=?,finished_at=? WHERE job=?').bind(result.status,now,JOB).run();
}
