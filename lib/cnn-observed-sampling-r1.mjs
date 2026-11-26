import {CNN_PERIOD_BUCKET_MINUTES} from './cnn-period-chart-r1.mjs';
import {cnnNyObservationDay} from './cnn-current-session-history-r4.mjs';

// Return only real stored observation points. For long periods, retain
// the first, last, minimum and maximum within buckets; raw day rows remain
// untouched in PC SQLite / public D1 for later detailed date-range queries.
export function sampleCnnObservedPoints(points,maxPoints=1200){
 if(!Array.isArray(points))throw Error('CNN_ARCHIVE_SAMPLE_INVALID');
 if(points.length<=maxPoints)return points;
 const buckets=Math.max(1,Math.floor((maxPoints-2)/2));
 const selected=new Map();
 selected.set(points[0].observedAt,points[0]);
 for(let i=0;i<buckets;i++){
  const start=1+Math.floor(i*(points.length-2)/buckets);
  const end=1+Math.floor((i+1)*(points.length-2)/buckets);
  if(end<=start)continue;
  let low=points[start],high=points[start];
  for(let j=start+1;j<end;j++){
   if(points[j].score<low.score)low=points[j];
   if(points[j].score>high.score)high=points[j];
  }
  selected.set(low.observedAt,low);
  selected.set(high.observedAt,high);
 }
 const last=points.at(-1);
 selected.set(last.observedAt,last);
 return [...selected.values()].sort((a,b)=>a.observedAt.localeCompare(b.observedAt));
}


/**
 * W06 public display contract: 1M uses the final real CNN source observation
 * of every populated 5-hour bucket; 3M/6M/1Y use the final one of every
 * populated NY observation day. Never choose extrema from index-based
 * sampling before calculating the last point of a time bucket.
 * The original SQLite/D1 rows and 1D/1W/custom-range output stay intact.
 * @param {Array<{observedAt:string,score:number}>} points validated, chronological original scores
 * @param {'1M'|'3M'|'6M'|'1Y'} period
 */
export function projectCnnObservedPeriodPoints(points,period){
 if(!Array.isArray(points))throw Error('CNN_PERIOD_OBSERVATIONS_INVALID');
 const minutes=CNN_PERIOD_BUCKET_MINUTES[period];
 if(!minutes||period==='1W')throw Error('CNN_PERIOD_OBSERVATIONS_INTERVAL_INVALID');
 const byBucket=new Map();
 for(const point of points){
  const ms=Date.parse(point?.observedAt??'');
  if(!Number.isFinite(ms)||typeof point.score!=='number'||
     !Number.isFinite(point.score)||point.score<0||point.score>100)
   throw Error('CNN_PERIOD_OBSERVATION_INVALID');
  const key=minutes>=1440?cnnNyObservationDay(point.observedAt):Math.floor(ms/(minutes*60000));
  if(key===null)throw Error('CNN_PERIOD_OBSERVATION_DAY_INVALID');
  const prev=byBucket.get(key);
  if(!prev||Date.parse(prev.observedAt)<=ms)byBucket.set(key,point);
 }
 return [...byBucket.values()].sort((a,b)=>a.observedAt.localeCompare(b.observedAt));
}
