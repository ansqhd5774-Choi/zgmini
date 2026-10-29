// Pure R10 published raw against historical reconstruction diff. No I/O.
const near=(a,b)=>typeof a==='number'&&Number.isFinite(a)
 &&typeof b==='number'&&Number.isFinite(b)&&Math.abs(a-b)<1e-7;
const safeValue=value=>typeof value==='string'?value.slice(0,130):value;

// Strictly diagnostic: reproduces every existing R1 equality gate; no gate weakened.
export function assetR10HistoryLineageDiff(raw,payload){
 const mismatch=[];
 const check=(field,stored,approved,numeric=false)=>{
  if(!(numeric?near(stored,approved):stored===approved))
   mismatch.push({field,stored:safeValue(stored),approved:safeValue(approved)});
 };
 check('sourceVersion',raw.sourceVersion,payload.sourceVersion);
 check('sourceStoredAt',raw.sourceStoredAt,payload.sourceStoredAt);
 check('asOfDate',raw.asOfDate,payload.asOfDate);
 check('scoreObservationQuarter',raw.scoreObservationQuarter,payload.scoreObservationQuarter);
 check('diagnosticScore/approvedScore',raw.diagnosticScore,payload.approvedScore,true);
 if(!Array.isArray(raw.factors)||!Array.isArray(payload.factors)
  ||raw.factors.length!==6||payload.factors.length!==6){
  mismatch.push({field:'factorCount',stored:raw.factors?.length??null,
   approved:payload.factors?.length??null});
  return mismatch;
 }
 for(let i=0;i<6;i++){
  const f=raw.factors[i],h=payload.factors[i],last=h.points[4],prev=h.points[3];
  const prefix=`factors[${i}:${h.id}]`;
  check(prefix+'.id',f.id,h.id);
  check(prefix+'.unit',f.unit,h.unit);
  check(prefix+'.source',f.source,h.source);
  check(prefix+'.value',f.value,last.value,true);
  check(prefix+'.previousValue',f.previousValue,prev.value,true);
  check(prefix+'.observationDate',f.observationDate,last.observationDate);
  check(prefix+'.previousObservationDate',f.previousObservationDate,prev.observationDate);
 }
 return mismatch;
}
