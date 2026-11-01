// Display-only one-time refresh from existing local input checkpoints.
// Null values and empty histories remain valid. Never schedule new provider collection.
const has=(o,k)=>o!==null&&typeof o==="object"&&Object.prototype.hasOwnProperty.call(o,k);
export function requiresCreditR2DisplayRefresh(envelope){
 const p=envelope?.payload;
 if(p?.status!=="READY"||p?.methodologyVersion!=="CREDIT_RISK_DIAGNOSTIC_R1")return false;
 if(!Array.isArray(p.core)||p.core.length!==4||!Array.isArray(p.supplementals)||p.supplementals.length!==5)return true;
 const comparisons=p.scoreComparisons;
 if(!comparisons||!["week","month","threeMonth","sixMonth","year"].every(k=>has(comparisons,k)))return true;
 // Once-only display refresh for a verified READY score whose as-of point is
 // missing from the existing historical mini chart; never collect new inputs.
 if(p.scoreMatch===true&&typeof p.score==="number"&&Number.isFinite(p.score)&&typeof p.asOfDate==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(p.asOfDate)&&Array.isArray(p.trend)&&p.trend.at(-1)?.label!==p.asOfDate)return true;
 return [...p.core,...p.supplementals].some(row=>!row||!has(row,"previousValue")||!has(row,"previousObservationDate")||!Array.isArray(row.trend));
}
