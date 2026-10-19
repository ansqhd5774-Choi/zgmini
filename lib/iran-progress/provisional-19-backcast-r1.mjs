/**
 * User-requested 2026-10-19 19-point PROVISIONAL display anchor.
 * Reverse recorded R3 headline-date changes for 14 calendar days; not an R4
 * probability, measured history, or replacement for the immutable R3 score.
 * Do not store this overlay in D1 or rewrite as-published historical scores.
 */
export const IRAN_PROVISIONAL_ANCHOR_R1=Object.freeze({
 version:'IRAN_PROVISIONAL_19_BACKCAST_14D_R1',
 anchorDate:'2026-10-19',
 anchorScore:19,
 anchorR3Score:37.9, // exact R3_3 PC/D1/API 2026-10-19 final captured in V58
 sourceClassifier:'IRAN_EVENT_RULES_R3_3',
});
const DAY=86400000;
const score=n=>Number(n.toFixed(2));
const bound=n=>Math.max(0,Math.min(100,score(n)));
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
 Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
export function provisionalIran19Backcast(data){
 const a=IRAN_PROVISIONAL_ANCHOR_R1;
 if(data?.version!=='IRAN_REFERENCE_FLOW_R3'||data.classifierVersion!==a.sourceClassifier||
  !validDate(data.asOfDate)||data.asOfDate<a.anchorDate||
  !Number.isFinite(data.score)||data.score<0||data.score>100||
  !Array.isArray(data.history)||data.history.length===0||data.history.length>14)
  return null;
 const end=Date.parse(data.asOfDate+'T00:00:00Z'),start=end-13*DAY;
 const deltas=new Map();let lastDate='';
 for(const p of data.history){
  if(!validDate(p?.date)||p.date<=lastDate||p.date>data.asOfDate||
   !Number.isFinite(p.delta)||!Number.isFinite(p.value)||p.value<0||p.value>100)
   return null;
  lastDate=p.date;
  if(Date.parse(p.date+'T00:00:00Z')>=start)deltas.set(p.date,p.delta);
 }
 if(!deltas.size)return null;
 // Align the USER'S specified 2026-10-19 historical endpoint to 19.
 // Any later publication-date deltas move the score only AFTER that date.
 // Thus an additional Oct 19 receipt never silently shifts the historical anchor.
 // The frozen R3 source checkpoint only carries the reference forward once
 // the 2026-10-19 date falls outside the rolling 14-day public history.
 const first=[...deltas.keys()][0];
 const anchorAt=Date.parse(a.anchorDate+'T00:00:00Z');
 const postAnchorDelta=[...deltas.entries()].reduce((total,[date,delta])=>
  date>a.anchorDate?score(total+delta):total,0);
 const anchorInWindow=anchorAt>=start;
 const endScore=bound(anchorInWindow?a.anchorScore+postAnchorDelta:
  a.anchorScore+(data.score-a.anchorR3Score));
 let cursor=endScore;
 const reverse=[];
 for(let i=13;i>=0;i--){
  const at=start+i*DAY,date=new Date(at).toISOString().slice(0,10);
  const phase=date<first?'EARLY_WINDOW_NO_DATED_REPORT':deltas.has(date)?
   'R3_PUBLICATION_DATE_DELTA':'NO_NEW_RECORDED_CHANGE';
  reverse.push({date,at,value:bound(cursor),carried:!deltas.has(date),
   estimated:true,measured:false,phase,
   reportedDelta:deltas.has(date)?deltas.get(date):null});
  // Reverse the change booked on this date to reach the previous day's score.
  cursor=score(cursor-(deltas.get(date)??0));
 }
 return {version:a.version,score:endScore,rawScore:data.score,anchorInWindow,
  anchorDate:a.anchorDate,anchorScore:a.anchorScore,anchorR3Score:a.anchorR3Score,
  history:reverse.reverse(),source:'R3_HEADLINE_PUBLICATION_DATE_DELTAS',
  historyMode:'PROVISIONAL_REVERSED_FROM_USER_ANCHOR',
  calibrated:false,verifiedWarState:false,probability:false,
  historyDayCount:14,
  note:'잠정 19점 기준 역산입니다. 날짜별 보도 변화량만 반영하며, 기록이 없는 날짜는 변화 없음으로 가정한 추정 구간입니다.'};
}
