import {
  EMPLOYMENT_R6_FEATURES,
  EMPLOYMENT_R6_FORMULA_HASH,
} from "../lib/market-score/employment-r6-formula.mjs";
import {employmentR6OneYearStart,employmentR6RecentQuarterStart} from "../lib/market-score/employment-r6-window.mjs";

export const EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY="detail:employment-r6:one-year:v1";
const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)
  &&Number.isFinite(Date.parse(s+"T00:00:00Z"))
  &&new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const validRetrievedAt=s=>typeof s==="string"&&Number.isFinite(Date.parse(s))
  &&new Date(s).toISOString()===s;
const validPoint=(point,start,end)=>point&&validDate(point.date)
  &&point.date>=start&&point.date<=end&&finite(point.value);

/** A public result is accepted only if it retains the approved 29 IDs and provenance. */
export function validEmploymentR6PublicDisplay(body){
  if(!body||body.kind!=="EMPLOYMENT_R6_ONE_YEAR_STORED_DISPLAY_R1"
    ||body.formulaHash!==EMPLOYMENT_R6_FORMULA_HASH
    ||!validDate(body.asOfDate)
    ||!validDate(body.window?.start)
    ||!validDate(body.window?.recentQuarterStart)
    ||body.window?.end!==body.asOfDate
    ||!Number.isSafeInteger(body.sourceStoredAt)
    ||body.sourceStoredAt<=0
    ||!Array.isArray(body.indicators)
    ||body.indicators.length!==EMPLOYMENT_R6_FEATURES.length)return false;
  const asOfMs=Date.parse(body.asOfDate+"T00:00:00Z");
  if(body.window.start!==employmentR6OneYearStart(asOfMs)
    ||body.window.recentQuarterStart!==employmentR6RecentQuarterStart(asOfMs))return false;
  const summaryCounts={
    sourceFeatures:body.indicators.filter(item=>item?.rawStatus!=="UNAVAILABLE").length,
    recentlyObservedFeatures:body.indicators.filter(item=>item?.rawStatus==="READY").length,
    chartReadyFeatures:body.indicators.filter(item=>item?.chartStatus==="READY").length,
    chartPartialFeatures:body.indicators.filter(item=>item?.chartStatus==="PARTIAL").length,
    scoredFeatures:body.indicators.filter(item=>item?.scoreStatus==="READY").length,
    recentlyScoredFeatures:body.indicators.filter(item=>item?.scoreStatus==="READY"&&item?.rawStatus==="READY").length,
  };
  if(!body.summary||!Object.entries(summaryCounts).every(([key,count])=>
    Number.isInteger(body.summary[key])&&body.summary[key]===count
    &&count>=0&&count<=EMPLOYMENT_R6_FEATURES.length))return false;
  return body.indicators.every((item,i)=>{
    if(!item||item.id!==EMPLOYMENT_R6_FEATURES[i].id
      ||!["READY","STALE","UNAVAILABLE"].includes(item.rawStatus)
      ||!["READY","PARTIAL_HISTORY","PARTIAL_MISSING"].includes(item.scoreStatus)
      ||!["READY","PARTIAL","UNAVAILABLE"].includes(item.chartStatus)
      ||!["주간(ET)","주간 관측","월간(ET)","분기(ET)"].includes(item.releaseCadence)
      ||(item.nextReleaseDate!==null&&(!validDate(item.nextReleaseDate)
        ||item.nextReleaseDate<=body.asOfDate))
      ||item.retrievedAt===undefined
      ||(item.retrievedAt!==null&&(!validRetrievedAt(item.retrievedAt)
        ||Date.parse(item.retrievedAt)>body.sourceStoredAt))
      ||!Array.isArray(item.history)||item.history.length>400
      ||!item.history.every(p=>validPoint(p,body.window.start,body.asOfDate)))return false;
    const vals=item.history.map(p=>p.date);
    if(vals.some((d,j)=>j>0&&d<=vals[j-1]))return false;
    if(item.scoreStatus==="READY"?!finite(item.score)||item.score<0||item.score>100:item.score!==null)return false;
    if(item.rawStatus!=="UNAVAILABLE"&&(!finite(item.value)||!validDate(item.observationDate)
      ||item.observationDate>body.asOfDate||item.retrievedAt===null))return false;
    if(item.rawStatus==="READY"&&item.observationDate<body.window.recentQuarterStart)return false;
    return true;
  });
}

export async function employmentR6StoredDisplayResponse(request,db,{now=Date.now()}={}){
  const headers={"cache-control":"no-store","x-content-type-options":"nosniff","x-employment-r6-source":"STORED_D1"};
  if(request.method!=="GET")return Response.json({status:"UNAVAILABLE",reason:"METHOD_NOT_ALLOWED"},{status:405,headers});
  if(!db?.prepare)return Response.json({status:"UNAVAILABLE",reason:"STORAGE_UNAVAILABLE"},{status:503,headers});
  let row;
  try{
    row=await db.prepare("SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?")
      .bind(EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY).first();
  }catch{return Response.json({status:"UNAVAILABLE",reason:"STORED_READ_FAILED"},{status:503,headers});}
  if(!row)return Response.json({status:"UNAVAILABLE",reason:"STORED_PUBLICATION_PENDING"},{status:503,headers});
  let body;
  try{body=JSON.parse(row.body);}catch{
    return Response.json({status:"UNAVAILABLE",reason:"INVALID_STORED_BODY_STALE"},{status:503,headers});
  }
  const publishedAt=Number(row.stored_at);
  if(!validEmploymentR6PublicDisplay(body)||!Number.isSafeInteger(publishedAt)
    ||publishedAt>now||body.sourceStoredAt>publishedAt
    ||Date.parse(body.asOfDate+"T00:00:00Z")>now){
    return Response.json({status:"UNAVAILABLE",reason:"STORED_PUBLICATION_STALE"},{status:503,headers});
  }
  if(publishedAt<now-8*86400000){
    return Response.json({status:"UNAVAILABLE",reason:"STORED_PUBLICATION_EXPIRED"},{status:503,headers});
  }
  headers["cache-control"]="public, max-age=60, must-revalidate";
  headers["x-data-snapshot-at"]=new Date(publishedAt).toISOString();
  return Response.json(body,{status:200,headers});
}