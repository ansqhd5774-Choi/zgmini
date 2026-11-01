import {
  cfoForwardRevenueRevision,
  cfoRollingForwardRevenueLevel,
} from "./earnings-e1-r5-forward-r2.mjs";

export const E1_R5_CFO_SURVEY_R1_VERSION="E1-R5-CFO-SURVEY-R1";

export const E1_R5_CFO_SURVEY_R1_CONTRACT=Object.freeze({
  status:"SHADOW_ONLY",
  productionActivation:false,
  source:"THE_CFO_SURVEY_RICHMOND_FED_ATLANTA_FED_DUKE",
  metric:"REVENUE_GROWTH_EXPECTATION",
  frequency:"QUARTERLY",
  availabilityPolicy:"RELEASE_AT_AND_STORED_AT_LTE_AS_OF",
  revisionPolicy:"PRESERVE_EACH_RELEASE_VERSION_AND_SOURCE_HASH",
  overwriteHistoricalPIT:false,
  apiKeyRequired:false,
});

const text=value=>typeof value==="string"?value.trim():"";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const isoTime=value=>{
  const s=text(value);
  if(!s)return null;
  const ms=Date.parse(s);
  return Number.isFinite(ms)?new Date(ms).toISOString():null;
};
const validHash=value=>/^(?:sha256:)?[a-f0-9]{64}$/i.test(text(value));
const validQuarter=value=>Number.isInteger(value)&&value>=1&&value<=4;
const validYear=value=>Number.isInteger(value)&&value>=2000&&value<=2100;
const quarterOrdinal=(year,quarter)=>year*4+(quarter-1);

export function previousSurveyQuarter(year,quarter){
  if(!validYear(year)||!validQuarter(quarter))return null;
  return quarter===1?{surveyYear:year-1,surveyQuarter:4}:{surveyYear:year,surveyQuarter:quarter-1};
}

export function validateCfoSurveyRelease(input={}){
  if(!validYear(input.surveyYear))return {status:"MISSING",reason:"SURVEY_YEAR_INVALID"};
  if(!validQuarter(input.surveyQuarter))return {status:"MISSING",reason:"SURVEY_QUARTER_INVALID"};
  const releaseAt=isoTime(input.releaseAt);
  if(!releaseAt)return {status:"MISSING",reason:"RELEASE_AT_INVALID"};
  const storedAt=isoTime(input.storedAt);
  if(!storedAt)return {status:"MISSING",reason:"STORED_AT_INVALID"};
  if(Date.parse(storedAt)<Date.parse(releaseAt))return {status:"MISSING",reason:"STORED_BEFORE_RELEASE"};
  if(!validHash(input.sourceHash))return {status:"MISSING",reason:"SOURCE_HASH_INVALID"};
  if(!text(input.revisionId))return {status:"MISSING",reason:"REVISION_ID_MISSING"};
  if(input.currentTargetYear!=null&&input.currentTargetYear!==input.surveyYear)return {status:"MISSING",reason:"CURRENT_TARGET_YEAR_MISMATCH"};
  if(input.nextTargetYear!=null&&input.nextTargetYear!==input.surveyYear+1)return {status:"MISSING",reason:"NEXT_TARGET_YEAR_MISMATCH"};
  const currentWeight=(4-input.surveyQuarter)/4;
  const nextWeight=input.surveyQuarter/4;
  if(currentWeight>0&&!finite(input.currentYearGrowth))return {status:"MISSING",reason:"CURRENT_YEAR_GROWTH_MISSING"};
  if(nextWeight>0&&!finite(input.nextYearGrowth))return {status:"MISSING",reason:"NEXT_YEAR_GROWTH_MISSING"};
  return {status:"READY",reason:null,releaseAt,storedAt};
}

