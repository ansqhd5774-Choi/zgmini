import {buildDollarFxR54} from "../diagnostic-layer/open-resolution-r53-components.mjs";

export const DOLLAR_FX_R2_SHADOW_METHOD="DOLLAR_FX_R2_SHADOW_R1";
export const DOLLAR_FX_R2_SHADOW_WEIGHTS=Object.freeze({
  level:0.10,
  shortMomentum:0.30,
  mediumMomentum:0.25,
  acceleration:0.15,
  volatility:0.20,
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const finiteScore=value=>finite(value)&&value>=0&&value<=100;
const clamp=value=>Math.max(0,Math.min(100,value));

function percentile(values,current){
  if(!values.length||!finite(current))return null;
  let below=0,equal=0;
  for(const value of values){if(value<current)below++;else if(value===current)equal++}
  return 100*(below+0.5*equal)/values.length;
}
function inverseExpandingScore(rows,{minValid=252}={}){
  const seen=[],out=[];
  for(const row of rows){
    seen.push(row.value);
    const p=seen.length>=minValid?percentile(seen,row.value):null;
    out.push({observationDate:row.observationDate,value:finite(p)?clamp(100-p):null});
  }
  return out;
}
function byDate(rows){return new Map(rows.map(row=>[row.observationDate,row]))}

export function buildDollarFxR2Shadow(rows=[],{asOfDate="9999-12-31",minValid=252}={}){
  const baseline=buildDollarFxR54(rows,{asOfDate,minValid});
  if(baseline.status!=="READY"||!Array.isArray(baseline.rows)){
    return {status:"PARTIAL",score:null,reason:baseline.reason??"DOLLAR_R54_NOT_READY",methodologyVersion:DOLLAR_FX_R2_SHADOW_METHOD,mode:"SHADOW_ONLY"};
  }
  const valid=baseline.rows.filter(row=>finite(row?.shortMomentum));
  const accelerationRows=[];
  for(let index=20;index<valid.length;index++){
    accelerationRows.push({
      observationDate:valid[index].observationDate,
      value:valid[index].shortMomentum-valid[index-20].shortMomentum,
    });
  }
  const accelerationScores=byDate(inverseExpandingScore(accelerationRows,{minValid}));
  const output=[];
  for(const row of baseline.rows){
    const acceleration=accelerationScores.get(row.observationDate)?.value??null;
    const parts=[row.levelScore,row.shortMomentumScore,row.mediumMomentumScore,acceleration,row.volatilityScore];
    const score=parts.every(finiteScore)?clamp(
      DOLLAR_FX_R2_SHADOW_WEIGHTS.level*row.levelScore+
      DOLLAR_FX_R2_SHADOW_WEIGHTS.shortMomentum*row.shortMomentumScore+
      DOLLAR_FX_R2_SHADOW_WEIGHTS.mediumMomentum*row.mediumMomentumScore+
      DOLLAR_FX_R2_SHADOW_WEIGHTS.acceleration*acceleration+
      DOLLAR_FX_R2_SHADOW_WEIGHTS.volatility*row.volatilityScore
    ):null;
    output.push({...row,accelerationScore:acceleration,shadowScore:score});
  }
  const latest=output.filter(row=>row.observationDate<=asOfDate&&finiteScore(row.shadowScore)).at(-1)??null;
  if(!latest)return {status:"PARTIAL",score:null,reason:"DOLLAR_R2_ACCELERATION_WARMUP",rows:output,methodologyVersion:DOLLAR_FX_R2_SHADOW_METHOD,mode:"SHADOW_ONLY"};
  return {
    status:"READY",score:latest.shadowScore,observationDate:latest.observationDate,
    components:{
      level:latest.levelScore,
      shortMomentum:latest.shortMomentumScore,
      mediumMomentum:latest.mediumMomentumScore,
      acceleration:latest.accelerationScore,
      volatility:latest.volatilityScore,
    },
    weights:{...DOLLAR_FX_R2_SHADOW_WEIGHTS},
    raw:{
      broadDollarIndex:latest.broadDollarIndex,
      shortMomentum:latest.shortMomentum,
      mediumMomentum:latest.mediumMomentum,
      volatility20:latest.volatility20,
    },
    trend:output.filter(row=>finiteScore(row.shadowScore)).slice(-370).map(row=>({label:row.observationDate,value:row.shadowScore})),
    methodologyVersion:DOLLAR_FX_R2_SHADOW_METHOD,
    interpretation:"Shadow R2: level 10% + 20D momentum 30% + 60D momentum 25% + 20D acceleration 15% + 20D volatility 20%.",
    mode:"SHADOW_ONLY",productionFormulaChanged:false,
  };
}
