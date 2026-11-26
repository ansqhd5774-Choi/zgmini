// W06 R4 #47: the already-published R7 debt projection owns its score and
// source calculations. Only confirm its stored/verified display contract.
export const DEBT_DISPLAY_METHOD='DEBT_RISK_R7';
export const DEBT_DISPLAY_HISTORY='CURRENT_VINTAGE_ONLY';
export const DEBT_DISPLAY_POLICY='STORED_INPUTS_CURRENT_VINTAGE_LATEST_OBSERVATION_AT_OR_BEFORE_DATE_NO_INTERPOLATION';
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;

export function debtVerifiedDisplayScore(payload){
 if(payload?.status!=='READY'||payload.methodologyVersion!==DEBT_DISPLAY_METHOD||
  payload.historyMode!==DEBT_DISPLAY_HISTORY||payload.historyPolicy!==DEBT_DISPLAY_POLICY||
  payload.lookAheadSafe!==false||payload.scoreMatch!==true||
  !validDate(payload.asOfDate)||!validScore(payload.score)||
  !validScore(payload.recalculatedScore)||
  Math.abs(payload.recalculatedScore-payload.score)>1e-8)return null;
 return payload.score;
}
export function debtVerifiedDisplayTrend(payload,score){
 if(!validScore(score)||debtVerifiedDisplayScore(payload)!==score)return [];
 const rows=new Map(),conflicts=new Set();
 for(const p of Array.isArray(payload?.trend)?payload.trend:[]){
  const day=p?.label,value=p?.value;
  if(!validDate(day)||day>payload.asOfDate||!validScore(value))continue;
  if(day===payload.asOfDate&&Math.abs(value-score)>1e-8){conflicts.add(day);continue;}
  if(rows.has(day)&&Math.abs(rows.get(day)-value)>1e-8){conflicts.add(day);continue;}
  rows.set(day,value);
 }
 const points=[...rows].filter(([day])=>!conflicts.has(day))
  .sort(([a],[b])=>a.localeCompare(b)).map(([label,value])=>({label,value}));
 const last=points.at(-1);
 // The source history builder only appends the actual verified saved current
 // as-of point. An absent/conflicted anchor must not be invented by the UI.
 return last?.label===payload.asOfDate&&Math.abs(last.value-score)<=1e-8?points:[];
}
