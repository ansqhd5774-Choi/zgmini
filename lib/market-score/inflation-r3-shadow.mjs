export const INFLATION_R3_SHADOW_METHOD="INFLATION_R3_1_SHADOW_R1";
export const INFLATION_R3_SHADOW_WEIGHTS=Object.freeze({
  targetStability:0.40,
  underlyingMomentum:0.30,
  expectations:0.15,
  laborCostPersistence:0.15,
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const finiteScore=value=>finite(value)&&value>=0&&value<=100;
const clamp=value=>Math.max(0,Math.min(100,value));
const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;

export function inflationTargetScoreR31(rate,{target=2,fullPenaltyDistance=2}={}){
  if(!finite(rate)||!finite(target)||!finite(fullPenaltyDistance)||fullPenaltyDistance<=0)return null;
  return clamp(100-100*Math.abs(rate-target)/fullPenaltyDistance);
}

export function inflationMomentumScoreR31({currentRate,shortRunRate,fullRewardDistance=2}={}){
  if(!finite(currentRate)||!finite(shortRunRate)||!finite(fullRewardDistance)||fullRewardDistance<=0)return null;
  const improvement=currentRate-shortRunRate;
  return clamp(50+50*improvement/fullRewardDistance);
}

function featureValue(features,id){
  const value=features?.[id]?.value;
  return finite(value)?value:null;
}

export function buildInflationR3Shadow({features={},axes={},asOfDate=null}={}){
  const corePce=featureValue(features,"CORE_PCE");
  const coreCpi=featureValue(features,"CORE_CPI");
  const coreCpi3m=featureValue(features,"CORE_CPI_3M");
  const medianCpi3m=featureValue(features,"MEDIAN_CPI");
  const trimmedCpi3m=featureValue(features,"TRIM16_CPI");
  const expectation=featureValue(features,"INF_EXPECT");

  const targetParts=[corePce,coreCpi].map(value=>inflationTargetScoreR31(value));
  const shortRunParts=[coreCpi3m,medianCpi3m,trimmedCpi3m].filter(finite);
  const shortRunRate=shortRunParts.length===3?mean(shortRunParts):null;
  const underlyingMomentum=inflationMomentumScoreR31({currentRate:coreCpi,shortRunRate});
  const expectations=inflationTargetScoreR31(expectation);
  const laborCostPersistence=finiteScore(axes?.LABOR_COST_PERSISTENCE)?axes.LABOR_COST_PERSISTENCE:null;
  const targetStability=targetParts.every(finiteScore)?mean(targetParts):null;

  const components={targetStability,underlyingMomentum,expectations,laborCostPersistence};
  const missing=Object.entries(components).filter(([,value])=>!finiteScore(value)).map(([key])=>key);
  if(missing.length)return {
    status:"PARTIAL",score:null,missingFactors:missing,components,
    raw:{corePce,coreCpi,shortRunRate,expectation},
    methodologyVersion:INFLATION_R3_SHADOW_METHOD,asOfDate,
    mode:"SHADOW_ONLY",productionFormulaChanged:false,
  };

  const score=clamp(
    INFLATION_R3_SHADOW_WEIGHTS.targetStability*components.targetStability+
    INFLATION_R3_SHADOW_WEIGHTS.underlyingMomentum*components.underlyingMomentum+
    INFLATION_R3_SHADOW_WEIGHTS.expectations*components.expectations+
    INFLATION_R3_SHADOW_WEIGHTS.laborCostPersistence*components.laborCostPersistence
  );
  return {
    status:"READY",score,missingFactors:[],components,
    raw:{corePce,coreCpi,shortRunRate,expectation},
    weights:{...INFLATION_R3_SHADOW_WEIGHTS},
    normalization:{
      target:"100 at 2.0%; linear to 0 at +/-2.0 percentage points",
      momentum:"50 when core CPI YoY equals mean of 3M core/median/trimmed CPI; +/-2.0pp maps to 100/0",
      expectations:"same fixed 2% target-distance scale",
      laborCostPersistence:"stored R2 labor-cost axis retained at 15%",
    },
    methodologyVersion:INFLATION_R3_SHADOW_METHOD,asOfDate,
    interpretation:"Shadow R3.1: direct 2% target distance and direct disinflation momentum replace relative R2 target/momentum percentiles; expectations use the same fixed target scale; labor-cost axis retained.",
    mode:"SHADOW_ONLY",productionFormulaChanged:false,
  };
}
