// E1-R5 source-observation presentation metadata only. Never compute or normalize scores here.
// Dates are reporting-period ends, not source publication or investable point-in-time dates.
export const E1_R5_OBSERVATION_BASIS='CURRENT_VINTAGE_SOURCE_PERIOD_END';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const cutoff1Y=date=>new Date(Date.parse(date+'T00:00:00Z')-366*86400000).toISOString().slice(0,10);

export function buildEarningsDatedSourceComparison({observations=[],asOfDate=null,currentValue=null,scale=1}={}){
 if(!validDate(asOfDate)||!finite(currentValue)||!finite(scale)||scale===0||!Array.isArray(observations))return null;
 const byEnd=new Map();
 for(const row of observations){
  if(!validDate(row?.end)||row.end>asOfDate||!finite(row?.value))continue;
  const prev=byEnd.get(row.end);
  if(prev!==undefined&&prev!==row.value)return null; // conflicting official observations: no display
  byEnd.set(row.end,row.value);
 }
 const ordered=[...byEnd].sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({date,value:value*scale}));
 const current=ordered.at(-1);
 if(!current||!finite(current.value)||Math.abs(current.value-currentValue)>1e-8)return null;
 const history=ordered.filter(row=>row.date>=cutoff1Y(asOfDate));
 const prev=ordered.at(-2)??null;
 return {
  historyKind:E1_R5_OBSERVATION_BASIS,
  sourcePeriodEnd:current.date,
  previousValue:prev?.value??null,
  previousPeriodEnd:prev?.date??null,
  sourceHistory1Y:history.length>=2?history:[],
 };
}


/**
 * Stored-input AS-OF reconstruction for non-S6/S11 E1-R5 detail indicators.
 * Date is the MODEL EVALUATION ANCHOR, not an official reporting period,
 * release date or publication-time (PIT) observation. No scoring here.
 */
export const E1_R5_ASOF_OBSERVATION_BASIS='ASOF_RECONSTRUCTED_NOT_OFFICIAL_PERIOD_END';
export const E1_R5_ASOF_IDS=Object.freeze(['S1','S2','S3','S4','S5','S7','S8','S9','S10','S12','S13']);
const eligibleAsOf=new Set(E1_R5_ASOF_IDS);
export function buildEarningsAsOfComparison({id,observations=[],asOfDate=null,currentValue=null,sourceVersion=null,sourceStoredAt=null}={}){
 if(!eligibleAsOf.has(id)||!validDate(asOfDate)||!finite(currentValue)||
    !Array.isArray(observations)||sourceVersion!=='E1-R5-PRODUCTION-CYCLE-R1'||
    typeof sourceStoredAt!=='string'||!Number.isFinite(Date.parse(sourceStoredAt)))return null;
 if(id==='S12'&&(currentValue<0||currentValue>100))return null;
 const cutoff=cutoff1Y(asOfDate),rows=observations.filter(row=>row?.date>=cutoff);
 if(rows.length<2||rows.length>8)return null;
 let lastDate=null;
 for(const row of rows){
  if(!validDate(row?.date)||row.date>asOfDate||!finite(row.value)||
     (lastDate!==null&&row.date<=lastDate)||
     (id==='S12'&&(row.value<0||row.value>100)))return null;
  lastDate=row.date;
 }
 const current=rows.at(-1),previous=rows.at(-2);
 if(current.date!==asOfDate||Math.abs(current.value-currentValue)>1e-8)return null;
 return {
  historyKind:E1_R5_ASOF_OBSERVATION_BASIS,
  previousValue:previous.value,
  previousPeriodEnd:previous.date, // legacy field name: evaluation anchor for THIS basis
  sourceHistory1Y:rows.map(row=>({date:row.date,value:row.value})),
  historySourceVersion:sourceVersion,
  historySourceStoredAt:sourceStoredAt,
 };
}
