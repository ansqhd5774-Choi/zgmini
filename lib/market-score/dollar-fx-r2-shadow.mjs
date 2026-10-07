import {buildDollarFxR54} from "../diagnostic-layer/open-resolution-r53-components.mjs";

export const DOLLAR_FX_R2_SHADOW_METHOD="DOLLAR_FX_R2_1_SHADOW_R1";
export const DOLLAR_FX_R2_SHADOW_WEIGHTS=Object.freeze({
  level:0.10,
  shortMomentum:0.30,
  mediumMomentum:0.25,
  acceleration:0.15,
  volatility:0.20,
});
export const DOLLAR_FX_R21_THRESHOLDS=Object.freeze({
  shortFullStressPct:8,
  mediumFullStressPct:12,
  accelerationFullStressPct:6,
  volatilityZeroScorePct:2,
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const finiteScore=value=>finite(value)&&value>=0&&value<=100;
const clamp=value=>Math.max(0,Math.min(100,value));

export function dollarDirectionalScoreR21(changePct,fullStressPct){
  if(!finite(changePct)||!finite(fullStressPct)||fullStressPct<=0)return null;
  return clamp(50-50*changePct/fullStressPct);
}
export function dollarVolatilityScoreR21(volatilityPct,{zeroScorePct=DOLLAR_FX_R21_THRESHOLDS.volatilityZeroScorePct}={}){
  if(!finite(volatilityPct)||!finite(zeroScorePct)||zeroScorePct<=0)return null;
  return clamp(100-100*volatilityPct/zeroScorePct);
}

export function buildDollarFxR2Shadow(rows=[],{asOfDate="9999-12-31",minValid=252}={}){
  const baseline=buildDollarFxR54(rows,{asOfDate,minValid});
  if(baseline.status!=="READY"||!Array.isArray(baseline.rows)){
    return {status:"PARTIAL",score:null,reason:baseline.reason??"DOLLAR_R54_NOT_READY",methodologyVersion:DOLLAR_FX_R2_SHADOW_METHOD,mode:"SHADOW_ONLY"};
  }

  const valid=baseline.rows.filter(row=>finite(row?.shortMomentum));
  const prior20ByDate=new Map();
  for(let index=20;index<valid.length;index++)prior20ByDate.set(valid[index].observationDate,valid[index-20]);

  const output=[];
  for(const row of baseline.rows){
    const prior20=prior20ByDate.get(row.observationDate)??null;
    const acceleration=prior20&&finite(row.shortMomentum)&&finite(prior20.shortMomentum)
      ?row.shortMomentum-prior20.shortMomentum
      :null;
    const shortMomentumScore=dollarDirectionalScoreR21(row.shortMomentum,DOLLAR_FX_R21_THRESHOLDS.shortFullStressPct);
    const mediumMomentumScore=dollarDirectionalScoreR21(row.mediumMomentum,DOLLAR_FX_R21_THRESHOLDS.mediumFullStressPct);
    const accelerationScore=dollarDirectionalScoreR21(acceleration,DOLLAR_FX_R21_THRESHOLDS.accelerationFullStressPct);
    const volatilityScore=dollarVolatilityScoreR21(row.volatility20);
    const parts=[row.levelScore,shortMomentumScore,mediumMomentumScore,accelerationScore,volatilityScore];
    const score=parts.every(finiteScore)?clamp(
      DOLLAR_FX_R2_SHADOW_WEIGHTS.level*row.levelScore+
      DOLLAR_FX_R2_SHADOW_WEIGHTS.shortMomentum*shortMomentumScore+
      DOLLAR_FX_R2_SHADOW_WEIGHTS.mediumMomentum*mediumMomentumScore+
      DOLLAR_FX_R2_SHADOW_WEIGHTS.acceleration*accelerationScore+
      DOLLAR_FX_R2_SHADOW_WEIGHTS.volatility*volatilityScore
    ):null;
    output.push({
      ...row,
      acceleration20:acceleration,
      directShortScore:shortMomentumScore,
      directMediumScore:mediumMomentumScore,
      directAccelerationScore:accelerationScore,
      directVolatilityScore:volatilityScore,
      shadowScore:score,
    });
  }

  const latest=output.filter(row=>row.observationDate<=asOfDate&&finiteScore(row.shadowScore)).at(-1)??null;
  if(!latest)return {status:"PARTIAL",score:null,reason:"DOLLAR_R2_1_WARMUP",rows:output,methodologyVersion:DOLLAR_FX_R2_SHADOW_METHOD,mode:"SHADOW_ONLY"};

  return {
    status:"READY",score:latest.shadowScore,observationDate:latest.observationDate,
    components:{
      level:latest.levelScore,
      shortMomentum:latest.directShortScore,
      mediumMomentum:latest.directMediumScore,
      acceleration:latest.directAccelerationScore,
      volatility:latest.directVolatilityScore,
    },
    weights:{...DOLLAR_FX_R2_SHADOW_WEIGHTS},
    thresholds:{...DOLLAR_FX_R21_THRESHOLDS},
    raw:{
      broadDollarIndex:latest.broadDollarIndex,
      shortMomentum:latest.shortMomentum,
      mediumMomentum:latest.mediumMomentum,
      acceleration20:latest.acceleration20,
      volatility20:latest.volatility20,
    },
    trend:output.filter(row=>finiteScore(row.shadowScore)).slice(-370).map(row=>({label:row.observationDate,value:row.shadowScore})),
    methodologyVersion:DOLLAR_FX_R2_SHADOW_METHOD,
    interpretation:"Shadow R2.1: raw 20D/60D dollar changes, 20D acceleration and daily volatility are scored by fixed magnitude thresholds; only level keeps the historical percentile and is limited to 10%.",
    mode:"SHADOW_ONLY",productionFormulaChanged:false,
  };
}
