// Distinct eight-risk earnings diagnostic history. The 12-domain E1-R5 series must never enter this chart.
export const EARNINGS_RISK_HISTORY_KIND='MATCHED_DIAGNOSTIC_METHOD_STORED_DATES';
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const method=x=>typeof x==='string'&&/^[A-Za-z0-9_.:-]{1,120}$/.test(x);
export function verifiedEarningsRiskTrend({snapshots=[],current=null}={}){
 const currentDate=current?.asOfDate,currentScore=current?.score,currentMethod=current?.methodologyVersion;
 if(!date(currentDate)||!score(currentScore)||!method(currentMethod))return {kind:'UNVERIFIED',points:[]};
 const from=new Date(Date.parse(currentDate+'T00:00:00Z'));from.setUTCFullYear(from.getUTCFullYear()-1);
 const cutoff=from.toISOString().slice(0,10),byDay=new Map();
 for(const item of Array.isArray(snapshots)?snapshots:[]){
  const key=item?.snapshotKey??item?.date,body=item?.body??item;
  const source=body?.diagnostics8?.earningsRecessionDefense;
  if(!date(key)||key<cutoff||key>currentDate||body?.asOfDate!==key)continue;
  if(source?.status!=='READY'||!score(source.score)||source.methodologyVersion!==currentMethod)continue;
  byDay.set(key,{date:key,score:source.score});
 }
 const points=[...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date));
 const last=points.at(-1);
 if(!last||last.date!==currentDate||Math.abs(last.score-currentScore)>1e-8)return {kind:'UNVERIFIED',points:[]};
 return {kind:EARNINGS_RISK_HISTORY_KIND,points};
}
