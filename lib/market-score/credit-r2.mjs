import {buildBondVolatilityR6} from '../diagnostic-layer/bond-vol-r6-components.mjs';

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const clamp100=value=>Math.max(0,Math.min(100,value));
const WEIGHTS=Object.freeze({hy:0.35,ig:0.35,nfciCredit:0.10,bondVolatility:0.20});
const NFCI_MIN_VALID=260;

function normalize(rows=[]){
 const map=new Map();
 for(const row of rows??[]){
  const observationDate=row?.observationDate??row?.date;
  const raw=row?.value;
  const value=typeof raw==='number'?raw:Number(raw);
  if(!validDate(observationDate)||!finite(value))continue;
  map.set(observationDate,{observationDate,value});
 }
 return [...map.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}
function cmdiRows(rows=[]){
 return (rows??[]).filter(r=>validDate(r?.observationDate)).map(r=>({
  observationDate:r.observationDate,
  hy:finite(r?.hy)?r.hy:null,
  ig:finite(r?.ig)?r.ig:null,
 })).sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}
const cmdiScore=value=>finite(value)&&value>=0&&value<=1?100*(1-value):null;
function expandingInverse(rows=[],minValid=NFCI_MIN_VALID){
 const seen=[],out=[];
 for(const row of normalize(rows)){
  seen.push(row.value);
  let score=null;
  if(seen.length>=minValid){
   let below=0,equal=0;
   for(const v of seen){if(v<row.value)below++;else if(v===row.value)equal++;}
   score=100*(1-(below+0.5*equal)/seen.length);
  }
  out.push({...row,score:finite(score)?clamp100(score):null});
 }
 return out;
}
function latestAt(rows,date,field='score'){
 let latest=null;
 for(const row of rows??[]){
  if(row.observationDate>date)break;
  if(finite(row?.[field]))latest=row;
 }
 return latest;
}
function staleDays(from,to){
 if(!validDate(from)||!validDate(to))return null;
 return Math.floor((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000);
}
function indicator(id,name,score,rawValue,unit,observationDate,source,sourceKey){
 return {id,name,label:name,status:finite(score)?'READY':'UNAVAILABLE',score:finite(score)?clamp100(score):null,value:finite(rawValue)?rawValue:null,unit,observationDate,asOfDate:observationDate,source,sourceKey};
}
export function buildCreditR2({
 cmdi=[],
 nfciCredit=[],
 y2=[],y5=[],y10=[],y30=[],
 asOfDate,
}={}){
 if(!validDate(asOfDate))return {status:'UNAVAILABLE',score:null,reason:'INVALID_AS_OF',methodologyVersion:'CREDIT_R2_NFCI_4FACTOR_R1',indicators:[],trend:[]};

 const cmdiScored=cmdiRows(cmdi).filter(r=>r.observationDate<=asOfDate).map(r=>({
  ...r,hyScore:cmdiScore(r.hy),igScore:cmdiScore(r.ig),
 }));
 const nfciScored=expandingInverse(normalize(nfciCredit).filter(r=>r.observationDate<=asOfDate));
 const bond=buildBondVolatilityR6({y2,y5,y10,y30}).rows.filter(r=>r.observationDate<=asOfDate&&finite(r.score));

 const latestCmdi=latestAt(cmdiScored,asOfDate,'hyScore');
 const latestNfci=latestAt(nfciScored,asOfDate,'score');
 const latestBond=latestAt(bond,asOfDate,'score');
 const missing=[];
 if(!latestCmdi||!finite(latestCmdi.igScore))missing.push('credit-41','credit-42');
 if(!latestNfci)missing.push('credit-43');
 if(!latestBond)missing.push('credit-44');

 const current={
  hy:latestCmdi?.hyScore??null,
  ig:latestCmdi?.igScore??null,
  nfciCredit:latestNfci?.score??null,
  bondVolatility:latestBond?.score??null,
 };
 const score=Object.values(current).every(finite)
  ? clamp100(WEIGHTS.hy*current.hy+WEIGHTS.ig*current.ig+WEIGHTS.nfciCredit*current.nfciCredit+WEIGHTS.bondVolatility*current.bondVolatility)
  : null;

 const trend=[];
 for(const row of cmdiScored){
  if(!finite(row.hyScore)||!finite(row.igScore))continue;
  const n=latestAt(nfciScored,row.observationDate,'score');
  const b=latestAt(bond,row.observationDate,'score');
  if(!n||!b)continue;
  trend.push({label:row.observationDate,value:clamp100(WEIGHTS.hy*row.hyScore+WEIGHTS.ig*row.igScore+WEIGHTS.nfciCredit*n.score+WEIGHTS.bondVolatility*b.score)});
 }

 const indicators=[
  indicator('credit-41','HY 신용 스트레스',current.hy,latestCmdi?.hy??null,'지수',latestCmdi?.observationDate??null,'Federal Reserve Bank of New York','HY CMDI'),
  indicator('credit-42','IG 신용 스트레스',current.ig,latestCmdi?.ig??null,'지수',latestCmdi?.observationDate??null,'Federal Reserve Bank of New York','IG CMDI'),
  indicator('credit-43','신용여건',current.nfciCredit,latestNfci?.value??null,'지수',latestNfci?.observationDate??null,'Federal Reserve Bank of Chicago / FRED','NFCICREDIT'),
  indicator('credit-44','채권 변동성',current.bondVolatility,null,'점',latestBond?.observationDate??null,'U.S. Treasury / Federal Reserve Board H.15','2Y/5Y/10Y/30Y 20D realized volatility'),
 ];

 const gaps=[staleDays(latestCmdi?.observationDate,asOfDate),staleDays(latestNfci?.observationDate,asOfDate),staleDays(latestBond?.observationDate,asOfDate)].filter(Number.isFinite);
 const stale=gaps.some(x=>x>14);
 return {
  status:score===null?'PARTIAL':'READY',score,
  missingFactors:[...new Set(missing)],
  methodologyVersion:'CREDIT_R2_NFCI_4FACTOR_R1',
  weights:{...WEIGHTS},
  componentScores:current,
  indicators,trend:trend.slice(-520),
  freshness:stale?'SOFT_STALE':'CURRENT',
  stale,
  updatedAt:[latestCmdi?.observationDate,latestNfci?.observationDate,latestBond?.observationDate].filter(Boolean).sort().at(-1)??null,
  asOfDate,
  interpretation:'채권·신용 R2: HY CMDI 35% + IG CMDI 35% + Chicago Fed NFCI Credit 10% + 미 국채 변동성 20%. 0=극단적 신용 스트레스, 100=매우 양호.',
  historyMode:'CURRENT_VINTAGE_ONLY',
  lookAheadSafe:false,
 };
}
export const CREDIT_R2_CONTRACT=Object.freeze({
 methodologyVersion:'CREDIT_R2_NFCI_4FACTOR_R1',
 weights:WEIGHTS,
 nfciSeries:'NFCICREDIT',
 nfciMinValid:NFCI_MIN_VALID,
 missingReweight:false,
});
