
const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const validDate=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);

const sourcePeriodBasis="CURRENT_VINTAGE_SOURCE_PERIOD_END";
const quarterEnd=(value:unknown):value is string=>{
 if(!validDate(value))return false;
 const d=new Date(value+"T00:00:00Z");
 return d.toISOString().slice(0,10)===value&&[2,5,8,11].includes(d.getUTCMonth())&&d.getUTCDate()===new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
};
function checkedSourceObservation(x:any,asOfDate:unknown){
 if((x?.id!=="S6"&&x?.id!=="S11")||x?.historyKind!==sourcePeriodBasis||!finite(x?.value)||!quarterEnd(x?.sourcePeriodEnd)||!validDate(asOfDate)||x.sourcePeriodEnd>asOfDate)return null;
 const rows=Array.isArray(x?.sourceHistory1Y)?x.sourceHistory1Y:[];
 if(rows.length<2||rows.length>8)return null;
 const cutoff=new Date(Date.parse(asOfDate+"T00:00:00Z")-366*86400000).toISOString().slice(0,10);
 if(!rows.every((p:any)=>quarterEnd(p?.date)&&finite(p?.value)&&p.date>=cutoff&&p.date<=x.sourcePeriodEnd))return null;
 if(rows.some((p:any,i:number)=>i>0&&rows[i-1].date>=p.date))return null;
 const last=rows.at(-1);
 if(last.date!==x.sourcePeriodEnd||Math.abs(last.value-x.value)>1e-8)return null;
 const previous=rows.at(-2);
 if(!finite(x?.previousValue)||!quarterEnd(x?.previousPeriodEnd)||x.previousPeriodEnd>=x.sourcePeriodEnd)return null;
 // If present in 1Y history, the previous source period must be the penultimate point.
 const included=rows.find((p:any)=>p.date===x.previousPeriodEnd);
 if(included&&Math.abs(included.value-x.previousValue)>1e-8)return null;
 if(previous&&previous.date>x.previousPeriodEnd)return null;
 return {historyKind:sourcePeriodBasis,sourcePeriodEnd:x.sourcePeriodEnd,
   previousValue:x.previousValue,previousPeriodEnd:x.previousPeriodEnd,
   sourceHistory1Y:rows.map((p:any)=>({date:p.date,value:p.value}))};
}
// Reconstructed stored-input evaluation histories are separate from S6/S11 source periods.
// Sanitize independently: never expose filings, keys, arbitrary producer fields or fake dates.
const asOfBasis="ASOF_RECONSTRUCTED_NOT_OFFICIAL_PERIOD_END";
const allowedAsOf=new Set(["S1","S2","S3","S4","S5","S7","S8","S9","S10","S12","S13"]);
function checkedAsOfReconstruction(x:any,asOfDate:unknown){
 if(!allowedAsOf.has(x?.id)||x?.historyKind!==asOfBasis||!finite(x?.value)||
    !validDate(asOfDate)||x?.historySourceVersion!=="E1-R5-PRODUCTION-CYCLE-R1"||
    typeof x?.historySourceStoredAt!=="string"||!Number.isFinite(Date.parse(x.historySourceStoredAt)))return null;
 const rows=Array.isArray(x?.sourceHistory1Y)?x.sourceHistory1Y:[];
 if(rows.length<2||rows.length>8)return null;
 const cutoff=new Date(Date.parse(asOfDate+"T00:00:00Z")-366*86400000).toISOString().slice(0,10);
 if(!rows.every((p:any)=>validDate(p?.date)&&!Number.isNaN(Date.parse(p.date+"T00:00:00Z"))&&
      new Date(p.date+"T00:00:00Z").toISOString().slice(0,10)===p.date&&
      p.date>=cutoff&&p.date<=asOfDate&&finite(p.value)&&
      (x.id!=="S12"||(p.value>=0&&p.value<=100))))return null;
 if(rows.some((p:any,i:number)=>i>0&&rows[i-1].date>=p.date))return null;
 const last=rows.at(-1),previous=rows.at(-2);
 if(last.date!==asOfDate||Math.abs(last.value-x.value)>1e-8||
    x.previousPeriodEnd!==previous.date||!finite(x.previousValue)||
    Math.abs(previous.value-x.previousValue)>1e-8)return null;
 return {
  historyKind:asOfBasis,previousValue:previous.value,previousPeriodEnd:previous.date,
  sourceHistory1Y:rows.map((p:any)=>({date:p.date,value:p.value})),
  historySourceVersion:x.historySourceVersion,historySourceStoredAt:x.historySourceStoredAt,
 };
}
// Official source-specific announcements validated on the BEA/BLS release calendars.
// Presentation metadata only, never used by the E1 scoring calculation or PC writer.
// Automatic expiry at the announced release instant prevents silently stale "next" dates.
const approvedSourceReleases:Record<string,{source:string;date:string;releaseAt:string;url:string}>={
 S6:{source:"BEA NIPA A051RC",date:"2026-11-25",releaseAt:"2026-11-25T13:30:00Z",url:"https://www.bea.gov/news/schedule/"},
 S11:{source:"BLS PRS85006111",date:"2026-11-05",releaseAt:"2026-11-05T13:30:00Z",url:"https://www.bls.gov/schedule/news_release/prod2.htm"},
};
function verifiedUpcomingSourceRelease(x:any,nowIso:unknown){
 const matched=approvedSourceReleases[x?.id];
 if(!matched||x?.source!==matched.source||x?.status!=="READY"||typeof nowIso!=="string")return null;
 const now=Date.parse(nowIso);
 if(!Number.isFinite(now)||now>=Date.parse(matched.releaseAt))return null;
 return {nextReleaseDate:matched.date,nextReleaseSourceUrl:matched.url,releaseBasis:"OFFICIAL_SOURCE_SPECIFIC_SCHEDULE"};
}
const R4_IDS=["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"] as const;
const R5_IDS=["S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12","S13"] as const;

