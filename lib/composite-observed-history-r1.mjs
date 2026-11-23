import {isValidatedPaidBreadthDomain} from '../worker/breadth-paid-contract.mjs';
// Verified composite score snapshots, not original provider observations.
// Stored on the PC in the existing market_public_snapshots_v1 table.
export const COMPOSITE_OBSERVED_VERSION='COMPOSITE_CALCULATED_SCORES_R1';
export const COMPOSITE_OBSERVED_PREFIX='composite-observed:';
export const COMPOSITE_OBSERVED_INTERVAL_MS=15*60000;
// A full 24h day has at most 288 scheduled five-minute starts; allow bounded
// replay/extra verified calculations without changing the approved PC schedule.
export const COMPOSITE_OBSERVED_MAX_POINTS_PER_DAY=512;
export const COMPOSITE_PAID_SOURCE_CONTRACT='CM_R1_PAID_BREADTH_RESTORED_R1';
export function isPaidCompositeObservedPoint(point){return point?.publicSourceContract===COMPOSITE_PAID_SOURCE_CONTRACT&&typeof point.breadthSourceVersion==='string'&&/^[a-f0-9]{64}$/.test(point.breadthSourceVersion);}
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const fingerprint=value=>{let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');};

export function compositeSampleFromVerified(body,now){
 if(!Number.isSafeInteger(now)||body?.status!=='SUCCESS'||body?.overall?.status!=='READY'||!validScore(body?.overall?.score)
   ||!Array.isArray(body?.domains)||body.domains.length!==12)throw Error('COMPOSITE_OBSERVATION_UNVERIFIED');
 const status=body.domains.map(d=>[d.id,d.status,validScore(d.score)?d.score:null,d.asOfDate??null,d.methodologyVersion??null]);
 return {calculatedAt:new Date(now).toISOString(),score:body.overall.score,
   asOfDate:typeof body.asOfDate==='string'?body.asOfDate:null,
   ...(isValidatedPaidBreadthDomain(body.domains.find(d=>d.id==='breadth'))?{publicSourceContract:COMPOSITE_PAID_SOURCE_CONTRACT,breadthSourceVersion:body.domains.find(d=>d.id==='breadth').paidSource.sourceVersion}:{}),
   // Store a reproducible source signature, but no raw input or private weights.
   signature:fingerprint(JSON.stringify([body.overall.score,body.asOfDate??null,status]))};
}
export function mergeCompositeObservedDay(previous,date,sample){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||sample?.calculatedAt?.slice(0,10)!==date||!validScore(sample?.score))throw Error('COMPOSITE_SAMPLE_INVALID');
 if(previous&&(previous.version!==COMPOSITE_OBSERVED_VERSION||previous.date!==date||!Array.isArray(previous.points)))
   throw Error('COMPOSITE_ARCHIVE_INVALID');
 const points=previous?.points??[];
 const prior=points.at(-1);
 const time=Date.parse(sample.calculatedAt);
 if(!Number.isFinite(time)||prior&&Date.parse(prior.calculatedAt)>time)throw Error('COMPOSITE_ARCHIVE_CLOCK_REGRESSION');
 // Repeated identical calculations are idempotent; different results at the
 // same instant must not silently replace or hide a verified observation.
 if(prior&&prior.calculatedAt===sample.calculatedAt){
  if(prior.score===sample.score&&prior.signature===sample.signature)return {changed:false,body:previous};
  throw Error('COMPOSITE_ARCHIVE_EQUAL_TIMESTAMP_CONFLICT');
 }
 // A fingerprint alone must not suppress a real score change (even on a hash collision).
 if(prior&&prior.score===sample.score&&prior.signature===sample.signature)
  return {changed:false,body:previous};
 // Preserve real score changes at their calculation times, including at 5 minutes.
 // Same-score source revisions retain the old 15-minute debounce contract.
 if(prior&&prior.score===sample.score&&time-Date.parse(prior.calculatedAt)<COMPOSITE_OBSERVED_INTERVAL_MS)
  return {changed:false,body:previous};
 const next=[...points,sample];
 // Never truncate earlier events or change the existing 1.8MB SQLite-row guard.
 if(next.length>COMPOSITE_OBSERVED_MAX_POINTS_PER_DAY)throw Error('COMPOSITE_DAILY_CAP_EXCEEDED');
 return {changed:true,body:{version:COMPOSITE_OBSERVED_VERSION,date,points:next}};
}
