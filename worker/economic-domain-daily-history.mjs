// Candidate additive read-only endpoint. Keep unmerged until public data-contract approval.
// Only derived scores from preexisting published D1 snapshot rows; no DB writes.
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x);
const validScore=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<=100;
const SQL="SELECT s.snapshot_key AS date,s.stored_at AS storedAt,json_extract(s.body,'$.modelVersion') AS modelVersion,json_extract(j.value,'$.id') AS domainId,json_extract(j.value,'$.status') AS domainStatus,json_extract(j.value,'$.score') AS score,json_extract(j.value,'$.methodologyVersion') AS methodologyVersion FROM market_public_snapshots_v1 AS s JOIN json_each(s.body,'$.domains') AS j WHERE s.snapshot_key BETWEEN ? AND ? AND length(s.snapshot_key)=10 AND json_extract(j.value,'$.id') IN ('employment','credit') ORDER BY s.snapshot_key ASC LIMIT 900";
export function selectApprovedDailyScores(rows,{from,to}={}){
 const source={employment:new Map(),credit:new Map()};
 for(const row of Array.isArray(rows)?rows:[]){
  const id=row?.domainId;
  if(!(id==="employment"||id==="credit")||row.domainStatus!=="READY"||
     !validDate(row.date)||row.date<from||row.date>to||
     !validScore(row.score)||!Number.isSafeInteger(row.storedAt)||
     row.storedAt<=0||!Number.isFinite(new Date(row.storedAt).valueOf()))continue;
  const methodologyVersion=typeof row.methodologyVersion==="string"&&row.methodologyVersion?row.methodologyVersion:null;
  const modelVersion=typeof row.modelVersion==="string"&&row.modelVersion?row.modelVersion:null;
  source[id].set(row.date,{date:row.date,score:row.score,methodologyVersion,modelVersion});
 }
 return Object.fromEntries(Object.entries(source).map(([id,days])=>[id,[...days.values()].sort((a,b)=>a.date.localeCompare(b.date))]));
}
export async function readPublicDailyDomainScores({db,now=Date.now()}={}){
 if(!db?.prepare||!Number.isSafeInteger(now))throw Error("DAILY_PUBLIC_STORAGE_UNAVAILABLE");
 const to=new Date(now).toISOString().slice(0,10),start=new Date(now);
 start.setUTCDate(start.getUTCDate()-400);
 const from=start.toISOString().slice(0,10);
 const result=await db.prepare(SQL).bind(from,to).all();
 return {status:"READY",source:"PUBLISHED_DAILY_SNAPSHOTS_ONLY",from,to,series:selectApprovedDailyScores(result?.results??[],{from,to})};
}
export async function storedPublicDailyHistoryResponse(request,{db,now=Date.now()}={}){
 const headers={"cache-control":"no-store","x-robots-tag":"noindex","x-content-type-options":"nosniff"};
 if(request.method!=="GET")return Response.json({status:"FAILED",reason:"METHOD_NOT_ALLOWED"},{status:405,headers:{...headers,allow:"GET"}});
 try{
  const body=await readPublicDailyDomainScores({db,now});
  return Response.json(body,{headers:{...headers,"cache-control":"public, max-age=60, must-revalidate"}});
 }catch{
  return Response.json({status:"UNAVAILABLE",reason:"PUBLISHED_HISTORY_READ_FAILED"},{status:503,headers});
 }
}
