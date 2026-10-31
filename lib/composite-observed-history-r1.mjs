// Verified composite score snapshots, not original provider observations.
// Stored on the PC in the existing market_public_snapshots_v1 table.
export const COMPOSITE_OBSERVED_VERSION='COMPOSITE_CALCULATED_SCORES_R1';
export const COMPOSITE_OBSERVED_PREFIX='composite-observed:';
export const COMPOSITE_OBSERVED_INTERVAL_MS=15*60000;
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const fingerprint=value=>{let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');};

export function compositeSampleFromVerified(body,now){
 if(!Number.isSafeInteger(now)||body?.status!=='SUCCESS'||body?.overall?.status!=='READY'||!validScore(body?.overall?.score)
   ||!Array.isArray(body?.domains)||body.domains.length!==12)throw Error('COMPOSITE_OBSERVATION_UNVERIFIED');
 const status=body.domains.map(d=>[d.id,d.status,validScore(d.score)?d.score:null,d.asOfDate??null,d.methodologyVersion??null]);
 return {calculatedAt:new Date(now).toISOString(),score:body.overall.score,
   asOfDate:typeof body.asOfDate==='string'?body.asOfDate:null,
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
 if(prior&&(prior.calculatedAt===sample.calculatedAt||time-Date.parse(prior.calculatedAt)<COMPOSITE_OBSERVED_INTERVAL_MS))
   return {changed:false,body:previous};
 const next=[...points,sample];
 if(next.length>100)throw Error('COMPOSITE_DAILY_CAP_EXCEEDED');
 return {changed:true,body:{version:COMPOSITE_OBSERVED_VERSION,date,points:next}};
}
