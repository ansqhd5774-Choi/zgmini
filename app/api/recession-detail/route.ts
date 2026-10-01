import {env} from "cloudflare:workers";
import {marketOperationalStore,readStoredMarketInputs} from "../../../worker/market-operational-store.mjs";
import {buildRecessionDefenseR13} from "../../../lib/diagnostic-layer/recession-r13-components.mjs";
import {recessionDefense} from "../../../lib/diagnostic-layer/model.mjs";

const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const fields=[
 ["nfp","nfpScore",0.25],["realGdp","realGdpScore",0.15],["industrialProduction","industrialProductionScore",0.15],
 ["realPce","realPceScore",0.15],["sahmGap","unemploymentScore",0.10],["retailSales","retailSalesScore",0.10],["disposableIncome","disposableIncomeScore",0.10],
] as const;

function latest(rows:any[],field:string,asOf:string){
 let best:any=null;
 for(const row of rows??[]){
  if(typeof row?.observationDate!=="string"||row.observationDate>asOf||!finite(row?.[field]))continue;
  if(!best||row.observationDate>best.observationDate)best=row;
 }
 return best;
}
function snapshot(rows:any[],asOf:string){
 const scores:any={}; const components:any[]=[];
 for(const [rawField,scoreField,weight] of fields){
  const scoreRow=latest(rows,scoreField,asOf),rawRow=latest(rows,rawField,asOf);
  scores[rawField==="sahmGap"?"unemployment":rawField]=scoreRow?.[scoreField]??null;
  components.push({id:rawField,value:rawRow?.[rawField]??null,score:scoreRow?.[scoreField]??null,observationDate:rawRow?.observationDate??scoreRow?.observationDate??null,weight});
 }
 const result=recessionDefense(scores);
 return {status:result.status,score:result.score,components};
}
function findIndicator(snapshot:any,domainId:string,name:string){
 const domain=(snapshot?.body?.domains??[]).find((d:any)=>d?.id===domainId);
 return (domain?.indicators??[]).find((x:any)=>x?.name===name||x?.label===name)??null;
}

export async function GET(){
 const store=marketOperationalStore(env.DB);
 const [inputs,publicSnapshot]=await Promise.all([readStoredMarketInputs(store),store.readScore()]);
 const series=inputs?.series??{};
 const recession=buildRecessionDefenseR13({
  payems:series.PAYEMS??[],gdpc1:series.GDPC1??[],indpro:series.INDPRO??[],realPce:series.DPCERA3M086SBEA??[],
  unemployment:series.UNRATE??[],retailSales:series.RRSFS??[],disposableIncome:series.DSPIC96??[],
 });
 const latestDate=(recession.rows??[]).map((r:any)=>r?.observationDate).filter((x:any)=>typeof x==="string").sort().at(-1)??new Date().toISOString().slice(0,10);
 const current=snapshot(recession.rows,latestDate);
 const months=[...new Set((recession.rows??[]).map((r:any)=>r?.observationDate).filter((x:any)=>typeof x==="string"))].sort().slice(-12);
 const trend=months.map((date:any)=>{const s=snapshot(recession.rows,date);return s.status==="READY"&&finite(s.score)?{label:date,value:s.score}:null}).filter(Boolean);
 const supplementals=[
  {id:"initialClaims",...findIndicator(publicSnapshot,"employment","신규 실업수당 4W 평균")},
  {id:"yieldCurve",...findIndicator(publicSnapshot,"rates","장단기 금리차")},
  {id:"hyCreditStress",...findIndicator(publicSnapshot,"credit","HY 신용 스트레스")},
  {id:"creditConditions",...findIndicator(publicSnapshot,"credit","신용여건")},
 ].map((x:any)=>({id:x.id,name:x.name??x.label??null,status:x.status??"UNAVAILABLE",score:finite(x.score)?x.score:null,value:finite(x.value)?x.value:null,displayValue:x.displayValue??null,unit:x.unit??null,observationDate:x.observationDate??x.asOfDate??null,source:x.source??null}));
 return Response.json({
  status:current.status,score:current.score,asOfDate:latestDate,methodologyVersion:"RECESSION_R13_CURRENT_VINTAGE",
  historyMode:"STORED_INPUTS_CURRENT_VINTAGE",lookAheadSafe:false,trend,components:current.components,supplementals,
 },{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
