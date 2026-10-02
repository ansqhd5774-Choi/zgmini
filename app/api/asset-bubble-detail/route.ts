import {env} from "cloudflare:workers";
import {marketOperationalStore,readStoredMarketInputs} from "../../../worker/market-operational-store.mjs";
import {buildAssetBubbleBatchA} from "../../../lib/diagnostic-layer/batch-a-components.mjs";
import {buildAssetBubbleR9Partial,buildPriceAccelerationR9,buildSpeculativeFlowsR9} from "../../../lib/diagnostic-layer/asset-bubble-r9-components.mjs";

const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const validDate=(v:unknown):v is string=>typeof v==="string"&&/^\\d{4}-\\d{2}-\\d{2}$/.test(v);
function latest(rows:any[],asOf:string,field="value"){let best:any=null;for(const row of rows??[]){if(!validDate(row?.observationDate)||row.observationDate>asOf||!finite(row?.[field]))continue;if(!best||row.observationDate>best.observationDate)best=row}return best}
function valuePoint(id:string,name:string,scoreRow:any,rawRow:any,unit:string,source:string,weight:number){return {id,name,status:finite(scoreRow?.value)?"READY":"PARTIAL",score:finite(scoreRow?.value)?scoreRow.value:null,value:finite(rawRow?.value)?rawRow.value:null,unit,observationDate:scoreRow?.observationDate??rawRow?.observationDate??null,source,weight}}
export async function GET(){
 const store=marketOperationalStore(env.DB);
 const [inputs,snapshot]=await Promise.all([readStoredMarketInputs(store),store.readScore()]);
 const body=snapshot?.body??{},asOf=validDate(body?.asOfDate)?body.asOfDate:new Date().toISOString().slice(0,10);
 const series=inputs?.series??{},external=inputs?.external??{};
 const batch=buildAssetBubbleBatchA({publicFinancialEquity:series.BOGZ1LM793164115Q??[],publicNonfinancialEquity:series.BOGZ1LM103164115Q??[],nominalGdp:series.GDP??[],riskAssetShare:series.BOGZ1FL153064486Q??[],m2:series.M2SL??[]});
 const price=buildPriceAccelerationR9(external.assetPriceRows??[]);
 const spec=buildSpeculativeFlowsR9(external.speculativeFlowMagnitude4QRows??[],price.quarterly);
 const bubble=buildAssetBubbleR9Partial({valuationScoreRows:batch.valuation.score,priceAccelerationQuarterRows:price.quarterly,riskAssetShareScoreRows:batch.riskAssetShare.score,speculativeFlowRows:spec.rows,excessLiquidityScoreRows:batch.excessLiquidity.score,breadthScoreRows:external.breadthScoreRows??[]});
 const diag=body?.diagnostics8?.assetBubbleSafety??null;
 const score=diag?.status==="READY"&&finite(diag?.score)?diag.score:null;
 const current=(bubble.rows??[]).filter((r:any)=>validDate(r?.observationDate)&&r.observationDate<=asOf).at(-1)??null;
 const cutoff=new Date(asOf+"T12:00:00Z");cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);const cutoffDate=cutoff.toISOString().slice(0,10);
 const trend=(bubble.rows??[]).filter((r:any)=>validDate(r?.observationDate)&&r.observationDate>=cutoffDate&&r.observationDate<=asOf&&r.status==="READY"&&finite(r.score)).map((r:any)=>({label:r.observationDate,value:r.score}));
 const valuationScore=latest(batch.valuation.score,asOf),valuationRaw=latest(batch.valuation.raw,asOf);
 const riskScore=latest(batch.riskAssetShare.score,asOf),riskRaw=latest(batch.riskAssetShare.change4q,asOf);
 const excessScore=latest(batch.excessLiquidity.score,asOf),excessRaw=latest(batch.excessLiquidity.raw,asOf);
 const priceRow=(price.quarterly??[]).filter((r:any)=>validDate(r?.observationDate)&&r.observationDate<=asOf&&finite(r?.priceAccelScore)).at(-1)??null;
 const specRow=(spec.rows??[]).filter((r:any)=>validDate(r?.observationDate)&&r.observationDate<=asOf&&finite(r?.score)).at(-1)??null;
 const breadthRow=latest(external.breadthScoreRows??[],asOf,"score");
 const indicators=[
  valuePoint("valuationPressure","밸류에이션 압력",valuationScore,valuationRaw,"배","Federal Reserve Z.1 / BEA",0.35),
  {id:"priceAcceleration",name:"가격가속",status:finite(priceRow?.priceAccelScore)?"READY":"PARTIAL",score:finite(priceRow?.priceAccelScore)?priceRow.priceAccelScore:null,value:finite(priceRow?.priceAccelRaw)?priceRow.priceAccelRaw:null,unit:"log 가속",observationDate:priceRow?.observationDate??null,source:"Stored asset price series",weight:0.25},
  valuePoint("riskAssetShare","위험자산 비중",riskScore,riskRaw,"%p","Federal Reserve Z.1",0.15),
  {id:"speculativeFlows",name:"투기성 자금흐름",status:finite(specRow?.score)?"READY":"PARTIAL",score:finite(specRow?.score)?specRow.score:null,value:finite(specRow?.flowMagnitude4Q)?specRow.flowMagnitude4Q:null,unit:"4Q 흐름",observationDate:specRow?.observationDate??null,source:"Stored flow magnitude",weight:0.10},
  {id:"breadthDivergence",name:"시장폭 괴리",status:finite(breadthRow?.score)?"READY":"PARTIAL",score:finite(breadthRow?.score)?breadthRow.score:null,value:null,unit:"점",observationDate:breadthRow?.observationDate??null,source:"Stored breadth score",weight:0.10},
  valuePoint("excessLiquidity","과잉유동성",excessScore,excessRaw,"%p","Federal Reserve M2 / BEA GDP",0.05),
 ];
 return Response.json({status:score===null?"PARTIAL":"READY",score,asOfDate:asOf,methodologyVersion:"ASSET_BUBBLE_R9",historyMode:"CURRENT_VINTAGE_DERIVED_1Y",lookAheadSafe:false,missingFactors:Array.isArray(diag?.missingFactors)?diag.missingFactors:(current?.missing??[]),indicators,trend},{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
