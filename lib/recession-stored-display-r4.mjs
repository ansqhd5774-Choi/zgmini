// Presentation-only gate for the approved Recession R13 current-vintage projection.
// Do not infer a current score or fabricate a missing historic trading/monthly point.
export const RECESSION_DISPLAY_METHOD='RECESSION_R13_CURRENT_VINTAGE';
export const RECESSION_DISPLAY_HISTORY='STORED_INPUTS_CURRENT_VINTAGE';
const scoreOk=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const dateOk=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
  !Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;

export function recessionVerifiedDisplayScore(payload){
  if(payload?.status!=='READY'||
    payload?.methodologyVersion!==RECESSION_DISPLAY_METHOD||
    payload?.historyMode!==RECESSION_DISPLAY_HISTORY||
    payload?.lookAheadSafe!==false||
    !dateOk(payload?.asOfDate)||
    !scoreOk(payload?.score))return null;
  return payload.score;
}

export function recessionVerifiedDisplayTrend(payload,score){
  if(!scoreOk(score)||recessionVerifiedDisplayScore(payload)!==score)return [];
  const asOf=payload.asOfDate;
  const byDate=new Map(),conflicts=new Set();
  for(const row of Array.isArray(payload.trend)?payload.trend:[]){
    const date=row?.label,value=row?.value;
    if(!dateOk(date)||date>asOf||!scoreOk(value))continue;
    if(date===asOf&&value!==score){conflicts.add(date);continue;}
    if(byDate.has(date)&&byDate.get(date)!==value){conflicts.add(date);continue;}
    byDate.set(date,value);
  }
  return [...byDate].filter(([date])=>!conflicts.has(date))
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([label,value])=>({label,value}));
}
