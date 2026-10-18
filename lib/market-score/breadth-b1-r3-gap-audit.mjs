/**
 * Diagnostic-only B1-R3 session continuity check.
 * Input: coverage-eligible stored trend dates, not raw price rows.
 * Does not fetch, store, calculate factors, or publish.
 */
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
function calendarDate(value){
  if(typeof value!=="string"||!DATE_RE.test(value))return false;
  const t=new Date(value+"T00:00:00Z");
  return Number.isFinite(t.getTime())&&t.toISOString().slice(0,10)===value;
}
export function auditStoredBreadthSessions(rows,{marketSession,maxMissingDates=20,maxSpanDays=500}={}){
  if(typeof marketSession!=="function")throw new TypeError("BREADTH_GAP_SESSION_CHECKER_REQUIRED");
  if(!Array.isArray(rows))throw new TypeError("BREADTH_GAP_ROWS_INVALID");
  if(!Number.isInteger(maxMissingDates)||maxMissingDates<1||maxMissingDates>260)throw new TypeError("BREADTH_GAP_LIMIT_INVALID");
  if(!Number.isInteger(maxSpanDays)||maxSpanDays<1||maxSpanDays>730)throw new TypeError("BREADTH_GAP_SPAN_LIMIT_INVALID");
  const dates=[];
  for(const row of rows){
    const value=row?.tradeDate??row?.trade_date;
    if(!calendarDate(value)||!marketSession(value))throw new TypeError("BREADTH_GAP_DATE_INVALID");
    dates.push(value);
  }
  const distinct=[...new Set(dates)].sort();
  if(distinct.length<2)return {status:"INSUFFICIENT_HISTORY",eligiblePoints:distinct.length,missingCount:0,missingDates:[],truncated:false,first:distinct[0]??null,last:distinct[0]??null};
  const first=distinct[0],last=distinct.at(-1),start=Date.parse(first+"T00:00:00Z"),end=Date.parse(last+"T00:00:00Z");
  const spanDays=Math.round((end-start)/86400000);
  if(spanDays<1||spanDays>maxSpanDays)throw new RangeError("BREADTH_GAP_WINDOW_INVALID");
  const has=new Set(distinct),missing=[];
  for(let offset=1;offset<spanDays;offset++){
    const day=new Date(start+offset*86400000).toISOString().slice(0,10);
    if(marketSession(day)&&!has.has(day))missing.push(day);
  }
  return {status:missing.length?"INTERNAL_SESSIONS_MISSING":"CONTIGUOUS",first,last,eligiblePoints:distinct.length,missingCount:missing.length,
    missingDates:missing.slice(0,maxMissingDates),truncated:missing.length>maxMissingDates};
}
