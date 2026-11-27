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
 * @param {{currentObservedAt:string,minutes?:number,now?:number,windowMinutes?:number|null}} options
 */
export function aggregateCnnIntraday(observations,{currentObservedAt,minutes=1,now=Date.now(),windowMinutes=null}){
 if(!CNN_INTRADAY_MINUTES.includes(minutes))throw Error('CNN_INTRADAY_INTERVAL_INVALID');
 if(!Number.isFinite(now))throw Error('CNN_INTRADAY_CLOCK_INVALID');
 if(windowMinutes!==null&&(!Number.isInteger(windowMinutes)||windowMinutes<=0))throw Error('CNN_INTRADAY_WINDOW_INVALID');
 const session=cnnNyObservationDay(currentObservedAt);
 if(!session)return {session:null,minutes,buckets:[],displayPoints:[],linePoints:[]};
 const width=minutes*60000;
 const byTime=new Map();
 for(const point of observations){
  if(!validScore(point?.score))continue;
  const time=Date.parse(point.observedAt);
  if(!Number.isFinite(time)||time>now)continue;
  // The 1D chart is a true rolling 24-hour view, not just the latest NY date.
  // Other callers retain original New York session semantics.
  if(windowMinutes===null?cnnNyObservationDay(point.observedAt)!==session
    :time<Date.parse(currentObservedAt)-windowMinutes*60000||time>Date.parse(currentObservedAt))continue;
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
 // Preserve the first change event. A real final anchor of a flat run
 // is kept separately for line geometry, never counted as a new change.
 const displayPoints=[],linePoints=[];
 let last=null,lastLine=null;
 const finishRun=()=>{
  if(lastLine&&linePoints.at(-1)?.date!==lastLine.date)linePoints.push(lastLine);
 };
 for(const bucket of buckets){
  if(last&&bucket.start>last.end){
   finishRun();
   const gap={date:iso(last.end),time:last.end,score:null,kind:'gap'};
   displayPoints.push(gap);
   linePoints.push(gap);
   lastLine=null;
  }
  const point={date:bucket.observedAt,time:Date.parse(bucket.observedAt),
   score:Number(bucket.displayScore),kind:'observed',bucketStart:iso(bucket.start),
   bucketEnd:iso(bucket.end),observedAt:bucket.observedAt,complete:bucket.complete};
  if(last&&bucket.start===last.end&&bucket.displayScore===last.displayScore){
   lastLine=point;
  }else{
   finishRun();
   displayPoints.push(point);
   linePoints.push(point);
   lastLine=point;
  }
  last=bucket;
 }
 finishRun();
 // A line joins only the endpoints of genuinely observed source buckets.
 // Missing minutes add neither scores nor dots; displayPoints/linePoints keep
 // their original explicit-gap contract for other consumers.
 const connectedLinePoints=buckets.map(bucket=>({date:bucket.observedAt,
  time:Date.parse(bucket.observedAt),score:Number(bucket.displayScore),
  kind:'observed',observedAt:bucket.observedAt}));
 return {session,minutes,buckets,displayPoints,linePoints,connectedLinePoints};
}
