// Display-only comparisons built from actual previously published score snapshots.
// Never reinterpret raw indicator trends or mix different scoring methodologies.
import {liquidityStoredScoreComparisons} from '../../worker/projection-builders/liquidity-stored-history.mjs';

const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const validScore=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const lineage=d=>d&&[d.source??null,d.methodologyVersion??d.modelVersion??null];

export function attachStoredDomainScoreComparisons(body,history=[]){
 if(!validDate(body?.asOfDate)||!Array.isArray(body?.domains)||!Array.isArray(history))return body;
 for(const current of body.domains){
  if(current?.status!=='READY'||!validScore(current.score))continue;
  const currentLineage=lineage(current);
  if(!currentLineage?.[0])continue;
  const rows=[];
  for(const snapshot of history){
   if(!validDate(snapshot?.date)||snapshot.date>=body.asOfDate||snapshot?.body?.status!=='SUCCESS')continue;
   const previous=snapshot.body.domains?.find(d=>d?.id===current.id);
   const previousLineage=lineage(previous);
   if(previous?.status!=='READY'||!validScore(previous.score)
      ||previousLineage?.[0]!==currentLineage[0]||previousLineage?.[1]!==currentLineage[1])continue;
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
