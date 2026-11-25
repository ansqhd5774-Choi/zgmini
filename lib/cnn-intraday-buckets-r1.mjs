// W06 R1: display-only aggregation of genuine CNN source observations.
// No network, synthetic scores, OHLC, or mutation of the original series.
import {cnnNyObservationDay} from './cnn-current-session-history-r4.mjs';

export const CNN_INTRADAY_MINUTES=Object.freeze([1,5,10,30]);
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const iso=x=>new Date(x).toISOString();

/** The exact same one-decimal rule as the CNN score card. */
export function cnnDisplayScore(score){
 return validScore(score)?score.toFixed(1):null;
}

/**
 * Keep every populated bucket, using its last actual source observation.
 * UTC epoch boundaries for 1/5/10/30 minutes coincide with NY wall-clock
 * minute boundaries (NY UTC offsets are whole hours); repeated DST hours
 * therefore retain distinct absolute timestamps. Session membership is NY.
 * @param {Array<{observedAt:string,score:number}>} observations
 * @param {{currentObservedAt:string,minutes?:number,now?:number}} options
 */
export function aggregateCnnIntraday(observations,{currentObservedAt,minutes=1,now=Date.now()}){
 if(!CNN_INTRADAY_MINUTES.includes(minutes))throw Error('CNN_INTRADAY_INTERVAL_INVALID');
 if(!Number.isFinite(now))throw Error('CNN_INTRADAY_CLOCK_INVALID');
 const session=cnnNyObservationDay(currentObservedAt);
 if(!session)return {session:null,minutes,buckets:[],displayPoints:[]};
 const width=minutes*60000;
 const byTime=new Map();
 for(const point of observations){
  if(cnnNyObservationDay(point?.observedAt)!==session||!validScore(point?.score))continue;
  const time=Date.parse(point.observedAt);
  if(!Number.isFinite(time)||time>now)continue;
  // Same instant has one representative; caller supplies reconciled archive
  // authority in order. No older observation is discarded merely for age.
  byTime.set(time,{time,observedAt:iso(time),score:point.score});
 }
 const byBucket=new Map();
 for(const point of [...byTime.values()].sort((a,b)=>a.time-b.time)){
  const start=Math.floor(point.time/width)*width;
  byBucket.set(start,{start,end:start+width,observedAt:point.observedAt,score:point.score,
   displayScore:cnnDisplayScore(point.score),complete:now>=start+width});
 }
 const buckets=[...byBucket.values()];
 // Collapse equal display values only inside contiguous observed runs.
 // A missing bucket is a display-only null break, not an invented observation.
 // Latest real representative of an equal-value run retains its true time.
 const displayPoints=[];
 let last=null;
 for(const bucket of buckets){
  if(last&&bucket.start>last.end){
   displayPoints.push({date:iso(last.end),time:last.end,score:null,kind:'gap'});
  }
  const point={date:bucket.observedAt,time:Date.parse(bucket.observedAt),
   score:Number(bucket.displayScore),kind:'observed',bucketStart:iso(bucket.start),
   bucketEnd:iso(bucket.end),observedAt:bucket.observedAt,complete:bucket.complete};
  if(last&&bucket.start===last.end&&bucket.displayScore===last.displayScore){
   displayPoints[displayPoints.length-1]=point;
  }else displayPoints.push(point);
  last=bucket;
 }
 return {session,minutes,buckets,displayPoints};
}
