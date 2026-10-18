// One-time, read-only compatibility test for already stored recession projections.
// No change to source checkpoint, calculation formula, D1 schema or cadence.
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
export function requiresRecessionR3DisplayRefresh(envelope){
 const payload=envelope?.payload;
 if(payload?.status!=="READY")return false;
 if(payload?.methodologyVersion!=="RECESSION_R13_CURRENT_VINTAGE")return false;
 const comparisons=payload?.scoreComparisons;
 if(!comparisons||!["week","month","threeMonth","sixMonth","year"].every(key=>own(comparisons,key)))return true;
 if(!Array.isArray(payload?.trend))return true;
 const components=payload?.components;
 // Check shape only; valid missing values (null/[]) must NOT trigger repeat compute.
 if(!Array.isArray(components)||components.length!==7)return true;
 return components.some(row=>!row||!own(row,"previousValue")||!own(row,"previousObservationDate")||!Array.isArray(row.trend));
}
