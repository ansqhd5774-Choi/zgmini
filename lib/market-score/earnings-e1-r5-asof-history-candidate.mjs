// R35: DRAFT/INERT presentation candidate. No writer, projection or UI imports this module.
// This is not an official reporting-period, release-date, or investment PIT series.
// It does not calculate E1-R5 raw factors, scores, weights, or historical percentiles.
export const E1_R5_ASOF_HISTORY_BASIS='ASOF_RECONSTRUCTED_NOT_OFFICIAL_PERIOD_END';
export const E1_R5_ASOF_HISTORY_IDS=Object.freeze([
 'S1','S2','S3','S4','S5','S7','S8','S9','S10','S12','S13',
]);
export const E1_R5_ASOF_HISTORY_SOURCE_VERSION='E1-R5-PRODUCTION-CYCLE-R1';
const ids=new Set(E1_R5_ASOF_HISTORY_IDS);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
function dateMs(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const t=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===value?t:null;
}
function provenanceValid(version,storedAt){
 return version===E1_R5_ASOF_HISTORY_SOURCE_VERSION&&
  typeof storedAt==='string'&&Number.isFinite(Date.parse(storedAt))&&
  new Date(storedAt).toISOString()===storedAt;
}
// Values must be independently reconstructed using the APPROVED production functions.
// S12 values are the existing NORMALIZED COMPOSITE INDICATOR VALUE (0-100),
// not the raw CFO/guidance revisions; S13 is the EXISTING guidance breadth raw value.
// All other values must use the exact units of the existing stored indicator.
// Fail closed on mixed, missing, conflicting, or mismatching evidence.
export function buildEarningsAsOfHistoryCandidate({
 id,asOfDate,currentValue,observations=[],sourceVersion,sourceStoredAt,
}={}){
 if(!ids.has(id)||dateMs(asOfDate)===null||!finite(currentValue)||
  !provenanceValid(sourceVersion,sourceStoredAt)||!Array.isArray(observations))return null;
 if(id==='S12'&&(currentValue<0||currentValue>100))return null;
 const asOf=dateMs(asOfDate);
 const cutoff=asOf-366*86400000;
 if(observations.length<2||observations.length>8)return null;
 const safe=[];let previousMs=null;
 for(const item of observations){
  const t=dateMs(item?.date);
  if(t===null||t<cutoff||t>asOf||!finite(item?.value)||
    (previousMs!==null&&t<=previousMs)||
    (id==='S12'&&(item.value<0||item.value>100)))return null;
  safe.push({date:item.date,value:item.value});
  previousMs=t;
 }
 const last=safe.at(-1),prior=safe.at(-2);
 if(last.date!==asOfDate||Math.abs(last.value-currentValue)>1e-8)return null;
 // Explicit names avoid reusing 'sourcePeriodEnd' or mislabelling reconstruction as a source release.
 return {
  id,basis:E1_R5_ASOF_HISTORY_BASIS,
  current:{evaluationAsOfDate:last.date,value:last.value},
  previous:{evaluationAsOfDate:prior.date,value:prior.value},
  history1Y:safe,
  sourceVersion,sourceStoredAt,
 };
}
