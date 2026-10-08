export const PORTWATCH_LAYER='https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0';
export async function boundedRead(url,{fetcher=fetch,maxBytes=4000000}={}){
 const response=await fetcher(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/json, application/rss+xml, text/plain, text/html'}});
 if(!response.ok)return {status:'SOURCE_FAILED',httpStatus:response.status};
 if(!response.body)throw Error('SOURCE_BODY_MISSING');
 const reader=response.body.getReader();const parts=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes)throw Error('SOURCE_PAYLOAD_LIMIT');parts.push(value);}}
 finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}
 return {status:'COLLECTED',httpStatus:response.status,body:new TextDecoder().decode(bytes)};
}
export function parseTransit(body){
 const data=JSON.parse(body);
 if(data.error||data.exceededTransferLimit||!Array.isArray(data.features))throw Error('PORTWATCH_INCOMPLETE_RESPONSE');
 const rows=data.features.map(({attributes:a})=>{
  if(a?.portid!=='chokepoint6'||a.portname!=='Strait of Hormuz'||!/^\d{4}-\d{2}-\d{2}$/.test(a.date)
   ||!Number.isInteger(a.n_total)||a.n_total<0)throw Error('PORTWATCH_ROW_INVALID');
  return {date:a.date,value:a.n_total,verified:true};});
 if(new Set(rows.map(r=>r.date)).size!==rows.length)throw Error('PORTWATCH_DUPLICATE_DAY');
 return rows.sort((a,b)=>a.date.localeCompare(b.date));
}
export async function collectSources({now=Date.now(),fetcher=fetch,conflictStartDate}={}){
 const conflictAt=typeof conflictStartDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(conflictStartDate)?Date.parse(conflictStartDate+'T00:00:00Z'):NaN;
 const from=new Date(Number.isFinite(conflictAt)&&conflictAt<=now?Math.min(conflictAt-28*86400000,now-45*86400000):now-45*86400000).toISOString().slice(0,10);
 const specs={
  portwatch:PORTWATCH_LAYER+'/query?'+new URLSearchParams({f:'json',where:`portid='chokepoint6' AND date >= DATE '${from}'`,outFields:'date,portid,portname,n_total',orderByFields:'date ASC',resultRecordCount:'2000'}),
  gdelt:'https://data.gdeltproject.org/gdeltv2/lastupdate.txt',
  ukmto:'https://www.ukmto.org/ukmto-products/recent-incidents',
  iaea:'https://www.iaea.org/feeds/topnews',
 };
 const output={};
 for(const [id,url] of Object.entries(specs)){
  try{const r=await boundedRead(url,{fetcher});output[id]={...r,url,sourceStoredAt:now,lastAttemptAt:now};
   if(id==='portwatch'&&r.status==='COLLECTED'){output[id].rows=parseTransit(r.body);output[id].observationDate=output[id].rows.at(-1)?.date??null;}
   // Discovery/feeds do not establish complete event coverage or independently verified facts.
  }catch{output[id]={status:'SOURCE_FAILED',reason:'SOURCE_READ_OR_PARSE_FAILED',url,lastAttemptAt:now};}
 }
 return output;
}
