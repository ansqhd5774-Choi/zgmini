import {scoreCmdiComponentsR1} from "../../lib/diagnostic-layer/r1-diagnostic-pipeline.mjs";
import {buildBondVolatilityR6} from "../../lib/diagnostic-layer/bond-vol-r6-components.mjs";
import {creditRiskDefense} from "../../lib/diagnostic-layer/model.mjs";

const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const validDate=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);

function latest(rows:any[],asOf:string,field="score"){
 let best:any=null;
 for(const row of rows??[]){
  if(!validDate(row?.observationDate)||row.observationDate>asOf||!finite(row?.[field]))continue;
  if(!best||row.observationDate>best.observationDate)best=row;
 }
 return best;
}
function latestCredit(rows:any[],asOf:string){
 let best:any=null;
 for(const row of rows??[]){
  if(!validDate(row?.observationDate)||row.observationDate>asOf)continue;
  if(![row?.hyCmdi,row?.igCmdi,row?.totalCmdi].every(finite))continue;
  if(!best||row.observationDate>best.observationDate)best=row;
 }
 return best;
}
function point(id:string,name:string,score:number|null,value:number|null,unit:string,observationDate:string|null,source:string){
 return {id,name,status:finite(score)?"READY":"PARTIAL",score:finite(score)?score:null,value:finite(value)?value:null,unit,observationDate:validDate(observationDate)?observationDate:null,source};
}
function findPublicIndicator(snapshot:any,id:string){
 const domain=(snapshot?.body?.domains??[]).find((d:any)=>d?.id==="credit");
 return (domain?.indicators??[]).find((x:any)=>x?.id===id)??null;
}

export function buildProjection({inputs,snapshot,publicSnapshot,e1,nowIso}:any){
 const body=snapshot?.body??{};
 const asOf=validDate(body?.asOfDate)?body.asOfDate:nowIso.slice(0,10);
 const series=inputs?.series??{},external=inputs?.external??{};

 const cmdi=scoreCmdiComponentsR1(external.cmdiRows??[]);
 const bond=buildBondVolatilityR6({
  y2:series.DGS2??[],y5:series.DGS5??[],y10:series.DGS10??[],y30:series.DGS30??[],
 });
 const currentCmdi=latestCredit(cmdi,asOf);
 const currentBond=latest(bond.rows??[],asOf);
 const recalculated=creditRiskDefense({
  hyCmdi:currentCmdi?.hyCmdi??null,
  igCmdi:currentCmdi?.igCmdi??null,
  totalCmdi:currentCmdi?.totalCmdi??null,
  bondVolatility:currentBond?.score??null,
 });
 const publicDiag=body?.diagnostics8?.creditRiskDefense??null;
 const score=publicDiag?.status==="READY"&&finite(publicDiag?.score)?publicDiag.score:null;

 const cutoff=new Date(asOf+"T12:00:00Z");
 cutoff.setUTCDate(cutoff.getUTCDate()-365);
 const cutoffDate=cutoff.toISOString().slice(0,10);
 const trend=(cmdi??[]).filter((row:any)=>row.observationDate>=cutoffDate&&row.observationDate<=asOf).map((row:any)=>{
  const b=latest(bond.rows??[],row.observationDate);
  if(![row?.hyCmdi,row?.igCmdi,row?.totalCmdi,b?.score].every(finite))return null;
  const r=creditRiskDefense({hyCmdi:row.hyCmdi,igCmdi:row.igCmdi,totalCmdi:row.totalCmdi,bondVolatility:b.score});
  return r.status==="READY"&&finite(r.score)?{label:row.observationDate,value:r.score}:null;
 }).filter(Boolean);

 const core=[
  {id:"hyCmdi",name:"HY CMDI",score:currentCmdi?.hyCmdi??null,value:currentCmdi?.raw?.hy??null,unit:"지수",observationDate:currentCmdi?.observationDate??null,weight:0.35,source:"Federal Reserve Bank of New York"},
  {id:"igCmdi",name:"IG CMDI",score:currentCmdi?.igCmdi??null,value:currentCmdi?.raw?.ig??null,unit:"지수",observationDate:currentCmdi?.observationDate??null,weight:0.35,source:"Federal Reserve Bank of New York"},
  {id:"totalCmdi",name:"Total CMDI",score:currentCmdi?.totalCmdi??null,value:currentCmdi?.raw?.market??null,unit:"지수",observationDate:currentCmdi?.observationDate??null,weight:0.10,source:"Federal Reserve Bank of New York / Market CMDI"},
  {id:"bondVolatility",name:"채권 변동성",score:currentBond?.score??null,value:null,unit:"점",observationDate:currentBond?.observationDate??null,weight:0.20,source:"U.S. Treasury / Federal Reserve Board H.15"},
 ];

 const nfci:any=findPublicIndicator(snapshot,"credit-43")??{};
 const y2=latest(bond.legs?.y2??[],asOf),y5=latest(bond.legs?.y5??[],asOf),y10=latest(bond.legs?.y10??[],asOf),y30=latest(bond.legs?.y30??[],asOf);
 const supplementals=[
  point("nfciCredit","NFCI Credit",finite(nfci?.score)?nfci.score:null,finite(nfci?.value)?nfci.value:null,nfci?.unit??"지수",nfci?.observationDate??nfci?.asOfDate??null,nfci?.source??"Chicago Fed / FRED"),
  point("bond2y","미국 2년물 변동성",y2?.score??null,y2?.rv20??null,"bp",y2?.observationDate??null,"U.S. Treasury / Federal Reserve Board H.15"),
  point("bond5y","미국 5년물 변동성",y5?.score??null,y5?.rv20??null,"bp",y5?.observationDate??null,"U.S. Treasury / Federal Reserve Board H.15"),
  point("bond10y","미국 10년물 변동성",y10?.score??null,y10?.rv20??null,"bp",y10?.observationDate??null,"U.S. Treasury / Federal Reserve Board H.15"),
  point("bond30y","미국 30년물 변동성",y30?.score??null,y30?.rv20??null,"bp",y30?.observationDate??null,"U.S. Treasury / Federal Reserve Board H.15"),
 ];

 return {
  status:score===null?"PARTIAL":"READY",
  score,
  recalculatedScore:recalculated?.status==="READY"?recalculated.score:null,
  scoreMatch:score!==null&&recalculated?.status==="READY"&&finite(recalculated.score)?Math.abs(score-recalculated.score)<1e-9:false,
  asOfDate:asOf,
  methodologyVersion:"CREDIT_RISK_DIAGNOSTIC_R1",
  historyMode:"CURRENT_VINTAGE_DERIVED_1Y",
  lookAheadSafe:false,
  core,supplementals,trend,
 };
}