export function buildCfoSurveyPITRecord(input={}){
  const validation=validateCfoSurveyRelease(input);
  if(validation.status!=="READY")return {...validation,source:E1_R5_CFO_SURVEY_R1_CONTRACT.source};
  const level=cfoRollingForwardRevenueLevel({
    surveyQuarter:input.surveyQuarter,
    currentYearGrowth:input.currentYearGrowth,
    nextYearGrowth:input.nextYearGrowth,
  });
  if(level==null)return {status:"MISSING",reason:"ROLLING_FORWARD_LEVEL_MISSING",source:E1_R5_CFO_SURVEY_R1_CONTRACT.source};
  return {
    status:"READY",
    reason:null,
    source:E1_R5_CFO_SURVEY_R1_CONTRACT.source,
    surveyYear:input.surveyYear,
    surveyQuarter:input.surveyQuarter,
    releaseAt:validation.releaseAt,
    storedAt:validation.storedAt,
    currentTargetYear:input.surveyYear,
    nextTargetYear:input.surveyYear+1,
    currentYearGrowth:finite(input.currentYearGrowth)?input.currentYearGrowth:null,
    nextYearGrowth:finite(input.nextYearGrowth)?input.nextYearGrowth:null,
    rollingForwardRevenueGrowth:level,
    sourceHash:text(input.sourceHash).toLowerCase(),
    revisionId:text(input.revisionId),
    sourceUrl:text(input.sourceUrl)||null,
  };
}

export function selectCfoSurveyReleaseAsOf(records,{asOf,surveyYear,surveyQuarter}={}){
  if(!validYear(surveyYear)||!validQuarter(surveyQuarter))return null;
  const asOfMs=Date.parse(text(asOf));
  if(!Number.isFinite(asOfMs))return null;
  const candidates=(records??[]).filter(row=>{
    if(row?.status!=="READY")return false;
    if(row.surveyYear!==surveyYear||row.surveyQuarter!==surveyQuarter)return false;
    const releaseMs=Date.parse(text(row.releaseAt));
    const storedMs=Date.parse(text(row.storedAt));
    return Number.isFinite(releaseMs)&&Number.isFinite(storedMs)&&releaseMs<=asOfMs&&storedMs<=asOfMs;
  });
  candidates.sort((a,b)=>{
    const byRelease=Date.parse(b.releaseAt)-Date.parse(a.releaseAt);
    if(byRelease)return byRelease;
    return Date.parse(b.storedAt)-Date.parse(a.storedAt);
  });
  return candidates[0]??null;
}

export function compareCfoSurveyReleases(current,previous){
  if(current?.status!=="READY"||previous?.status!=="READY")return {status:"MISSING",reason:"RELEASE_MISSING",raw:null};
  if(quarterOrdinal(current.surveyYear,current.surveyQuarter)!==quarterOrdinal(previous.surveyYear,previous.surveyQuarter)+1){
    return {status:"MISSING",reason:"NON_CONSECUTIVE_SURVEY_QUARTERS",raw:null};
  }
  const raw=cfoForwardRevenueRevision(current,previous);
  if(raw==null)return {status:"MISSING",reason:"REVISION_UNAVAILABLE",raw:null};
  return {
    status:"READY",
    reason:null,
    raw,
    currentLevel:cfoRollingForwardRevenueLevel(current),
    previousLevel:cfoRollingForwardRevenueLevel(previous),
  };
}

export function buildCfoSurveyShadowDiagnostic(records,{asOf,surveyYear,surveyQuarter}={}){
  const previousKey=previousSurveyQuarter(surveyYear,surveyQuarter);
  if(!previousKey)return {status:"MISSING",reason:"SURVEY_PERIOD_INVALID",raw:null,current:null,previous:null};
  const current=selectCfoSurveyReleaseAsOf(records,{asOf,surveyYear,surveyQuarter});
  const previous=selectCfoSurveyReleaseAsOf(records,{asOf,...previousKey});
  const comparison=compareCfoSurveyReleases(current,previous);
  return {...comparison,current,previous};
}

export function auditCfoSurveyPITVersions(records){
  const rows=Array.isArray(records)?records:[];
  const groups=new Map();
  for(const row of rows){
    if(row?.status!=="READY")continue;
    const key=`${row.surveyYear}Q${row.surveyQuarter}`;
    const list=groups.get(key)??[];
    list.push(row);
    groups.set(key,list);
  }
  const periods=[];
  for(const [period,list] of groups){
    const hashes=new Set(list.map(row=>row.sourceHash));
    const revisions=new Set(list.map(row=>row.revisionId));
    periods.push({period,versions:list.length,distinctHashes:hashes.size,distinctRevisions:revisions.size});
  }
  periods.sort((a,b)=>a.period.localeCompare(b.period));
  return {
    status:periods.length?"READY":"MISSING",
    periodCount:periods.length,
    versionCount:periods.reduce((sum,row)=>sum+row.versions,0),
    periods,
  };
}
