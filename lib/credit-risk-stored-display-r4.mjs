// W06 R4 #44: display-only safety gate for the existing four-input credit R1 projection.
// Reuse published current and observed history; never recalculate scores or infer missing points.
export const CREDIT_DISPLAY_METHOD='CREDIT_RISK_DIAGNOSTIC_R1';
export const CREDIT_DISPLAY_HISTORY='CURRENT_VINTAGE_DERIVED_1Y';
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
  Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;

export function creditVerifiedDisplayScore(payload){
  return payload?.status==='READY'&&payload?.methodologyVersion===CREDIT_DISPLAY_METHOD&&
    payload?.historyMode===CREDIT_DISPLAY_HISTORY&&payload?.lookAheadSafe===false&&
    payload?.scoreMatch===true&&validDate(payload?.asOfDate)&&validScore(payload?.score)
    ?payload.score:null;
}
export function creditVerifiedDisplayTrend(payload,score){
  if(!validScore(score)||creditVerifiedDisplayScore(payload)!==score)return [];
  const day=new Map(),conflicts=new Set(),asOf=payload.asOfDate;
  for(const row of Array.isArray(payload?.trend)?payload.trend:[]){
    const date=row?.label,value=row?.value;
    if(!validDate(date)||date>asOf||!validScore(value))continue;
    if(date===asOf&&value!==score){conflicts.add(date);continue;}
    if(day.has(date)&&day.get(date)!==value){conflicts.add(date);continue;}
    day.set(date,value);
  }
  // The existing credit display shows one latest *actual* observation per month.
  // Exclude conflicting day records before selecting the monthly endpoint.
  const byMonth=new Map();
  for(const [label,value] of [...day].filter(([label])=>!conflicts.has(label)).sort(([a],[b])=>a.localeCompare(b)))
    byMonth.set(label.slice(0,7),{label,value});
  return [...byMonth.values()];
}
