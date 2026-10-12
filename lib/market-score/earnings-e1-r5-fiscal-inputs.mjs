import {
  E1_R5_FISCAL_POLICY,
  E1_R5_SEC_CONTRACT,
  approvedS5FallbackForCik,
  padSecCik,
  secUnitAllowed,
  validateSecCompanyFactsDocument,
} from "./earnings-e1-r5-input-contract.mjs";

export const E1_R5_FISCAL_INPUT_VERSION="E1-R5-FISCAL-INPUT-R1";
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
function periodKey(row){return `${row.tag}|${row.unit}|${row.start}|${row.end}`;}

export function fiscalPairGeometryCompatible(current,prior){
  if(!current||!prior)return false;
  const curEnd=day(current.end),priorEnd=day(prior.end);
  if(curEnd==null||priorEnd==null)return false;
  const gap=curEnd-priorEnd;
  if(gap<E1_R5_FISCAL_POLICY.pairYearGapDays.min||gap>E1_R5_FISCAL_POLICY.pairYearGapDays.max)return false;
  const curDuration=current.duration??duration(current),priorDuration=prior.duration??duration(prior);
  return Number.isInteger(curDuration)&&Number.isInteger(priorDuration)&&Math.abs(curDuration-priorDuration)<=E1_R5_FISCAL_POLICY.pairDurationToleranceDays;
}

export function sameFiscalAnchor(fact,target){
  if(!fact||!target)return false;
  const a=day(fact.end),b=day(target.end);
  if(a==null||b==null||Math.abs(a-b)>E1_R5_FISCAL_POLICY.sameQuarterEndToleranceDays)return false;
  const ad=fact.duration??duration(fact),bd=target.duration??duration(target);
  return Number.isInteger(ad)&&Number.isInteger(bd)&&Math.abs(ad-bd)<=E1_R5_FISCAL_POLICY.sameQuarterDurationToleranceDays;
}

function chooseLatestSafe(rows){
  if(!rows.length)return {fact:null,reason:"NO_FACT"};
  const sorted=[...rows].sort((a,b)=>String(b.filed??"").localeCompare(String(a.filed??""))||String(b.accn??"").localeCompare(String(a.accn??"")));
  const latestFiled=String(sorted[0].filed??"");
  const top=sorted.filter(row=>String(row.filed??"")===latestFiled);
  const values=[...new Set(top.map(row=>row.val))];
  if(values.length!==1)return {fact:null,reason:"LATEST_FILED_VALUE_CONFLICT"};
  return {fact:top[0],reason:null};
}

function factsForTags(document,tags,metric,asOf,{maxDuration=400,unit="USD"}={}){
  const out=[];
  const cutoff=day(asOf);
  if(cutoff==null)return out;
  for(const tag of tags??[]){
    const concept=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag];
    if(!concept?.units||typeof concept.units!=="object")continue;
    for(const [factUnit,rows] of Object.entries(concept.units)){
      const allowed=metric?secUnitAllowed(metric,factUnit):factUnit===unit;
      if(!allowed||!Array.isArray(rows))continue;
      for(const row of rows){
        if(!row||!E1_R5_SEC_CONTRACT.forms.includes(clean(row.form))||!finite(row.val))continue;
        if(day(row.filed)==null||row.filed>asOf)continue;
        const d=duration(row);if(!Number.isInteger(d)||d<55||d>maxDuration)continue;
        const end=day(row.end);if(end==null||end>cutoff)continue;
        out.push({...row,tag,unit:factUnit,duration:d});
      }
    }
  }
  return out;
}

function uniquePeriodFactsForTags(document,tags,metric,asOf,{maxDuration=120,unit="USD"}={}){
  const rows=factsForTags(document,tags,metric,asOf,{maxDuration,unit});
  const grouped=new Map();
  for(const row of rows){const key=periodKey(row);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(row);}
  const facts=[];let conflicts=0;
  for(const rowsForPeriod of grouped.values()){
    const selected=chooseLatestSafe(rowsForPeriod);
    if(selected.fact)facts.push(selected.fact);else if(selected.reason==="LATEST_FILED_VALUE_CONFLICT")conflicts++;
  }
  facts.sort((a,b)=>day(b.end)-day(a.end)||String(b.filed??"").localeCompare(String(a.filed??"")));
  return {facts,conflicts};
}
function uniquePeriodFacts(document,metric,asOf,{maxDuration=120}={}){
  return uniquePeriodFactsForTags(document,E1_R5_SEC_CONTRACT.tags?.[metric]??[],metric,asOf,{maxDuration});
}

