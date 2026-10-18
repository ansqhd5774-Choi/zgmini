
const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const validDate=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const R4_IDS=["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"] as const;
const R5_IDS=["S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12","S13"] as const;

export function buildProjection({inputs,snapshot,publicSnapshot,e1,nowIso}:any){
 const body=snapshot?.body??{};
 const asOf=validDate(body?.asOfDate)?body.asOfDate:nowIso.slice(0,10);
 const diagnostic=body?.diagnostics8?.earningsRecessionDefense??null;
 const mainScore=diagnostic?.status==="READY"&&finite(diagnostic?.score)?diagnostic.score:null;
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
