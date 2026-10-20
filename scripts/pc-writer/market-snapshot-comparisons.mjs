// Display-only comparisons built from actual previously published score snapshots.
// Never reinterpret raw indicator trends or mix different scoring methodologies.
import {liquidityStoredScoreComparisons} from '../../worker/projection-builders/liquidity-stored-history.mjs';

const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const validScore=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
// Published domains often omit `source`; the explicit methodology version
// is then the only published lineage identifier. Never join unversioned scores.
const identifier=value=>typeof value==='string'&&value.trim()?value:null;
const lineage=d=>d&&[
 identifier(d.source),
 identifier(d.methodologyVersion??d.modelVersion),
];
const sameVerifiedLineage=(a,b)=>{
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
