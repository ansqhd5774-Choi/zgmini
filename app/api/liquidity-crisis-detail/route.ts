import {env} from "cloudflare:workers";
import {marketOperationalStore,readStoredMarketInputs} from "../../../worker/market-operational-store.mjs";
import {buildBankEmergencyR7,buildFundingStressR7} from "../../../lib/diagnostic-layer/liquidity-funding-r7-components.mjs";
import {buildBankReservesR1,buildTgaR1,buildOnRrpR1,buildM2R1} from "../../../lib/diagnostic-layer/score-transform-r1.mjs";
import {buildBondVolatilityR6} from "../../../lib/diagnostic-layer/bond-vol-r6-components.mjs";
import {liquidityCrisisDefense} from "../../../lib/diagnostic-layer/model.mjs";

const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const validDate=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);

function latest(rows:any[],asOf:string,scoreField="score"){
 let best:any=null;
 for(const row of rows??[]){
  if(!validDate(row?.observationDate)||row.observationDate>asOf||!finite(row?.[scoreField]))continue;
  if(!best||row.observationDate>best.observationDate)best=row;
 }
 return best;
}
function point(id:string,name:string,row:any,value:number|null,unit:string,source:string){
 return {id,name,status:finite(row?.score)&&finite(value)?"READY":"PARTIAL",score:finite(row?.score)?row.score:null,value:finite(value)?value:null,unit,observationDate:validDate(row?.observationDate)?row.observationDate:null,source};
}
function bp(value:unknown){return finite(value)?value*100:null}
function percent(value:unknown){return finite(value)?value*100:null}