export function selectFiscalComparablePair(document,{metric,asOf,maxAgeDays=E1_R5_FISCAL_POLICY.maxCurrentAgeDays}={}){
  const {facts,conflicts}=uniquePeriodFacts(document,metric,asOf,{maxDuration:120});
  if(!facts.length)return {current:null,prior:null,reason:conflicts?"PERIOD_CONFLICT":"NO_QUARTER_FACT",conflicts};
  let sawRecent=false;
  for(const current of facts){
    const age=ageDays(current,asOf);
    if(!Number.isInteger(age)||age<0||age>maxAgeDays)continue;
    sawRecent=true;
    const priors=facts.filter(prior=>prior.tag===current.tag&&prior.unit===current.unit&&prior.end!==current.end&&fiscalPairGeometryCompatible(current,prior)).sort((a,b)=>{
      const gapA=Math.abs((day(current.end)-day(a.end))-365),gapB=Math.abs((day(current.end)-day(b.end))-365);
      if(gapA!==gapB)return gapA-gapB;
      const durA=Math.abs(current.duration-a.duration),durB=Math.abs(current.duration-b.duration);
      if(durA!==durB)return durA-durB;
      return day(b.end)-day(a.end)||String(b.filed??"").localeCompare(String(a.filed??""));
    });
    if(priors.length)return {current,prior:priors[0],reason:null,ageDays:age,conflicts};
  }
  return {current:null,prior:null,reason:sawRecent?"NO_COMPARABLE_PRIOR":"NO_RECENT_QUARTER",conflicts};
}

export function selectFiscalCurrentQuarter(document,{metric,asOf,maxAgeDays=E1_R5_FISCAL_POLICY.maxCurrentAgeDays}={}){
  const {facts,conflicts}=uniquePeriodFacts(document,metric,asOf,{maxDuration:120});
  for(const fact of facts){
    const age=ageDays(fact,asOf);
    if(Number.isInteger(age)&&age>=0&&age<=maxAgeDays)return {fact,reason:null,ageDays:age,conflicts};
  }
  return {fact:null,reason:facts.length?"NO_RECENT_QUARTER":conflicts?"PERIOD_CONFLICT":"NO_QUARTER_FACT",ageDays:null,conflicts};
}

function selectSameTagPeriodPair(document,metric,asOf,currentTarget,priorTarget){
  const {facts}=uniquePeriodFacts(document,metric,asOf,{maxDuration:120});
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const current=facts.filter(fact=>fact.tag===tag&&sameFiscalAnchor(fact,currentTarget));
    const prior=facts.filter(fact=>fact.tag===tag&&sameFiscalAnchor(fact,priorTarget));
    if(!current.length||!prior.length)continue;
    const c=current[0],p=prior[0];
    if(!fiscalPairGeometryCompatible(c,p))continue;
    return {current:c,prior:p,tag};
  }
  return {current:null,prior:null,tag:null};
}

export function selectFiscalMarginPair(document,{asOf,maxAgeDays=E1_R5_FISCAL_POLICY.maxCurrentAgeDays}={}){
  const revenue=selectFiscalComparablePair(document,{metric:"revenue",asOf,maxAgeDays});
  if(!revenue.current)return {revenueCurrent:null,revenuePrior:null,opCurrent:null,opPrior:null,reason:"REVENUE_PAIR_MISSING"};
  const operating=selectSameTagPeriodPair(document,"operatingIncome",asOf,revenue.current,revenue.prior);
  if(!operating.current)return {revenueCurrent:revenue.current,revenuePrior:revenue.prior,opCurrent:null,opPrior:null,reason:"OPERATING_INCOME_PAIR_MISSING"};
  return {revenueCurrent:revenue.current,revenuePrior:revenue.prior,opCurrent:operating.current,opPrior:operating.prior,reason:null};
}

function selectQuarterFlowFromFacts(facts,target){
  if(!target?.end)return {value:null,method:null,fact:null,priorFact:null,reason:"TARGET_PERIOD_MISSING"};
  const direct=facts.filter(fact=>fact.duration<=120&&sameFiscalAnchor(fact,target));
  if(direct.length)return {value:direct[0].val,method:"DIRECT_QUARTER",fact:direct[0],priorFact:null,reason:null};
  const cumulative=facts.filter(fact=>fact.duration>120&&Math.abs(day(fact.end)-day(target.end))<=E1_R5_FISCAL_POLICY.sameQuarterEndToleranceDays).sort((a,b)=>String(b.filed??"").localeCompare(String(a.filed??""))||b.duration-a.duration);
  for(const current of cumulative){
    const priors=facts.filter(prior=>prior.tag===current.tag&&prior.unit===current.unit&&prior.start===current.start&&day(prior.end)<day(current.end)&&day(current.end)-day(prior.end)>=55&&day(current.end)-day(prior.end)<=125&&prior.duration<current.duration).sort((a,b)=>Math.abs((day(current.end)-day(a.end))-90)-Math.abs((day(current.end)-day(b.end))-90)||day(b.end)-day(a.end));
    if(!priors.length)continue;
    const value=current.val-priors[0].val;
    if(finite(value))return {value,method:"CUMULATIVE_DELTA",fact:current,priorFact:priors[0],reason:null};
  }
  return {value:null,method:null,fact:null,priorFact:null,reason:facts.length?"NO_ALIGNED_QUARTER_FLOW":"NO_FLOW_FACT"};
}

