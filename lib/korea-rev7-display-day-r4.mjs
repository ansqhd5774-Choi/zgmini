// W06 Korea Rev7 display-only calendar guard.
// The stored Rev7 trading-day contract uses compact UTC YYYYMMDD keys.
// Never normalize an impossible date into a different displayed trading day.
export function koreaRev7DisplayDayMs(value){
 if(typeof value!=='string'||!/^\d{8}$/.test(value))return NaN;
 const iso=value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8);
 const ms=Date.parse(iso+'T00:00:00.000Z');
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===iso?ms:NaN;
}

/**
 * @template {{date:string}} T
 * @param {Array<T> | null | undefined} points
 * @param {string | null | undefined} observationDate
 * @param {number} periodDays
 * @returns {Array<T & {time:number}>}
 */
export function koreaRev7VisibleHistoryDays(points,observationDate,periodDays){
 const anchor=koreaRev7DisplayDayMs(observationDate);
 if(!Number.isFinite(anchor))return [];
 const days=Math.max(1,Math.trunc(periodDays)||1);
 return (Array.isArray(points)?points:[]).flatMap(point=>{
  const ms=koreaRev7DisplayDayMs(point?.date);
  return Number.isFinite(ms)&&ms<=anchor&&ms>=anchor-days*86400000
   ?[{...point,time:ms}]:[];
 }).sort((a,b)=>a.time-b.time);
}