export async function GET(){
 const store=marketOperationalStore(env.DB);
 const [inputs,snapshot]=await Promise.all([readStoredMarketInputs(store),store.readScore()]);
 const body=snapshot?.body??{};
 const publicDomain=(body?.domains??[]).find((d:any)=>d?.id==="liquidity")??null;
 const publicDiag=body?.diagnostics8?.liquidityCrisisDefense??null;
 const asOf=validDate(body?.asOfDate)?body.asOfDate:validDate(publicDomain?.asOfDate)?publicDomain.asOfDate:new Date().toISOString().slice(0,10);
 const series=inputs?.series??{},external=inputs?.external??{};

 const bankEmergency=buildBankEmergencyR7({
  primaryCredit:series.WLCFLPCL??[],
  secondaryCredit:series.WLCFLSCL??[],
  btfp:series.H41RESPPALDKNWW??[],
  otherCreditExtensions:series.WLCFOCEL??[],
  totalCommercialBankAssets:series.TLAACBM027NBOG??[],
 });
 const funding=buildFundingStressR7({
  sofr:series.SOFR??[],iorb:series.IORB??[],obfr:series.OBFR??[],
  dvpRepo:external.dvpRepoRows??[],triPartyRepo:external.triPartyRepoRows??[],bankEmergency,
 });
 const reserves=buildBankReservesR1(series.WRESBAL??[]);
 const tga=buildTgaR1(series.WTREGEN??[]);
 const onRrp=buildOnRrpR1(series.RRPONTSYD??[]);
 const m2=buildM2R1(series.M2SL??[]);
 const bond=buildBondVolatilityR6({
  y2:series.DGS2??[],y5:series.DGS5??[],y10:series.DGS10??[],y30:series.DGS30??[],
 });

 const fundingRow=latest(funding.rows,asOf);
 const reserveRow=latest(reserves.rows,asOf);
 const tgaRow=latest(tga.rows,asOf);
 const onRrpRow=latest(onRrp.rows,asOf);
 const m2Row=latest(m2.rows,asOf);
 const bondRow=latest(bond.rows,asOf);
 const recalculated=liquidityCrisisDefense({
  fundingStress:fundingRow?.score??null,
  bankReserves:reserveRow?.score??null,
  tga:tgaRow?.score??null,
  onRrp:onRrpRow?.score??null,
  m2:m2Row?.score??null,
  bondVolatility:bondRow?.score??null,
 });

 const publicScore=publicDiag?.status==="READY"&&finite(publicDiag?.score)
  ? publicDiag.score
  : publicDomain?.status==="READY"&&finite(publicDomain?.score)
    ? publicDomain.score:null;

 const core=[
  {id:"fundingStress",name:"단기자금시장 스트레스",score:fundingRow?.score??null,observationDate:fundingRow?.observationDate??null,weight:0.25},
  {id:"bankReserves",name:"은행 준비금",score:reserveRow?.score??null,observationDate:reserveRow?.observationDate??null,weight:0.25},
  {id:"tga",name:"TGA 변화",score:tgaRow?.score??null,observationDate:tgaRow?.observationDate??null,weight:0.15},
  {id:"onRrp",name:"ON RRP 변화",score:onRrpRow?.score??null,observationDate:onRrpRow?.observationDate??null,weight:0.15},
  {id:"m2",name:"M2 증가율",score:m2Row?.score??null,observationDate:m2Row?.observationDate??null,weight:0.10},
  {id:"bondVolatility",name:"채권 변동성",score:bondRow?.score??null,observationDate:bondRow?.observationDate??null,weight:0.10},
 ];

 const a=latest(funding.components?.aScore??[],asOf);
 const b=latest(funding.components?.bScore??[],asOf);
 const c=latest(funding.components?.cScore??[],asOf);
 const d=latest(funding.components?.dScore??[],asOf);
 const bank=latest(bankEmergency.rows??[],asOf);
 const y2=latest(bond.legs?.y2??[],asOf),y5=latest(bond.legs?.y5??[],asOf),y10=latest(bond.legs?.y10??[],asOf),y30=latest(bond.legs?.y30??[],asOf);

 const indicators=[
  point("sofrIorb","SOFR−IORB 스프레드",a,bp(a?.rawValue),"bp","NY Fed / Federal Reserve"),
  point("obfrIorb","OBFR−IORB 스프레드",b,bp(b?.rawValue),"bp","NY Fed / Federal Reserve"),
  point("repoGap","DVP−Tri-Party Repo 격차",c,bp(c?.rawValue),"bp","NY Fed repo market data"),
  point("sofrIorbRv20","SOFR−IORB 20일 변동성",d,bp(d?.rawValue),"bp","NY Fed / Federal Reserve"),
  point("bankEmergency","은행 비상대출 비율",bank,percent(bank?.emergencyRatio),"%","Federal Reserve H.4.1 / bank assets"),
  point("bankReserves","은행 준비금",reserveRow,reserveRow?.value??null,"백만달러","Federal Reserve / WRESBAL"),
  point("tga","TGA 4주 변화",tgaRow,tgaRow?.value??null,"백만달러","U.S. Treasury / WTREGEN"),
  point("onRrp","ON RRP 20영업일 변화",onRrpRow,onRrpRow?.value??null,"십억달러","Federal Reserve / RRPONTSYD"),
  point("m2","M2 YoY",m2Row,m2Row?.value??null,"%","Federal Reserve / M2SL"),
  point("bond2y","미국 2년물 변동성",y2,y2?.rv20??null,"bp","U.S. Treasury / Federal Reserve H.15"),
  point("bond5y","미국 5년물 변동성",y5,y5?.rv20??null,"bp","U.S. Treasury / Federal Reserve H.15"),
  point("bond10y","미국 10년물 변동성",y10,y10?.rv20??null,"bp","U.S. Treasury / Federal Reserve H.15"),
  point("bond30y","미국 30년물 변동성",y30,y30?.rv20??null,"bp","U.S. Treasury / Federal Reserve H.15"),
 ];

 const trend=(Array.isArray(publicDomain?.trend)?publicDomain.trend:[])
  .filter((x:any)=>validDate(x?.label)&&finite(x?.value))
  .slice(-366);

 return Response.json({
  status:publicScore===null?"PARTIAL":"READY",
  score:publicScore,
  recalculatedScore:recalculated?.status==="READY"?recalculated.score:null,
  scoreMatch:publicScore!==null&&recalculated?.status==="READY"&&finite(recalculated.score)?Math.abs(publicScore-recalculated.score)<1e-9:false,
  asOfDate:asOf,
  methodologyVersion:"LIQUIDITY_CRISIS_DIAGNOSTIC_R1",
  historyMode:"STORED_PUBLIC_SCORE_HISTORY_NO_INTERPOLATION",
  lookAheadSafe:false,
  core,
  indicators,
  trend,
 },{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