export function selectFiscalQuarterFlow(document,{metric,asOf,target}={}){
  const {facts}=uniquePeriodFacts(document,metric,asOf,{maxDuration:400});
  return selectQuarterFlowFromFacts(facts,target);
}

export function selectFiscalS5CapexFlow(document,{cik,asOf,target}={}){
  const approved=selectFiscalQuarterFlow(document,{metric:"capex",asOf,target});
  if(finite(approved.value))return {...approved,source:"APPROVED_CAPEX_TAG",fallback:null};
  const fallback=approvedS5FallbackForCik(cik??document?.cik);
  if(!fallback)return {...approved,source:null,fallback:null};
  const {facts}=uniquePeriodFactsForTags(document,[fallback.tag],null,asOf,{maxDuration:400,unit:"USD"});
  const selected=selectQuarterFlowFromFacts(facts,target);
  if(!finite(selected.value))return {...selected,source:null,fallback};
  return {...selected,source:"APPROVED_ISSUER_FALLBACK",fallback};
}

export function buildFiscalSecIssuerInputs({companyFacts,cik,asOf,isFinancial=false,sectorId=null,maxAgeDays=E1_R5_FISCAL_POLICY.maxCurrentAgeDays}={}){
  const validation=validateSecCompanyFactsDocument(companyFacts);
  const normalizedCik=padSecCik(cik??companyFacts?.cik);
  if(validation.status!=="PASS"||!normalizedCik||validation.cik!==normalizedCik)return {status:"INVALID",reason:validation.reason??"CIK_MISMATCH",cik:normalizedCik,current:{},priorYear:{}};
  const revenue=selectFiscalComparablePair(companyFacts,{metric:"revenue",asOf,maxAgeDays});
  if(!revenue.current||!revenue.prior)return {status:"PARTIAL",reason:"REVENUE_PAIR_MISSING",cik:normalizedCik,current:{},priorYear:{}};
  const eps=selectFiscalComparablePair(companyFacts,{metric:"eps",asOf,maxAgeDays});
  const epsAligned=eps.current&&eps.prior&&sameFiscalAnchor(eps.current,revenue.current)&&sameFiscalAnchor(eps.prior,revenue.prior);
  const netCurrent=selectFiscalCurrentQuarter(companyFacts,{metric:"netIncome",asOf,maxAgeDays});
  const netCurrentAligned=netCurrent.fact&&sameFiscalAnchor(netCurrent.fact,revenue.current);
  const netPair=selectFiscalComparablePair(companyFacts,{metric:"netIncome",asOf,maxAgeDays});
  const netPairAligned=netPair.current&&netPair.prior&&sameFiscalAnchor(netPair.current,revenue.current)&&sameFiscalAnchor(netPair.prior,revenue.prior);
  const margin=isFinancial===false?selectFiscalMarginPair(companyFacts,{asOf,maxAgeDays}):{opCurrent:null,opPrior:null};
  const cfo=isFinancial===false?selectFiscalQuarterFlow(companyFacts,{metric:"operatingCashFlow",asOf,target:revenue.current}):{value:null,method:null};
  const capex=isFinancial===false?selectFiscalS5CapexFlow(companyFacts,{cik:normalizedCik,asOf,target:revenue.current}):{value:null,method:null,source:null};
  return {
    status:"PASS",cik:normalizedCik,isFinancial,sectorId,
    current:{
      eps:epsAligned?eps.current.val:null,
      revenue:revenue.current.val,
      operatingIncome:isFinancial===false&&margin.opCurrent?margin.opCurrent.val:null,
      netIncome:netCurrentAligned?netCurrent.fact.val:null,
      operatingCashFlow:finite(cfo.value)?cfo.value:null,
      capex:finite(capex.value)?capex.value:null,
    },
    priorYear:{
      eps:epsAligned?eps.prior.val:null,
      revenue:revenue.prior.val,
      operatingIncome:isFinancial===false&&margin.opPrior?margin.opPrior.val:null,
      netIncome:netPairAligned?netPair.prior.val:null,
    },
    audit:{
      inputContractVersion:"E1-R5-INPUT-R3",
      maxAgeDays,
      revenueEnd:revenue.current.end,
      revenuePriorEnd:revenue.prior.end,
      epsAligned:Boolean(epsAligned),
      netCurrentAligned:Boolean(netCurrentAligned),
      netPairAligned:Boolean(netPairAligned),
      cfoMethod:cfo.method??null,
      capexMethod:capex.method??null,
      capexSource:capex.source??null,
      capexFallback:capex.fallback??null,
      fyFpBinding:E1_R5_FISCAL_POLICY.fyFpBinding,
      q4EpsAnnualMinusNineMonths:E1_R5_FISCAL_POLICY.q4EpsAnnualMinusNineMonths,
    },
  };
}
