export const INFLATION_R3_SHADOW_METHOD="INFLATION_R3_SHADOW_R1";
export const INFLATION_R3_SHADOW_WEIGHTS=Object.freeze({
  targetStability:0.40,
  underlyingMomentum:0.30,
  expectations:0.15,
  laborCostPersistence:0.15,
});

const finiteScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const clamp=value=>Math.max(0,Math.min(100,value));

export function buildInflationR3Shadow({axes={},asOfDate=null}={}){
  const components={
    targetStability:axes?.TARGET_STABILITY,
    underlyingMomentum:axes?.UNDERLYING_MOMENTUM,
    expectations:axes?.EXPECTATIONS,
    laborCostPersistence:axes?.LABOR_COST_PERSISTENCE,
  };
  const missing=Object.entries(components).filter(([,value])=>!finiteScore(value)).map(([key])=>key);
  if(missing.length)return {
    status:"PARTIAL",score:null,missingFactors:missing,components,
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
    weights:{...INFLATION_R3_SHADOW_WEIGHTS},
    methodologyVersion:INFLATION_R3_SHADOW_METHOD,asOfDate,
    interpretation:"Shadow R3: target distance 40% + underlying momentum 30% + expectations 15% + labor-cost persistence 15%; reuses stored R2 axis scores only.",
    mode:"SHADOW_ONLY",productionFormulaChanged:false,
  };
}
