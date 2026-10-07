import {buildDollarFxR54} from "../diagnostic-layer/open-resolution-r53-components.mjs";

export const DOLLAR_FX_R23_SHADOW_METHOD="DOLLAR_FX_R2_3_SHOCK_REVERSAL_SHADOW_R1";
export const DOLLAR_FX_R23_WEIGHTS=Object.freeze({
  absShortMomentum:0.35,
  absAcceleration20:0.40,
  volatility20:0.25,
});
export const DOLLAR_FX_R23_SCORING="EXPANDING_EMPIRICAL_PERCENTILE_PIT";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const finiteScore=value=>finite(value)&&value>=0&&value<=100;
const clamp=value=>Math.max(0,Math.min(100,value));

export function empiricalPercentileScore(values,current){
  const history=(Array.isArray(values)?values:[]).filter(finite);
  if(!history.length||!finite(current))return null;
  const less=history.filter(value=>value<current).length;
  const equal=history.filter(value=>value===current).length;
  return clamp(100*(less+0.5*equal)/history.length);
}

function featureRows(rows,asOfDate){
  const baseline=buildDollarFxR54(rows,{asOfDate,minValid:252});
  if(baseline.status!=="READY"||!Array.isArray(baseline.rows)){
    return {baseline,rows:[]};
  }
  const valid=baseline.rows.filter(row=>row.observationDate<=asOfDate&&finite(row?.shortMomentum));
  const out=[];
  for(let index=0;index<valid.length;index++){
    const row=valid[index];
    const prior20=index>=20?valid[index-20]:null;
    const acceleration20=prior20&&finite(prior20.shortMomentum)
      ?row.shortMomentum-prior20.shortMomentum
      :null;
    out.push({
      observationDate:row.observationDate,
      absShortMomentum:finite(row.shortMomentum)?Math.abs(row.shortMomentum):null,
      absAcceleration20:finite(acceleration20)?Math.abs(acceleration20):null,
      volatility20:finite(row.volatility20)?row.volatility20:null,
      shortMomentum:finite(row.shortMomentum)?row.shortMomentum:null,
      acceleration20:finite(acceleration20)?acceleration20:null,
    });
  }
  return {baseline,rows:out};
}

export function buildDollarFxR23Shadow(rows=[],{asOfDate="9999-12-31"}={}){
  const built=featureRows(rows,asOfDate);
  if(built.baseline.status!=="READY"){
    return {status:"PARTIAL",score:null,reason:built.baseline.reason??"DOLLAR_R54_NOT_READY",methodologyVersion:DOLLAR_FX_R23_SHADOW_METHOD,mode:"SHADOW_ONLY"};
  }
  const eligible=built.rows.filter(row=>[row.absShortMomentum,row.absAcceleration20,row.volatility20].every(finite));
  const latest=eligible.at(-1)??null;
  if(!latest)return {status:"PARTIAL",score:null,reason:"DOLLAR_R23_WARMUP",methodologyVersion:DOLLAR_FX_R23_SHADOW_METHOD,mode:"SHADOW_ONLY"};

  const through=eligible.filter(row=>row.observationDate<=latest.observationDate);
  const shortScore=empiricalPercentileScore(through.map(row=>row.absShortMomentum),latest.absShortMomentum);
  const accelerationScore=empiricalPercentileScore(through.map(row=>row.absAcceleration20),latest.absAcceleration20);
  const volatilityScore=empiricalPercentileScore(through.map(row=>row.volatility20),latest.volatility20);
  const components={absShortMomentum:shortScore,absAcceleration20:accelerationScore,volatility20:volatilityScore};
  const score=Object.values(components).every(finiteScore)?clamp(
    DOLLAR_FX_R23_WEIGHTS.absShortMomentum*shortScore+
    DOLLAR_FX_R23_WEIGHTS.absAcceleration20*accelerationScore+
    DOLLAR_FX_R23_WEIGHTS.volatility20*volatilityScore
  ):null;
  if(!finiteScore(score))return {status:"PARTIAL",score:null,reason:"DOLLAR_R23_SCORE_INCOMPLETE",methodologyVersion:DOLLAR_FX_R23_SHADOW_METHOD,mode:"SHADOW_ONLY"};

  return {
    status:"READY",
    score,
    observationDate:latest.observationDate,
    components,
    weights:{...DOLLAR_FX_R23_WEIGHTS},
    scoringMethod:DOLLAR_FX_R23_SCORING,
    raw:{
      absShortMomentum:latest.absShortMomentum,
      absAcceleration20:latest.absAcceleration20,
      volatility20:latest.volatility20,
      shortMomentum:latest.shortMomentum,
      acceleration20:latest.acceleration20,
    },
    methodologyVersion:DOLLAR_FX_R23_SHADOW_METHOD,
    interpretation:"Shadow R2.3: larger 20D dollar moves, larger 20D acceleration magnitude, and higher 20D dollar volatility receive higher shock-reversal scores using expanding PIT empirical percentiles.",
    rationale:"Only magnitude/volatility features that were directionally positive in both train and holdout feature diagnostics are retained. Dollar direction and level are excluded.",
    mode:"SHADOW_ONLY",
    productionFormulaChanged:false,
  };
}
