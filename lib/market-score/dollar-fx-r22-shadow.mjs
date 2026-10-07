import {buildDollarFxR54} from "../diagnostic-layer/open-resolution-r53-components.mjs";

export const DOLLAR_FX_R22_SHADOW_METHOD="DOLLAR_FX_R2_2_ASYMMETRIC_SHOCK_SHADOW_R1";
export const DOLLAR_FX_R22_WEIGHTS=Object.freeze({
  shortMomentum:0.35,
  mediumMomentum:0.30,
  acceleration:0.15,
  volatility:0.20,
});
export const DOLLAR_FX_R22_THRESHOLDS=Object.freeze({
  short:Object.freeze({
    appreciationFreePct:1,
    appreciationFullStressPct:8,
    depreciationFreePct:3,
    depreciationFullStressPct:10,
  }),
  medium:Object.freeze({
    appreciationFreePct:2,
    appreciationFullStressPct:12,
    depreciationFreePct:5,
    depreciationFullStressPct:15,
  }),
  accelerationFullStressPct:6,
  volatilityZeroScorePct:2,
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const finiteScore=value=>finite(value)&&value>=0&&value<=100;
const clamp=value=>Math.max(0,Math.min(100,value));

export function asymmetricDollarMoveScoreR22(changePct,{
  appreciationFreePct,
  appreciationFullStressPct,
  depreciationFreePct,
  depreciationFullStressPct,
}={}){
  if(![changePct,appreciationFreePct,appreciationFullStressPct,depreciationFreePct,depreciationFullStressPct].every(finite))return null;
  if(appreciationFreePct<0||depreciationFreePct<0||appreciationFullStressPct<=appreciationFreePct||depreciationFullStressPct<=depreciationFreePct)return null;
  const magnitude=Math.abs(changePct);
  const appreciation=changePct>=0;
  const free=appreciation?appreciationFreePct:depreciationFreePct;
  const full=appreciation?appreciationFullStressPct:depreciationFullStressPct;
  if(magnitude<=free)return 100;
  return clamp(100-100*(magnitude-free)/(full-free));
}

export function dollarMagnitudeScoreR22(value,{fullStressPct}={}){
  if(!finite(value)||!finite(fullStressPct)||fullStressPct<=0)return null;
  return clamp(100-100*Math.abs(value)/fullStressPct);
}

export function dollarVolatilityScoreR22(volatilityPct,{zeroScorePct=DOLLAR_FX_R22_THRESHOLDS.volatilityZeroScorePct}={}){
  if(!finite(volatilityPct)||!finite(zeroScorePct)||zeroScorePct<=0)return null;
  return clamp(100-100*volatilityPct/zeroScorePct);
}

export function buildDollarFxR22Shadow(rows=[],{asOfDate="9999-12-31",minValid=252}={}){
  const baseline=buildDollarFxR54(rows,{asOfDate,minValid});
  if(baseline.status!=="READY"||!Array.isArray(baseline.rows)){
    return {status:"PARTIAL",score:null,reason:baseline.reason??"DOLLAR_R54_NOT_READY",methodologyVersion:DOLLAR_FX_R22_SHADOW_METHOD,mode:"SHADOW_ONLY"};
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
    const shortScore=asymmetricDollarMoveScoreR22(row.shortMomentum,DOLLAR_FX_R22_THRESHOLDS.short);
    const mediumScore=asymmetricDollarMoveScoreR22(row.mediumMomentum,DOLLAR_FX_R22_THRESHOLDS.medium);
    const accelerationScore=dollarMagnitudeScoreR22(acceleration,{fullStressPct:DOLLAR_FX_R22_THRESHOLDS.accelerationFullStressPct});
    const volatilityScore=dollarVolatilityScoreR22(row.volatility20);
    const parts=[shortScore,mediumScore,accelerationScore,volatilityScore];
    const score=parts.every(finiteScore)?clamp(
      DOLLAR_FX_R22_WEIGHTS.shortMomentum*shortScore+
      DOLLAR_FX_R22_WEIGHTS.mediumMomentum*mediumScore+
      DOLLAR_FX_R22_WEIGHTS.acceleration*accelerationScore+
      DOLLAR_FX_R22_WEIGHTS.volatility*volatilityScore
    ):null;
    output.push({
      ...row,
      acceleration20:acceleration,
      r22ShortScore:shortScore,
      r22MediumScore:mediumScore,
      r22AccelerationScore:accelerationScore,
      r22VolatilityScore:volatilityScore,
      r22Score:score,
    });
  }

  const latest=output.filter(row=>row.observationDate<=asOfDate&&finiteScore(row.r22Score)).at(-1)??null;
  if(!latest)return {status:"PARTIAL",score:null,reason:"DOLLAR_R22_WARMUP",rows:output,methodologyVersion:DOLLAR_FX_R22_SHADOW_METHOD,mode:"SHADOW_ONLY"};

  return {
    status:"READY",
    score:latest.r22Score,
    observationDate:latest.observationDate,
    components:{
      shortMomentum:latest.r22ShortScore,
      mediumMomentum:latest.r22MediumScore,
      acceleration:latest.r22AccelerationScore,
      volatility:latest.r22VolatilityScore,
    },
    weights:{...DOLLAR_FX_R22_WEIGHTS},
    thresholds:{
      short:{...DOLLAR_FX_R22_THRESHOLDS.short},
      medium:{...DOLLAR_FX_R22_THRESHOLDS.medium},
      accelerationFullStressPct:DOLLAR_FX_R22_THRESHOLDS.accelerationFullStressPct,
      volatilityZeroScorePct:DOLLAR_FX_R22_THRESHOLDS.volatilityZeroScorePct,
    },
    raw:{
      broadDollarIndex:latest.broadDollarIndex,
      shortMomentum:latest.shortMomentum,
      mediumMomentum:latest.mediumMomentum,
      acceleration20:latest.acceleration20,
      volatility20:latest.volatility20,
    },
    trend:output.filter(row=>finiteScore(row.r22Score)).slice(-370).map(row=>({label:row.observationDate,value:row.r22Score})),
    methodologyVersion:DOLLAR_FX_R22_SHADOW_METHOD,
    interpretation:"Shadow R2.2: treat the dollar as an asymmetric shock indicator rather than assuming every appreciation is stress. Small moves are tolerated; sharp appreciation is penalized sooner than depreciation, while acceleration magnitude and volatility are two-sided stress signals.",
    rationale:"Moderate dollar appreciation can coexist with strong U.S. data and risk appetite, while large appreciation can tighten credit and pressure internationally exposed earnings. R2.2 therefore penalizes shocks rather than direction alone.",
    mode:"SHADOW_ONLY",
    productionFormulaChanged:false,
  };
}
