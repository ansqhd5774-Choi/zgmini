// Display-only comparisons built from actual previously published score snapshots.
// Never reinterpret raw indicator trends or mix different scoring methodologies.
import {liquidityStoredScoreComparisons} from '../../worker/projection-builders/liquidity-stored-history.mjs';
import {E1_R5_SCORE_KEYS,E1_R5_WEIGHTS} from '../../lib/market-score/earnings-e1-r5.mjs';

const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const validScore=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
// Published domains often omit `source`; the explicit methodology version
// is then the only published lineage identifier. Never join unversioned scores.
const identifier=value=>typeof value==='string'&&value.trim()?value:null;
const lineage=d=>d&&[
 identifier(d.source),
 identifier(d.methodologyVersion??d.modelVersion),
];
export const sameVerifiedLineage=(a,b)=>{
 if(!a||!b)return false;
 const first=lineage(a),second=lineage(b);
 if(!first||!second)return false;
 // A missing source on BOTH sides is fine if both have the SAME explicit method.
 // A source field present on only one side cannot be silently ignored.
 return (first[0]!==null||first[1]!==null)
  &&first[0]===second[0]
  &&first[1]===second[1];
};

export function attachStoredDomainScoreComparisons(body,history=[]){
 if(!validDate(body?.asOfDate)||!Array.isArray(body?.domains)||!Array.isArray(history))return body;
 for(const current of body.domains){
  if(current?.status!=='READY'||!validScore(current.score))continue;
  // Missing provenance is not permission to compare unrelated model vintages.
  if(!lineage(current)?.some(Boolean))continue;
  const rows=[];
  for(const snapshot of history){
   if(!validDate(snapshot?.date)||snapshot.date>=body.asOfDate||snapshot?.body?.status!=='SUCCESS')continue;
   const previous=snapshot.body.domains?.find(d=>d?.id===current.id);
   if(previous?.status!=='READY'||!validScore(previous.score)
      ||!sameVerifiedLineage(current,previous))continue;
   rows.push({label:snapshot.date,value:previous.score});
  }
  const computed=liquidityStoredScoreComparisons(
   [...rows,{label:body.asOfDate,value:current.score}],body.asOfDate,current.score
  );
  // An existing validated producer comparison remains authoritative.
  current.scoreComparisons=Object.fromEntries(
   Object.entries(computed).map(([key,value])=>[key,current.scoreComparisons?.[key]??value])
  );
 }
 return body;
}


const calendarDay=s=>validDate(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const finiteStoredAt=n=>Number.isSafeInteger(n)&&n>=946684800000;

// Use only scored E1-R5 observations from completed, dated local snapshots.
// This is evaluation-day history, not provider release or investable PIT history.
function verifiedEarningsFactors(domain){
 if(domain?.id!=='earnings'||domain.status!=='READY'||domain.methodologyVersion!=='E1-R5'||
  !validScore(domain.score)||!Array.isArray(domain.indicators)||
  domain.indicators.length!==E1_R5_SCORE_KEYS.length||
  (Array.isArray(domain.missingFactors)&&domain.missingFactors.length))return null;
 const rows=new Map();let evaluationDate=null,weighted=0;
 for(const id of E1_R5_SCORE_KEYS){
  const matched=domain.indicators.filter(row=>row?.id===id);
  if(matched.length!==1)return null;
  const row=matched[0];
  if(row.status!=='READY'||!validScore(row.score)||!calendarDay(row.asOfDate)||
   typeof row.source!=='string'||!row.source.trim()||
   (evaluationDate!==null&&row.asOfDate!==evaluationDate))return null;
  evaluationDate=row.asOfDate;
  rows.set(id,row);
  weighted+=E1_R5_WEIGHTS[id]*row.score;
 }
 return Math.abs(weighted-domain.score)<=1e-6?{date:evaluationDate,rows}:null;
}

// Existing indicator.trend is a score-only display field. Do not copy the
// aggregate 1Y trend, expose raw SEC/BEA/BLS/CFO inputs, or rescore a vintage.
// No actual previous stored calculation => no miniature line.
export function attachStoredEarningsFactorTrends(body,history=[]){
 if(!Array.isArray(body?.domains)||!calendarDay(body?.asOfDate)||!Array.isArray(history))return body;
 const current=body.domains.find(d=>d?.id==='earnings');
 const anchor=verifiedEarningsFactors(current);
 if(!anchor)return body;
 const cutoff=new Date(Date.parse(anchor.date+'T00:00:00Z')-366*86400000).toISOString().slice(0,10);
 const points=new Map(E1_R5_SCORE_KEYS.map(id=>[id,new Map()]));
 const conflicts=new Map(E1_R5_SCORE_KEYS.map(id=>[id,new Set()]));
 for(const snapshot of history){
  if(!calendarDay(snapshot?.date)||snapshot.date>=body.asOfDate||
   snapshot.body?.status!=='SUCCESS'||snapshot.body.asOfDate!==snapshot.date||
   !finiteStoredAt(snapshot.storedAt)||
   new Date(snapshot.storedAt).toISOString().slice(0,10)!==snapshot.date)continue;
  const previous=snapshot.body.domains?.find(d=>d?.id==='earnings');
  if(!sameVerifiedLineage(current,previous))continue;
  const prior=verifiedEarningsFactors(previous);
  if(!prior||prior.date<cutoff||prior.date>=anchor.date)continue;
  for(const id of E1_R5_SCORE_KEYS){
   const nowRow=anchor.rows.get(id),oldRow=prior.rows.get(id);
   if(nowRow.source!==oldRow.source)continue;
   const dates=points.get(id),invalid=conflicts.get(id);
   if(dates.has(prior.date)&&dates.get(prior.date)!==oldRow.score){
    invalid.add(prior.date);
    dates.delete(prior.date);
   }else if(!invalid.has(prior.date))dates.set(prior.date,oldRow.score);
  }
 }
 for(const id of E1_R5_SCORE_KEYS){
  const row=anchor.rows.get(id);
  if(Array.isArray(row.trend)&&row.trend.length)continue; // preserve valid producer-specific history
  const prior=[...points.get(id)].sort(([a],[b])=>a.localeCompare(b))
   .map(([label,value])=>({label,value}));
  if(prior.length)row.trend=[...prior,{label:anchor.date,value:row.score}];
 }
 return body;
}
