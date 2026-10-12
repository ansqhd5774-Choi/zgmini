import {
  E1_R5_SEC_CONTRACT,
  secUnitAllowed,
} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {quarterFromCumulative} from "../../lib/market-score/earnings-e1-r5-contract.mjs";

export const VERSION="E1-R5-FISCAL-PERIOD-SELECTOR-R2";
const DEFAULT_MAX_AGE_DAYS=185;
const DAY_MS=86400000;
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();

function day(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const ms=Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms)?Math.floor(ms/DAY_MS):null;
}
function duration(fact){
  const start=day(fact?.start),end=day(fact?.end);
  return start!=null&&end!=null&&end>=start?end-start+1:null;
}
function ageDays(fact,asOf){
  const end=day(fact?.end),cutoff=day(asOf);
  return end!=null&&cutoff!=null?cutoff-end:null;
}
function normalizeFp(value){
  const fp=clean(value).toUpperCase();
  return ["Q1","Q2","Q3","FY"].includes(fp)?fp:null;
}
function normalizeFy(value){
  const fy=Number(value);
  return Number.isInteger(fy)&&fy>=1900&&fy<=2200?fy:null;
}

// Approved E1-R5 pair geometry: period dates/duration are binding.
// SEC FY/FP are retained as diagnostics only and MUST NOT reject an otherwise valid pair.
export function fiscalPairGeometryCompatible(current,prior){
  if(!current||!prior)return false;
  const curEnd=day(current.end),priorEnd=day(prior.end);
  if(curEnd==null||priorEnd==null)return false;
  const gap=curEnd-priorEnd;
  if(gap<320||gap>410)return false;
  const curDuration=current.duration??duration(current),priorDuration=prior.duration??duration(prior);
  if(!Number.isInteger(curDuration)||!Number.isInteger(priorDuration)||Math.abs(curDuration-priorDuration)>45)return false;
  return true;
}
function sameQuarterPeriod(fact,target){
  if(!fact||!target||fact.end!==target.end)return false;
  const a=fact.duration??duration(fact),b=target.duration??duration(target);
  return Number.isInteger(a)&&Number.isInteger(b)&&Math.abs(a-b)<=15;
}
function factsForMetric(document,metric,asOf,{maxDuration=400}={}){
  const out=[];
  const cutoff=day(asOf);
  if(cutoff==null)return out;
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const concept=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag];
    if(!concept?.units||typeof concept.units!=="object")continue;
    for(const [unit,rows] of Object.entries(concept.units)){
      if(!secUnitAllowed(metric,unit)||!Array.isArray(rows))continue;
      for(const row of rows){
        if(!row||!E1_R5_SEC_CONTRACT.forms.includes(clean(row.form))||!finite(row.val))continue;
        if(day(row.filed)==null||row.filed>asOf)continue;
        const d=duration(row);if(!Number.isInteger(d)||d<55||d>maxDuration)continue;
        const end=day(row.end);if(end==null||end>cutoff)continue;
        out.push({...row,tag,unit,duration:d,fp:normalizeFp(row.fp),fy:normalizeFy(row.fy)});
      }
    }
  }
  return out;
}
function periodKey(row){return `${row.tag}|${row.unit}|${row.start}|${row.end}`;}
function chooseLatestSafe(rows){
  if(!rows.length)return {fact:null,reason:"NO_FACT"};
  const sorted=[...rows].sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||String(b.accn??"").localeCompare(String(a.accn??"")));
  const latestFiled=sorted[0].filed;
  const top=sorted.filter(row=>row.filed===latestFiled);
  const values=[...new Set(top.map(row=>row.val))];
  if(values.length!==1)return {fact:null,reason:"LATEST_FILED_VALUE_CONFLICT"};
  return {fact:top[0],reason:null};
}
function uniquePeriodFacts(document,metric,asOf,{maxDuration=120}={}){
  const rows=factsForMetric(document,metric,asOf,{maxDuration});
  const grouped=new Map();
  for(const row of rows){
    const key=periodKey(row);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(row);
  }
  const facts=[];let conflicts=0;
  for(const rowsForPeriod of grouped.values()){
    const selected=chooseLatestSafe(rowsForPeriod);
    if(selected.fact)facts.push(selected.fact);else if(selected.reason==="LATEST_FILED_VALUE_CONFLICT")conflicts++;
  }
  facts.sort((a,b)=>day(b.end)-day(a.end)||String(b.filed).localeCompare(String(a.filed)));
  return {facts,conflicts};
}

