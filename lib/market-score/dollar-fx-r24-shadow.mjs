import {buildDollarFxR54} from "../diagnostic-layer/open-resolution-r53-components.mjs";
import {empiricalPercentileScore} from "./dollar-fx-r23-shadow.mjs";

export const DOLLAR_FX_R24_SHADOW_METHOD="DOLLAR_FX_R2_4_TWO_FACTOR_REVERSAL_SHADOW_R1";
export const DOLLAR_FX_R24_WEIGHTS=Object.freeze({
  absShortMomentum:0.50,
  absAcceleration20:0.50,
});
export const DOLLAR_FX_R24_SCORING="EXPANDING_EMPIRICAL_PERCENTILE_PIT";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const finiteScore=value=>finite(value)&&value>=0&&value<=100;
const clamp=value=>Math.max(0,Math.min(100,value));

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
      shortMomentum:finite(row.shortMomentum)?row.shortMomentum:null,
      acceleration20:finite(acceleration20)?acceleration20:null,
    });
  }
  return {baseline,rows:out};
}

export function buildDollarFxR24Shadow(rows=[],{asOfDate="9999-12-31"}={}){
  const built=featureRows(rows,asOfDate);
  if(built.baseline.status!=="READY"){
    return {status:"PARTIAL",score:null,reason:built.baseline.reason??"DOLLAR_R54_NOT_READY",methodologyVersion:DOLLAR_FX_R24_SHADOW_METHOD,mode:"SHADOW_ONLY"};
  }
  const eligible=built.rows.filter(row=>[row.absShortMomentum,row.absAcceleration20].every(finite));
  const latest=eligible.at(-1)??null;
  if(!latest)return {status:"PARTIAL",score:null,reason:"DOLLAR_R24_WARMUP",methodologyVersion:DOLLAR_FX_R24_SHADOW_METHOD,mode:"SHADOW_ONLY"};

  const through=eligible.filter(row=>row.observationDate<=latest.observationDate);
  const shortScore=empiricalPercentileScore(through.map(row=>row.absShortMomentum),latest.absShortMomentum);
  const accelerationScore=empiricalPercentileScore(through.map(row=>row.absAcceleration20),latest.absAcceleration20);
  const components={absShortMomentum:shortScore,absAcceleration20:accelerationScore};
  const score=Object.values(components).every(finiteScore)?clamp(
    DOLLAR_FX_R24_WEIGHTS.absShortMomentum*shortScore+
    DOLLAR_FX_R24_WEIGHTS.absAcceleration20*accelerationScore
  ):null;
  if(!finiteScore(score))return {status:"PARTIAL",score:null,reason:"DOLLAR_R24_SCORE_INCOMPLETE",methodologyVersion:DOLLAR_FX_R24_SHADOW_METHOD,mode:"SHADOW_ONLY"};

  return {
    status:"READY",
    score,
    observationDate:latest.observationDate,
    components,
    weights:{...DOLLAR_FX_R24_WEIGHTS},
    scoringMethod:DOLLAR_FX_R24_SCORING,
    raw:{
      absShortMomentum:latest.absShortMomentum,
      absAcceleration20:latest.absAcceleration20,
      shortMomentum:latest.shortMomentum,
      acceleration20:latest.acceleration20,
    },
    methodologyVersion:DOLLAR_FX_R24_SHADOW_METHOD,
    interpretation:"Shadow R2.4: 20D dollar move magnitude and 20D acceleration magnitude are equally weighted after expanding PIT empirical-percentile normalization. Dollar direction, level, medium momentum and volatility are excluded.",
    rationale:"These are the only two features that retained positive 1M and 3M relationships in both the design and independent external PIT diagnostics, and their mutual correlation was moderate rather than redundant.",
    mode:"SHADOW_ONLY",
    productionFormulaChanged:false,
  };
}
