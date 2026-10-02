import {env} from "cloudflare:workers";
import {marketOperationalStore,readStoredMarketInputs} from "../../../worker/market-operational-store.mjs";
import {buildDebtRiskBatchA} from "../../../lib/diagnostic-layer/batch-a-components.mjs";
import {buildBisDebtRiskComponents} from "../../../lib/diagnostic-layer/bis-debt-components.mjs";
import {scoreCmdiComponentsR1} from "../../../lib/diagnostic-layer/r1-diagnostic-pipeline.mjs";

const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const validDate=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
function latest(rows:any[],asOf:string,field="value"){let best:any=null;for(const row of rows??[]){if(!validDate(row?.observationDate)||row.observationDate>asOf||!finite(row?.[field]))continue;if(!best||row.observationDate>best.observationDate)best=row}return best}
function safeBis(dsr:any,tc:any){if(!dsr||!tc)return null;try{return buildBisDebtRiskComponents(dsr,tc)}catch{return null}}
function row(id:string,name:string,score:any,raw:any,unit:string,source:string,weight:number){return {id,name,status:finite(score?.value)?"READY":"PARTIAL",score:finite(score?.value)?score.value:null,value:finite(raw?.value)?raw.value:null,unit,observationDate:score?.observationDate??raw?.observationDate??null,source,weight}}

export async function GET(){
 const store=marketOperationalStore(env.DB);
 const [inputs,snapshot]=await Promise.all([readStoredMarketInputs(store),store.readScore()]);
 const body=snapshot?.body??{},asOf=validDate(body?.asOfDate)?body.asOfDate:new Date().toISOString().slice(0,10);
 const series=inputs?.series??{},external=inputs?.external??{};
 const batch=buildDebtRiskBatchA({netInterest:series.B471RC1Q027SBEA??[],grossValueAdded:series.A455RC1Q027SBEA??[],profitsBeforeTax:series.A464RC1Q027SBEA??[]});
 const bis=safeBis(external.bisDsrParsed??null,external.bisDebtGdpParsed??null);
 const diagnostic=body?.diagnostics8?.debtRiskSafety??null;
 const score=diagnostic?.status==="READY"&&finite(diagnostic?.score)?diagnostic.score:null;
 const cmdi=scoreCmdiComponentsR1(external.cmdiRows??[]);
 const credit=(cmdi??[]).filter((r:any)=>validDate(r?.observationDate)&&r.observationDate<=asOf&&finite(r?.totalCmdi)).at(-1)??null;
 const dsrScore=latest(bis?.dsr?.score??[],asOf),dsrRaw=latest(bis?.dsr?.raw??[],asOf);
 const debtScore=latest(bis?.debtGdp?.score??[],asOf),debtRaw=latest(bis?.debtGdp?.raw??[],asOf);
 const rateScore=latest(batch.rateBurden.score??[],asOf),rateRaw=latest(batch.rateBurden.raw??[],asOf);
 const capScore=latest(batch.debtServiceCapacity.score??[],asOf),capRaw=latest(batch.debtServiceCapacity.level??[],asOf);
 const indicators=[
  row("dsr","Debt Service Ratio",dsrScore,dsrRaw,"%",bis?.dsr?.title??"BIS",0.35),
  row("debtGdp","민간부채/GDP",debtScore,debtRaw,"%",bis?.debtGdp?.title??"BIS",0.25),
  row("rateBurden","금리부담",rateScore,rateRaw,"%","BEA",0.15),
  {id:"creditStress",name:"신용스트레스",status:finite(credit?.totalCmdi)?"READY":"PARTIAL",score:finite(credit?.totalCmdi)?credit.totalCmdi:null,value:finite(credit?.raw?.market)?credit.raw.market:null,unit:"지수",observationDate:credit?.observationDate??null,source:"Federal Reserve Bank of New York / Market CMDI",weight:0.15},
  row("debtServiceCapacity","부채상환능력",capScore,capRaw,"배","BEA",0.10),
 ];
 return Response.json({status:score===null?"PARTIAL":"READY",score,asOfDate:asOf,methodologyVersion:"DEBT_RISK_R7",historyMode:"CURRENT_VINTAGE_ONLY",lookAheadSafe:false,missingFactors:Array.isArray(diagnostic?.missingFactors)?diagnostic.missingFactors:["creditStress"],indicators,trend:[]},{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
