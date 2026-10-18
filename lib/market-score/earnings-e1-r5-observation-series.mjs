// E1-R5 source-observation presentation metadata only. Never compute or normalize scores here.
// Dates are reporting-period ends, not source publication or investable point-in-time dates.
export const E1_R5_OBSERVATION_BASIS='CURRENT_VINTAGE_SOURCE_PERIOD_END';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'));
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
