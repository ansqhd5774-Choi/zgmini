
const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const validDate=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);

export function buildProjection({inputs,snapshot,publicSnapshot,e1,nowIso}:any){
 const body=snapshot?.body??{};
 const asOf=validDate(body?.asOfDate)?body.asOfDate:nowIso.slice(0,10);
 const diagnostic=body?.diagnostics8?.earningsRecessionDefense??null;
 const mainScore=diagnostic?.status==="READY"&&finite(diagnostic?.score)?diagnostic.score:null;

 const ids=["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"] as const;
 const indicators=Array.isArray(e1?.indicators)?e1.indicators.map((x:any,index:number)=>({
  id:ids[index]??String(index),
  name:x?.name??null,
  status:x?.status??"PARTIAL",
  score:finite(x?.score)?x.score:null,
  value:finite(x?.value)?x.value:null,
  unit:x?.unit??"",
  observationDate:x?.asOfDate??e1?.financialPeriodEnd??null,
  source:x?.source??"SEC EDGAR XBRL Frames",
 })):[];
 const components={
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
   issuerCount:e1?.quality?.issuerCount??null,
   indicators,
   components,
   trend:Array.isArray(e1?.trend)?e1.trend.filter((x:any)=>validDate(x?.label)&&finite(x?.value)).slice(-5):[],
   persistence:e1?.persistence??null,
   missing:Array.isArray(e1?.missing)?e1.missing:[],
  }
 };
}