export function buildProjection({inputs,snapshot,publicSnapshot,e1,nowIso,riskHistory}:any){
 const body=snapshot?.body??{};
 const asOf=validDate(body?.asOfDate)?body.asOfDate:nowIso.slice(0,10);
 const diagnostic=body?.diagnostics8?.earningsRecessionDefense??null;
 const mainScore=diagnostic?.status==="READY"&&finite(diagnostic?.score)?diagnostic.score:null;
 // Risk factors are supplied by the four-input diagnostic scorer itself, not
 // by the economic-domain E1-R5's 13 factor array.
 const riskMethod="EARNINGS_RECESSION_DIAGNOSTIC_R1";
 const ids=["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"];
 const candidates=Array.isArray(diagnostic?.riskFactors)?diagnostic.riskFactors:[];
 const factorsOk=mainScore!==null&&diagnostic?.methodologyVersion===riskMethod&&
  diagnostic?.riskFactorsSource==="E1_R4_LEGACY_COMPATIBILITY"&&
  candidates.length===ids.length&&ids.every((id,index)=>
   candidates[index]?.id===id&&candidates[index]?.status==="READY"&&
   finite(candidates[index]?.score)&&candidates[index].score>=0&&candidates[index].score<=100);
 const riskFactors=factorsOk?candidates.map((row:any)=>({
  id:row.id,status:"READY",score:row.score,observationDate:null,
 })): [];
 const points=Array.isArray(riskHistory?.points)?riskHistory.points:[];
 const lastRisk=points.at(-1);
 const historyMatched=mainScore!==null&&riskHistory?.kind==="MATCHED_DIAGNOSTIC_METHOD_STORED_DATES"&&
  lastRisk?.date===asOf&&finite(lastRisk?.score)&&Math.abs(lastRisk.score-mainScore)<1e-8;
 const riskTrend=historyMatched?points.map((row:any)=>({date:row.date,score:row.score})):[];
 const riskHistoryKind=historyMatched?riskHistory.kind:null;
 const isR5=e1?.methodologyVersion==="E1-R5";
 const indicators=Array.isArray(e1?.indicators)?e1.indicators.map((x:any,index:number)=>({
  id:isR5?(x?.id??R5_IDS[index]??String(index)):(R4_IDS[index]??x?.id??String(index)),
  name:x?.name??null,
  status:x?.status??"PARTIAL",
  score:finite(x?.score)?x.score:null,
  value:finite(x?.value)?x.value:null,
  unit:x?.unit??"",
  observationDate:x?.asOfDate??e1?.financialPeriodEnd??e1?.asOfDate??null,
  source:x?.source??"SEC EDGAR XBRL Frames",
  ...(isR5?(checkedSourceObservation(x,x?.asOfDate??e1?.asOfDate)??checkedAsOfReconstruction(x,x?.asOfDate??e1?.asOfDate)??{}):{}),
  ...(isR5?verifiedUpcomingSourceRelease(x,nowIso)??{}:{}),
 })):[];
 const components=isR5
  ? Object.fromEntries(R5_IDS.map(id=>[id,{weight:finite(e1?.weights?.[id])?e1.weights[id]:null,coverage:finite(e1?.quality?.componentCoverage?.[id])?e1.quality.componentCoverage[id]:null}]))
  : {
    epsGrowth:{weight:e1?.components?.epsGrowth?.weight??0.35,coverage:e1?.components?.epsGrowth?.coverage??null},
    margin:{weight:e1?.components?.margin?.weight??0.25,coverage:e1?.components?.margin?.coverage??null},
    revenueGrowth:{weight:e1?.components?.revenueGrowth?.weight??0.20,coverage:e1?.components?.revenueGrowth?.coverage??null},
    earningsGrowthBreadth:{weight:e1?.components?.earningsGrowthBreadth?.weight??0.20,coverage:e1?.components?.earningsGrowthBreadth?.coverage??null},
   };

 return {
  status:mainScore===null?"PARTIAL":"READY",
  score:mainScore,
  missingFactors:Array.isArray(diagnostic?.missingFactors)?diagnostic.missingFactors:[],
  asOfDate:asOf,
  methodologyVersion:"EARNINGS_RECESSION_DIAGNOSTIC_R1",
  riskFactorsMethodologyVersion:factorsOk?riskMethod:null,
  riskFactorsSource:factorsOk?"E1_R4_LEGACY_COMPATIBILITY":null,
  riskFactors,
  riskTrend,
  riskHistoryKind,
  storedE1:{
   status:e1?.status??"PARTIAL",
   score:finite(e1?.score)?e1.score:null,
   methodologyVersion:e1?.methodologyVersion??"E1-R4",
   financialPeriodEnd:e1?.financialPeriodEnd??null,
   updatedAt:e1?.updatedAt??e1?.retrievedAt??null,
   issuerCount:e1?.issuerCount??e1?.quality?.issuerCount??null,
   universeCount:e1?.universeCount??e1?.quality?.universeCount??null,
   indicators,
   components,
   trend:Array.isArray(e1?.trend)?e1.trend.filter((x:any)=>validDate(x?.label)&&finite(x?.value)).slice(-8):[],
   persistence:e1?.persistence??null,
   missing:Array.isArray(e1?.missing)?e1.missing:[],
  }
 };
}
