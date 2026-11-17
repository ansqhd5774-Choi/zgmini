// W06 R4 #69: normalize public, verified chart points only.
// A numeric provisional/partial/stale candidate is NOT a published observation.
// This is display-only and does not alter the source score or archived data.
const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;

// UI-only check: a historical point cannot be newer than the public
// snapshot that the same chart/card is displaying. Do not change stored rows.
function observationTime(label){
 if(typeof label!=='string')return NaN;
 const day=label.slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return NaN;
 const dayTime=Date.parse(day+'T00:00:00Z');
 if(!Number.isFinite(dayTime)||new Date(dayTime).toISOString().slice(0,10)!==day)return NaN;
 if(label.length===10)return dayTime;
 // Intraday values must specify their UTC offset, not depend on the viewer's timezone.
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(label))return NaN;
 return Date.parse(label);
}

/**
 * @param {Array<{label?:string,date?:string,value?:number|null,score?:number|null,status?:string}>} [data]
 * @param {string|null} [publishedAt] - confirmed public snapshot time, not collection time
 * @returns {Array<{label:string,value:number}>}
 */
export function normalizeMarketTrendPointsR4(data=[],publishedAt=null){
 const cutoff=typeof publishedAt==='string'?Date.parse(publishedAt):NaN;
 const bounded=Number.isFinite(cutoff);
 return (Array.isArray(data)?data:[]).flatMap(point=>{
  // Historical CM-R1 trend points omit status. Where a producer supplies it,
  // only READY means a confirmed, usable plotted observation.
  if(point?.status!=null&&point.status!=='READY')return [];
  const label=typeof point?.label==='string'&&point.label
   ?point.label
   :typeof point?.date==='string'&&point.date?point.date:null;
  const raw=typeof point?.value==='number'?point.value
   :typeof point?.score==='number'?point.score:null;
  if(label===null||!validScore(raw))return [];
  if(bounded){
   const observed=observationTime(label);
   if(!Number.isFinite(observed)||observed>cutoff)return [];
  }
  return [{label,value:raw}];
 });
}
