export const FUND_FLOWS_R2_SHADOW_METHOD="FUND_FLOWS_R2_SHADOW_R1";
export const FUND_FLOWS_R2_WEIGHTS=Object.freeze({
  secLongRun:0.50,
  iciFourWeek:0.35,
  iciLatestWeek:0.15,
});
export const FUND_FLOWS_R2_ICI_FULL_CONFIDENCE_WEEKS=12;

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const finiteScore=value=>finite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const clamp=value=>Math.max(0,Math.min(100,value));
const sum=values=>values.filter(finite).reduce((a,b)=>a+b,0);

export function flowPreferenceScoreR2(equity,bond){
  if(!finite(equity)||!finite(bond))return null;
  const denominator=Math.abs(equity)+Math.abs(bond);
  if(denominator===0)return 50;
  return clamp(50+50*(equity-bond)/denominator);
}
export function confidenceAdjustedFlowScoreR2(score,weeks,{fullConfidenceWeeks=FUND_FLOWS_R2_ICI_FULL_CONFIDENCE_WEEKS}={}){
  if(!finiteScore(score)||!Number.isInteger(weeks)||weeks<0||!Number.isInteger(fullConfidenceWeeks)||fullConfidenceWeeks<1)return null;
  const confidence=Math.min(1,weeks/fullConfidenceWeeks);
  return 50+confidence*(score-50);
}

export function buildFundFlowsR2Components({secRows=[],iciRows=[],secBaselineScore=null}={}){
  const sec=(Array.isArray(secRows)?secRows:[])
    .filter(row=>validDate(row?.observationDate))
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  const ici=(Array.isArray(iciRows)?iciRows:[])
    .filter(row=>validDate(row?.observationDate))
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  const latestSec=sec.at(-1)??null,latestIci=ici.at(-1)??null;
  if(!latestSec||!latestIci||!finiteScore(secBaselineScore))return {
    status:"PARTIAL",score:null,scoreStatus:"WAITING_REQUIRED_INPUT",
    reason:!latestSec?"FUND_FLOWS_R2_SEC_MISSING":!latestIci?"FUND_FLOWS_R2_ICI_MISSING":"FUND_FLOWS_R2_SEC_SCORE_MISSING",
    methodologyVersion:FUND_FLOWS_R2_SHADOW_METHOD,mode:"SHADOW_ONLY",
  };

  const recent=ici.slice(-Math.min(4,ici.length));
  const cumulative4w={
    equity:sum(recent.map(row=>row.equity)),
    domesticEquity:sum(recent.map(row=>row.domesticEquity)),
    worldEquity:sum(recent.map(row=>row.worldEquity)),
    bond:sum(recent.map(row=>row.bond)),
    total:sum(recent.map(row=>row.total)),
  };
  const latest={
    observationDate:latestIci.observationDate,
    equity:finite(latestIci.equity)?latestIci.equity:null,
    domesticEquity:finite(latestIci.domesticEquity)?latestIci.domesticEquity:null,
    worldEquity:finite(latestIci.worldEquity)?latestIci.worldEquity:null,
    bond:finite(latestIci.bond)?latestIci.bond:null,
    total:finite(latestIci.total)?latestIci.total:null,
  };
  const secLatest={
    observationDate:latestSec.observationDate,
    allNetRatio:finite(latestSec.allNetRatio)?latestSec.allNetRatio:null,
    indexNetRatio:finite(latestSec.indexNetRatio)?latestSec.indexNetRatio:null,
    nonIndexNetRatio:finite(latestSec.nonIndexNetRatio)?latestSec.nonIndexNetRatio:null,
    allOutflowRatio:finite(latestSec.allOutflowRatio)?latestSec.allOutflowRatio:null,
  };
  const rawFourWeekScore=flowPreferenceScoreR2(cumulative4w.equity,cumulative4w.bond);
  const rawLatestWeekScore=flowPreferenceScoreR2(latest.equity,latest.bond);
  const iciWeeks=ici.length;
  const adjustedFourWeekScore=confidenceAdjustedFlowScoreR2(rawFourWeekScore,iciWeeks);
  const adjustedLatestWeekScore=confidenceAdjustedFlowScoreR2(rawLatestWeekScore,iciWeeks);
  const confidence=Math.min(1,iciWeeks/FUND_FLOWS_R2_ICI_FULL_CONFIDENCE_WEEKS);
  const components={
    secLongRun:secBaselineScore,
    iciFourWeek:adjustedFourWeekScore,
    iciLatestWeek:adjustedLatestWeekScore,
  };
  const score=Object.values(components).every(finiteScore)?clamp(
    FUND_FLOWS_R2_WEIGHTS.secLongRun*components.secLongRun+
    FUND_FLOWS_R2_WEIGHTS.iciFourWeek*components.iciFourWeek+
    FUND_FLOWS_R2_WEIGHTS.iciLatestWeek*components.iciLatestWeek
  ):null;
  return {
    status:score===null?"PARTIAL":"READY",
    score,
    scoreStatus:score===null?"WAITING_REQUIRED_INPUT":"READY_SHADOW",
    methodologyVersion:FUND_FLOWS_R2_SHADOW_METHOD,
    mode:"SHADOW_ONLY",
    productionFormulaChanged:false,
    weights:{...FUND_FLOWS_R2_WEIGHTS},
    confidence:{iciWeeks,fullConfidenceWeeks:FUND_FLOWS_R2_ICI_FULL_CONFIDENCE_WEEKS,ratio:confidence},
    components,
    rawScores:{iciFourWeek:rawFourWeekScore,iciLatestWeek:rawLatestWeekScore},
    coverage:{
      secRows:sec.length,secFirst:sec[0].observationDate,secLast:latestSec.observationDate,
      iciRows:ici.length,iciFirst:ici[0].observationDate,iciLast:latestIci.observationDate,
      iciWeeksUsed:recent.length,
    },
    latest,
    cumulative4w,
    relative:{
      latestEquityMinusBond:finite(latest.equity)&&finite(latest.bond)?latest.equity-latest.bond:null,
      fourWeekEquityMinusBond:cumulative4w.equity-cumulative4w.bond,
      domesticShareOfEquity:finite(latest.domesticEquity)&&finite(latest.equity)&&latest.equity!==0?latest.domesticEquity/latest.equity:null,
    },
    secLatest,
    interpretation:"Shadow R2: SEC long-run context 50% + ICI four-week equity-vs-bond preference 35% + latest-week preference 15%; ICI scores shrink toward neutral until 12 weeks accumulate.",
  };
}
