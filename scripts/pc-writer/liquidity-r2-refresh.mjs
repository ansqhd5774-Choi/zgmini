// One-time projection display refresh using already stored inputs.
// Empty histories and null missing values are valid; only absent fields cause refresh.
const has=(v,k)=>v!==null&&typeof v==="object"&&Object.prototype.hasOwnProperty.call(v,k);
export function requiresLiquidityR2DisplayRefresh(envelope){
 const payload=envelope?.payload;
 if(payload?.status!=="READY")return false;
 if(payload?.methodologyVersion!=="LIQUIDITY_CRISIS_DIAGNOSTIC_R1")return false;
 const indicators=payload.indicators;
 if(!Array.isArray(indicators)||indicators.length!==13)return true;
 const comparisons=payload.scoreComparisons;
 if(!comparisons||!["week","month","threeMonth","sixMonth","year"].every(key=>has(comparisons,key)))return true;
 return indicators.some(row=>!row||!has(row,"previousValue")||!has(row,"previousObservationDate")||!Array.isArray(row.trend));
}
