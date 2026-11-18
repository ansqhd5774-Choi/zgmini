import {marketOperationalStore} from './candidate-market-operational-store.mjs';
import {calculateConsumptionR5,CONSUMPTION_R5} from '../lib/market-score/consumption-r5.mjs';

const SCORED_IDS=Object.freeze(['pce3','pce12','perCapita','income3','income12','employment','payroll','saving','debt','delinquency','diffusion','goods','services']);
const DIAGNOSTIC_IDS=Object.freeze(['gap','acceleration']);
const INPUT_RELEASE_REFS=Object.freeze({
 pce3:[['realPce',0],['realPce',3]],pce12:[['realPce',0],['realPce',12]],
 perCapita:[['realPcePerCapita',0],['realPcePerCapita',12]],
 income3:[['realIncome',0],['realIncome',3]],income12:[['realIncome',0],['realIncome',12]],
 employment:[['employmentRatio',0],['employmentRatio',12]],
 payroll:[['realPayroll',0],['realPayroll',12]],saving:[['savingRate',0]],
 debt:[['consumerDebtService',0]],delinquency:[['consumerDelinquency',0]],
 goods:[['realGoods',0],['realGoods',12]],services:[['realServices',0],['realServices',12]],
 gap:[['realPce',0],['realPce',3],['realIncome',0],['realIncome',3]],
 acceleration:[['realPce',0],['realPce',3],['realPce',6]],
});
const validScore=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const monthIndex=d=>typeof d==='string'&&/^\d{4}-(0[1-9]|1[0-2])-01$/.test(d)
 ? Number(d.slice(0,4))*12+Number(d.slice(5,7))-1:null;
const monthFromIndex=i=>`${Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}-01`;
const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)
 &&Number.isFinite(Date.parse(d+'T00:00:00Z'))
 &&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;

// This is the latest required SOURCE observation's release eligibility, not
// the score's publication timestamp, a forecast, or a historical PIT proof.
// All dates come from the same saved R5 input and are verified against asOf.
function actualAvailableAt(input,indicator,asOf){
 if(indicator?.status!=='READY'||monthIndex(indicator?.observationDate)===null)return null;
 const base=monthIndex(indicator.observationDate);
 const refs=indicator.id==='diffusion'
  ?(Array.isArray(input?.categoryIds)&&input.categoryIds.length>0
      &&new Set(input.categoryIds).size===input.categoryIds.length
      ?input.categoryIds.flatMap(id=>[[id,0],[id,3]]):null)
  :INPUT_RELEASE_REFS[indicator.id];
 if(!Array.isArray(refs)||!refs.length||!validDay(asOf))return null;
 const releases=[];
 for(const [seriesId,lag] of refs){
  const month=monthFromIndex(base-lag);
  const found=Array.isArray(input?.series?.[seriesId])
   ?input.series[seriesId].filter(row=>row?.observationDate===month):[];
  if(found.length!==1||!validDay(found[0].availableDate)
     ||found[0].availableDate>asOf
     ||typeof found[0].value!=='number'||!Number.isFinite(found[0].value))return null;
  releases.push(found[0].availableDate);
 }
 return releases.sort().at(-1)??null;
}

// Project only already-calculated monthly factor scores. No source bulk rows,
// raw ratios, percentile reference distributions or unscored diagnostic values.
export function projectConsumptionR5Public(result,input){
 const {rows:privateRows,...domain}=result??{};
 const original=Array.isArray(domain.indicators)?domain.indicators:[];
 const disabled=()=>({...domain,indicators:original.map(item=>({...item,trend:[]}))});
 if(domain.methodologyVersion!==CONSUMPTION_R5||domain.status!=='READY'
  ||!validScore(domain.score)||monthIndex(domain.updatedAt)===null
  ||!validDay(domain.asOfDate)||domain.updatedAt>domain.asOfDate
  ||original.length!==15||!SCORED_IDS.every((id,i)=>original[i]?.id===id)
  ||!DIAGNOSTIC_IDS.every((id,i)=>original[13+i]?.id===id)
  ||!Array.isArray(privateRows)||!privateRows.length)return disabled();
 const currentMonth=monthIndex(domain.updatedAt);
 const months=new Set();
 const saved=[];
 for(const row of privateRows){
  const idx=monthIndex(row?.date);
  if(idx===null||idx>currentMonth||row.date>domain.asOfDate||months.has(idx)
   ||!Array.isArray(row?.indicators)||row.indicators.length!==13
   ||!SCORED_IDS.every((id,i)=>row.indicators[i]?.id===id))return disabled();
  months.add(idx);
  if(idx>=currentMonth-12)saved.push({...row,monthIndex:idx});
 }
 saved.sort((a,b)=>a.monthIndex-b.monthIndex);
 const latest=saved.at(-1);
 if(!latest||latest.date!==domain.updatedAt||!validScore(latest.score)
   ||Math.abs(latest.score-domain.score)>1e-7)return disabled();
 const projected=original.map((factor,i)=>{
  const releaseCadence=['debt','delinquency'].includes(factor.id)?'분기':'월간';
  const availableAt=actualAvailableAt(input,factor,domain.asOfDate);
  if(i>=13)return {...factor,trend:[],releaseCadence,availableAt};
  const current=latest.indicators[i];
  if(factor.status!=='READY'||!validScore(factor.score)
    ||current.status!=='READY'||!validScore(current.score)
    ||Math.abs(current.score-factor.score)>1e-7)
   return {...factor,trend:[],releaseCadence,availableAt};
  let previous=null,previousMissing=false,invalid=false;
  const trend=saved.map(row=>{
   const point=row.indicators[i];
   if(point.status==='READY'&&!validScore(point.score))invalid=true;
   const value=point.status==='READY'&&validScore(point.score)?point.score:null;
   const breakBefore=previous!==null&&(row.monthIndex!==previous+1||previousMissing);
   previous=row.monthIndex;
   previousMissing=value===null;
   return {label:row.date,value,status:value===null?'PARTIAL':'READY',
    ...(breakBefore?{breakBefore:true}:{})};
  });
  return {...factor,trend:invalid?[]:trend,releaseCadence,availableAt};
 });
 return {...domain,indicators:projected};
}

export async function loadStoredConsumptionR5(db,{asOf}={}){
 const unavailable=reason=>({status:'PARTIAL',score:null,trend:[],indicators:[],updatedAt:null,methodologyVersion:CONSUMPTION_R5,missingFactors:[reason]});
 if(!db)return unavailable('R5_STORAGE_MISSING');
 try{
  const input=await marketOperationalStore(db).readInput('consumption-r5');
  if(!input)return unavailable('R5_INPUT_PENDING');
  const now=Date.parse(asOf+'T23:59:59Z');
  if(!Number.isFinite(now)||input.storedAt>now||now-input.storedAt>7*86400000)return unavailable('R5_COLLECTION_STALE');
  const result=calculateConsumptionR5(input.body,{asOfDate:asOf});
  if(result.updatedAt&&now-Date.parse(result.updatedAt)>120*86400000)return unavailable('R5_OBSERVATION_STALE');
  const domain=projectConsumptionR5Public(result,input.body);
  return {...domain,freshness:'STORED_MONTHLY_R5',sourceStoredAt:input.storedAt,sourceVersion:input.body.sourceVersion};
 }catch{return unavailable('R5_STORAGE_INVALID');}
}
