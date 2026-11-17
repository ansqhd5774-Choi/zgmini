// W06 R4 #69: normalize public, verified chart points only.
// A numeric provisional/partial/stale candidate is NOT a published observation.
// This is display-only and does not alter the source score or archived data.
const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;

/**
 * @param {Array<{label?:string,date?:string,value?:number|null,score?:number|null,status?:string}>} [data]
 * @returns {Array<{label:string,value:number}>}
 */
export function normalizeMarketTrendPointsR4(data=[]){
 return (Array.isArray(data)?data:[]).flatMap(point=>{
  // Historical CM-R1 trend points omit status. Where a producer supplies it,
  // only READY means a confirmed, usable plotted observation.
  if(point?.status!=null&&point.status!=='READY')return [];
  const label=typeof point?.label==='string'&&point.label
   ?point.label
   :typeof point?.date==='string'&&point.date?point.date:null;
  const raw=typeof point?.value==='number'?point.value
   :typeof point?.score==='number'?point.score:null;
  return label!==null&&validScore(raw)?[{label,value:raw}]:[];
 });
}