export function selectFiscalComparablePairR2(document,{metric,asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  const {facts,conflicts}=uniquePeriodFacts(document,metric,asOf,{maxDuration:120});
  if(!facts.length)return {current:null,prior:null,reason:conflicts?"PERIOD_CONFLICT":"NO_QUARTER_FACT",conflicts};
  let sawRecent=false;
  for(const current of facts){
    const age=ageDays(current,asOf);
    if(!Number.isInteger(age)||age<0||age>maxAgeDays)continue;
    sawRecent=true;
    const priors=facts.filter(prior=>
      prior.tag===current.tag&&prior.unit===current.unit&&prior.end!==current.end&&
      fiscalPairGeometryCompatible(current,prior)
    ).sort((a,b)=>{
      const gapA=Math.abs((day(current.end)-day(a.end))-365),gapB=Math.abs((day(current.end)-day(b.end))-365);
      if(gapA!==gapB)return gapA-gapB;
      const durA=Math.abs(current.duration-a.duration),durB=Math.abs(current.duration-b.duration);
      if(durA!==durB)return durA-durB;
      return day(b.end)-day(a.end)||String(b.filed).localeCompare(String(a.filed));
    });
    if(priors.length)return {current,prior:priors[0],reason:null,ageDays:age,conflicts};
  }
  return {current:null,prior:null,reason:sawRecent?"NO_COMPARABLE_PRIOR":"NO_RECENT_QUARTER",conflicts};
}

export function selectFiscalCurrentQuarterR2(document,{metric,asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  const {facts,conflicts}=uniquePeriodFacts(document,metric,asOf,{maxDuration:120});
  for(const fact of facts){
    const age=ageDays(fact,asOf);
    if(Number.isInteger(age)&&age>=0&&age<=maxAgeDays)return {fact,reason:null,ageDays:age,conflicts};
  }
  return {fact:null,reason:facts.length?"NO_RECENT_QUARTER":conflicts?"PERIOD_CONFLICT":"NO_QUARTER_FACT",ageDays:null,conflicts};
}

function selectSameTagPeriodPairR2(document,metric,asOf,currentTarget,priorTarget){
  const {facts}=uniquePeriodFacts(document,metric,asOf,{maxDuration:120});
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const current=facts.filter(fact=>fact.tag===tag&&sameQuarterPeriod(fact,currentTarget));
    const prior=facts.filter(fact=>fact.tag===tag&&sameQuarterPeriod(fact,priorTarget));
    if(!current.length||!prior.length)continue;
    const c=current[0],p=prior[0];
    if(!fiscalPairGeometryCompatible(c,p))continue;
    return {current:c,prior:p,tag};
  }
  return {current:null,prior:null,tag:null};
}

export function selectFiscalMarginPairR2(document,{asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  const revenue=selectFiscalComparablePairR2(document,{metric:"revenue",asOf,maxAgeDays});
  if(!revenue.current)return {revenueCurrent:null,revenuePrior:null,opCurrent:null,opPrior:null,reason:"REVENUE_PAIR_MISSING"};
  const operating=selectSameTagPeriodPairR2(document,"operatingIncome",asOf,revenue.current,revenue.prior);
  if(!operating.current)return {revenueCurrent:revenue.current,revenuePrior:revenue.prior,opCurrent:null,opPrior:null,reason:"OPERATING_INCOME_PAIR_MISSING"};
  return {revenueCurrent:revenue.current,revenuePrior:revenue.prior,opCurrent:operating.current,opPrior:operating.prior,reason:null};
}

function uniqueFlowFacts(document,metric,asOf){return uniquePeriodFacts(document,metric,asOf,{maxDuration:400}).facts;}
export function selectFiscalQuarterFlowR2(document,{metric,asOf,target}={}){
  if(!target?.end)return {value:null,method:null,fact:null,priorFact:null,reason:"TARGET_PERIOD_MISSING"};
  const facts=uniqueFlowFacts(document,metric,asOf);
  const direct=facts.filter(fact=>fact.duration<=120&&sameQuarterPeriod(fact,target));
  if(direct.length)return {value:direct[0].val,method:"DIRECT_QUARTER",fact:direct[0],priorFact:null,reason:null};
  const cumulative=facts.filter(fact=>fact.duration>120&&fact.end===target.end)
    .sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||b.duration-a.duration);
  for(const current of cumulative){
    const priors=facts.filter(prior=>
      prior.tag===current.tag&&prior.unit===current.unit&&prior.start===current.start&&
      day(prior.end)<day(current.end)&&day(current.end)-day(prior.end)>=55&&day(current.end)-day(prior.end)<=125&&
      prior.duration<current.duration
    ).sort((a,b)=>Math.abs((day(current.end)-day(a.end))-90)-Math.abs((day(current.end)-day(b.end))-90)||day(b.end)-day(a.end));
    if(!priors.length)continue;
    const value=quarterFromCumulative(current.val,priors[0].val);
    if(finite(value))return {value,method:"CUMULATIVE_DELTA",fact:current,priorFact:priors[0],reason:null};
  }
  return {value:null,method:null,fact:null,priorFact:null,reason:facts.length?"NO_ALIGNED_QUARTER_FLOW":"NO_FLOW_FACT"};
}
