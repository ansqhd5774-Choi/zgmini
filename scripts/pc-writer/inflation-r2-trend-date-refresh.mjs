// One-time, saved-data-only repair gate for the approved Inflation R2 trend.
// No new source checkpoint, provider fetch, D1 action or synthetic observation.
// A previous builder used the future end of the active month as its final
// evaluation label. The corrected builder evaluates that point at asOfDate.
const validDay=value=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const time=Date.parse(value+'T00:00:00.000Z');
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value;
};
const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&
 value>=0&&value<=100;

export function requiresInflationR2TrendDateRefresh(envelope){
 const payload=envelope?.payload;
 if(payload?.status!=='READY'||
  payload?.methodologyVersion!=='INFLATION_R2_R29_56_IA'||
  !validDay(payload.asOfDate)||!validScore(payload.score))
  return false;
 const points=payload.trend;
 if(!Array.isArray(points)||points.length<1||points.length>12)return false;
 const last=points.at(-1);
 if(!validDay(last?.label)||!validScore(last?.value))return false;
 const [year,month]=payload.asOfDate.split('-').map(Number);
 const completedAt=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
 if(completedAt<=payload.asOfDate||last.label!==completedAt)return false;
 // This is precisely the legacy current-month-end projection, not a
 // general-purpose rewrite of malformed/future-dated histories.
 let previous='';
 for(const point of points.slice(0,-1)){
  if(!validDay(point?.label)||!validScore(point?.value)||
   point.label<=previous||point.label>=payload.asOfDate)return false;
  previous=point.label;
 }
 return previous<last.label;
}

// Compatibility for an installed, otherwise approved R2 builder that computes
// the current score at asOfDate but labels the last trend bucket at a future
// month end. Only the exact verified legacy shape is eligible: do not infer
// missing scores/dates or change PIT inputs, weights, preceding trend points,
// source timestamps, or any other published fields.
//
// New builders already produce a last point at asOfDate and return unchanged.
// A legacy PC Writer may apply this to a fresh, saved-input-derived payload
// before its existing guarded publication; this function does not publish.
export function inflationR2AsOfTrendCompatibility(payload){
 if(!requiresInflationR2TrendDateRefresh({payload}))return payload;
 const last=payload.trend.at(-1);
 return {
  ...payload,
  trend:[...payload.trend.slice(0,-1),
   {...last,label:payload.asOfDate,value:payload.score}],
 };
}
