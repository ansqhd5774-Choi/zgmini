// W06 display-only guard for the stored Inflation R2 12-month trend.
// A monthly producer can label the current partial month by its future end
// (e.g. Nov 30 while the approved stored asOfDate is Nov 18). Reuse the
// *already published* current score at its actual evaluation date; never
// invent an observation, source value, calculation, or new stored row.
const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;

function utcDay(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;
 const ms=Date.parse(value+'T00:00:00.000Z');
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value?ms:NaN;
}

function monthEnd(value){
 const year=Number(value.slice(0,4)),month=Number(value.slice(5,7));
 return new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
}

/**
 * UI only. The published monthly R2 history may contain one future-dated
 * current-month-end *evaluation* point. Rename that existing row to the
 * actual approved asOfDate only when its score equals the stored READY
 * current score. Future points with other values are excluded rather than
 * imputed, and no point is added when there is no matching existing row.
 *
 * @param {{trend?:Array<{label:string,value:number}>,asOfDate?:string|null,
 *   status?:string|null,score?:number|null}} [published]
 * @returns {Array<{date:string,score:number}>}
 */
export function inflationR2VisibleTrend(published={}){
 const asOfDate=published?.asOfDate;
 if(!Number.isFinite(utcDay(asOfDate)))return [];
 const end=monthEnd(asOfDate);
 const canUseCurrent=published?.status==='READY'&&validScore(published?.score);
 const rows=new Map();
 for(const point of Array.isArray(published?.trend)?published.trend:[]){
  if(!Number.isFinite(utcDay(point?.label))||!validScore(point?.value))continue;
  let date=point.label,fromCurrentMonthEnd=false;
  if(date>asOfDate){
   if(!(canUseCurrent&&date===end&&Math.abs(point.value-published.score)<1e-9))continue;
   date=asOfDate;
   fromCurrentMonthEnd=true;
  }
  // Preserve a genuine explicitly dated row over a remapped month-end row.
  const existing=rows.get(date);
  if(existing&&!existing.fromCurrentMonthEnd&&fromCurrentMonthEnd)continue;
  rows.set(date,{date,score:point.value,fromCurrentMonthEnd});
 }
 return [...rows.values()]
  .sort((a,b)=>a.date.localeCompare(b.date))
  .slice(-12)
  .map(({date,score})=>({date,score}));
}
