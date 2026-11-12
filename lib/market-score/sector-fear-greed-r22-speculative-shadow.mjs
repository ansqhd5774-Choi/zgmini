import {buildSectorSpeculativeRawHistory} from "./sector-fear-greed-r2-speculative-shadow.mjs";

export const SECTOR_FEAR_GREED_R22_SPEC_METHOD="SECTOR-FEAR-GREED-R2.2-SPECULATIVE-APPETITE-SHADOW";
export const SECTOR_FEAR_GREED_R22_REFERENCE_OBSERVATIONS=756;
export const SECTOR_FEAR_GREED_R22_WEIGHTS=Object.freeze({
  lotteryDemand:0.50,
  speculativeVolume:0.50,
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);

function percentileScore(values,current,{minimum=SECTOR_FEAR_GREED_R22_REFERENCE_OBSERVATIONS}={}){
  const clean=(Array.isArray(values)?values:[]).filter(finite);
  if(!finite(current)||clean.length<minimum)return null;
  const sample=clean.slice(-minimum);let below=0,equal=0;
  for(const value of sample){if(value<current)below++;else if(value===current)equal++;}
  return 100*(below+0.5*equal)/sample.length;
}

function summarizeMetric(history,key){
  const values=history.map(row=>row[key]).filter(finite),current=values.at(-1)??null;
  return {
    current,
    historyObservations:values.length,
    referenceObservations:Math.min(values.length,SECTOR_FEAR_GREED_R22_REFERENCE_OBSERVATIONS),
    score:percentileScore(values,current),
  };
}

export function buildSectorSpeculativeCandidateR22({rows=[],spyRows=[],etfRows=[],pitHistory,sectorId}={}){
  const history=buildSectorSpeculativeRawHistory({rows,spyRows,etfRows,pitHistory,sectorId});
  const lotteryDemand=summarizeMetric(history,"lotteryDemand"),speculativeVolume=summarizeMetric(history,"speculativeVolume");
  const ready=[lotteryDemand,speculativeVolume].every(metric=>finite(metric.score));
  const score=ready?
    SECTOR_FEAR_GREED_R22_WEIGHTS.lotteryDemand*lotteryDemand.score+
    SECTOR_FEAR_GREED_R22_WEIGHTS.speculativeVolume*speculativeVolume.score:
    null;
  return {
    methodologyVersion:SECTOR_FEAR_GREED_R22_SPEC_METHOD,
    mode:"SHADOW_RESEARCH_ONLY",
    economicIntent:"PARSIMONIOUS_TWO_FACTOR_SPECULATIVE_APPETITE_WITHOUT_REDUNDANT_LEADERSHIP",
    productionFormulaChanged:false,
    publicMutation:false,
    dbSchemaChanged:false,
    sectorId,
    status:ready?"READY":"PARTIAL",
    score,
    weights:{...SECTOR_FEAR_GREED_R22_WEIGHTS},
    requiredReferenceObservations:SECTOR_FEAR_GREED_R22_REFERENCE_OBSERVATIONS,
    metrics:{lotteryDemand,speculativeVolume},
    history,
  };
}
