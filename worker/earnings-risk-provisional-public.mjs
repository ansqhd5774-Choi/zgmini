// Read-only public result of actual PC R21 observation snapshots.
// This is strictly separate from the confirmed earnings-recession R4 projection.
import {PUBLIC_DISPLAY_MAX_AGE_MS} from "./public-display-freshness.mjs";

export const EARNINGS_RISK_PROVISIONAL_PUBLIC_KEY="public:earnings-risk-provisional:r30";
export const EARNINGS_RISK_PROVISIONAL_PUBLIC_VERSION="EARNINGS_RISK_PROVISIONAL_R30";
export const EARNINGS_RISK_PROVISIONAL_HISTORY_POLICY="ACTUAL_OBSERVATIONS_APPEND_ONLY_NOT_BACKFILLED";

const metricIds=["epsGrowth","revenueGrowth","operatingMargin","earningsGrowthBreadth"];
const score=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<=100;
const iso=x=>typeof x==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const date=x=>typeof x==="string"&&/^\d{4}-\d\d-\d\d$/.test(x)&&Number.isFinite(Date.parse(x+"T00:00:00Z"))&&new Date(x+"T00:00:00Z").toISOString().slice(0,10)===x;
const quarter=x=>{if(!date(x))return false;const d=new Date(x+"T00:00:00Z");return [2,5,8,11].includes(d.getUTCMonth())&&d.getUTCDate()===new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();};
const counts=x=>x&&metricIds.every(k=>Number.isInteger(x[k])&&x[k]>=0&&x[k]<=500);
const coverage=(c,o,u)=>c&&metricIds.every(k=>typeof c[k]==="number"&&Number.isFinite(c[k])&&Math.abs(c[k]-o[k]/u)<0.0000001);
const factors=x=>x==null||(x&&["eps","margin","revenue","epsBreadth"].every(k=>score(x[k])));

export function validateEarningsRiskProvisionalRecord(record){
 if(!record||record.version!==EARNINGS_RISK_PROVISIONAL_PUBLIC_VERSION||
   record.status!=="PROVISIONAL"||record.publicationAuthorized!==true||
   record.historyPolicy!==EARNINGS_RISK_PROVISIONAL_HISTORY_POLICY||
   record.methodologyVersion!=="E1-R4"||!quarter(record.quarterEnd)||
   !Number.isInteger(record.universeCount)||record.universeCount<480||record.universeCount>500||
   !iso(record.sourceStoredAt)||!iso(record.publishedAt)||
   record.sourceVersion!=="LOCAL_SEC_COMPANYFACTS_CURRENT_VINTAGE"||
   !Array.isArray(record.history)||record.history.length<1||record.history.length>370)return false;
 const points=record.history,ids=new Set();
 for(let i=0;i<points.length;i++){
  const p=points[i];
  if(!p||!iso(p.observedAt)||!score(p.score)||p.quarterEnd!==record.quarterEnd||
     !date(p.filingDate)||p.filingDate>p.observedAt.slice(0,10)||
     !counts(p.observed)||!coverage(p.coverage,p.observed,record.universeCount)||
     !factors(p.factorScores)||!p.factorScores||
     Math.abs(p.score-(p.factorScores.eps*.35+p.factorScores.margin*.25+p.factorScores.revenue*.20+p.factorScores.epsBreadth*.20))>1e-7||
     typeof p.observationId!=="string"||
     !/^[a-f0-9]{64}$/.test(p.observationId)||ids.has(p.observationId)||
     !iso(p.sourceStoredAt)||Date.parse(p.sourceStoredAt)>Date.parse(p.observedAt)||
     (i>0&&points[i-1].observedAt>=p.observedAt))return false;
  ids.add(p.observationId);
 }
 const last=points.at(-1);
 return last.observedAt===record.latest?.observedAt&&last.observationId===record.latest?.observationId&&
   last.score===record.latest?.score&&record.sourceStoredAt===last.sourceStoredAt&&
   Date.parse(last.observedAt)<=Date.parse(record.publishedAt);
}

export async function readEarningsRiskProvisional(db,{now=Date.now()}={}){
 const headers={"cache-control":"no-store","x-robots-tag":"noindex","x-content-type-options":"nosniff","x-data-source":"STORED"};
 const missing=reason=>Response.json({status:"UNAVAILABLE",reason,history:[]},{status:503,headers});
 let row,record;
 try{
  row=await db.prepare("SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?")
   .bind(EARNINGS_RISK_PROVISIONAL_PUBLIC_KEY).first();
  if(row)record=JSON.parse(row.body);
 }catch{return missing("STORED_READ_UNAVAILABLE");}
 if(!row)return missing("STORED_DATA_PENDING");
 if(!validateEarningsRiskProvisionalRecord(record))return missing("STORED_DATA_INVALID");
 const storedAt=Number(row.stored_at),lastAt=Date.parse(record.latest.observedAt),
       sourceAt=Date.parse(record.sourceStoredAt);
 if(!Number.isFinite(storedAt)||storedAt>now||lastAt>now||sourceAt>now||
    now-storedAt>=PUBLIC_DISPLAY_MAX_AGE_MS||now-lastAt>=PUBLIC_DISPLAY_MAX_AGE_MS)
   return missing("STORED_DATA_STALE");
 const clean=p=>({observedAt:p.observedAt,score:p.score,filingDate:p.filingDate,
   observed:Object.fromEntries(metricIds.map(k=>[k,p.observed[k]])),
   coverage:Object.fromEntries(metricIds.map(k=>[k,p.coverage[k]])),
   ...(p.factorScores?{factorScores:{...p.factorScores}}:{})});
 return Response.json({
  status:"READY",phase:"PROVISIONAL",methodologyVersion:record.methodologyVersion,
  historyPolicy:record.historyPolicy,quarterEnd:record.quarterEnd,universeCount:record.universeCount,
  score:record.latest.score,observedAt:record.latest.observedAt,sourceStoredAt:record.sourceStoredAt,
  history:record.history.map(clean),
 },{headers:{...headers,"cache-control":"public, max-age=60, must-revalidate",
  "x-data-snapshot-at":new Date(storedAt).toISOString()}});
}
