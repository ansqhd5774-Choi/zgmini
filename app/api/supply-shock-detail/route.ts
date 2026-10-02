import {env} from "cloudflare:workers";
import {marketOperationalStore,readStoredMarketInputs} from "../../../worker/market-operational-store.mjs";
import {buildSupplyShockR9} from "../../../lib/diagnostic-layer/supply-r9-components.mjs";

const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const validDate=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
function latest(rows:any[],asOf:string,field="value"){let best:any=null;for(const row of rows??[]){if(!validDate(row?.observationDate)||row.observationDate>asOf||!finite(row?.[field]))continue;if(!best||row.observationDate>best.observationDate)best=row}return best}
function point(id:string,name:string,score:number|null,value:number|null,unit:string,observationDate:string|null,source:string,weight:number){return {id,name,status:finite(score)?"READY":"PARTIAL",score:finite(score)?score:null,value:finite(value)?value:null,unit,observationDate:validDate(observationDate)?observationDate:null,source,weight}}

export async function GET(){
 const store=marketOperationalStore(env.DB);
 const [inputs,snapshot]=await Promise.all([readStoredMarketInputs(store),store.readScore()]);
 const body=snapshot?.body??{},asOf=validDate(body?.asOfDate)?body.asOfDate:new Date().toISOString().slice(0,10);
 const series=inputs?.series??{},external=inputs?.external??{};
 const supply=buildSupplyShockR9({
  gscpi:external.gscpiRows??[],
  wti:series.MCOILWTICO??[],
  gasoline:series.GASREGCOVM??[],
  copper:external.copperRows??[],
  industrialProduction:series.INDPRO??[],
  headlineCpi:series.CPIAUCSL??[],
  coreCpi:series.CPILFESL??[],
 });
 const diagnostic=body?.diagnostics8?.supplyShockSafety??null;
 const score=diagnostic?.status==="READY"&&finite(diagnostic?.score)?diagnostic.score:null;
 const current=(supply.rows??[]).filter((r:any)=>validDate(r?.observationDate)&&r.observationDate<=asOf).at(-1)??null;
 const gscpiRaw=latest(external.gscpiRows??[],asOf);
 const cutoff=new Date(asOf+"T12:00:00Z");cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);const cutoffDate=cutoff.toISOString().slice(0,10);
 const trend=(supply.rows??[]).filter((r:any)=>validDate(r?.observationDate)&&r.observationDate>=cutoffDate&&r.observationDate<=asOf&&r.status==="READY"&&finite(r.score)).map((r:any)=>({label:r.observationDate,value:r.score}));
 const indicators=[
  point("gscpi","NY Fed GSCPI",current?.gscpiScore??null,gscpiRaw?.value??null,"지수",gscpiRaw?.observationDate??current?.observationDate??null,"Federal Reserve Bank of New York",0.40),
  point("oilShock","WTI 유가충격",current?.oilScore??null,current?.oilShock??null,"log shock",current?.observationDate??null,"EIA / FRED stored series",0.20),
  point("gasolineShock","휘발유 충격",current?.gasolineScore??null,current?.gasolineShock??null,"log shock",current?.observationDate??null,"EIA / FRED stored series",0.10),
  point("copperShock","구리 충격",current?.copperScore??null,current?.copperShock??null,"log shock",current?.observationDate??null,"Stored copper series",0.10),
  point("industrialProduction","산업생산",current?.industrialProductionScore??null,current?.industrialProduction3mAnn??null,"%",current?.observationDate??null,"Federal Reserve / FRED",0.10),
  point("headlineCoreGap","Headline-Core 물가괴리",current?.headlineCoreGapScore??null,current?.headlineCoreGap??null,"%p",current?.observationDate??null,"BLS CPI stored series",0.10),
 ];
 return Response.json({
  status:score===null?"PARTIAL":"READY",score,asOfDate:asOf,methodologyVersion:"SUPPLY_SHOCK_R9",
  historyMode:supply.historyMode??"CURRENT_VINTAGE_ONLY",lookAheadSafe:supply.lookAheadSafe??false,
  missingFactors:Array.isArray(diagnostic?.missingFactors)?diagnostic.missingFactors:(current?.missing??[]),
  percentileContract:supply.percentileContract??null,indicators,trend,
 },{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
