// W06 display-only multi-period projection of already stored CNN source observations.
// A period is a calendar window, not a fixed number of source points.
// Never promote PC checkedAt, fill missing candles, or rewrite stored source scores.
import {cnnNyObservationDay} from './cnn-current-session-history-r4.mjs';

export const CNN_PERIOD_BUCKET_MINUTES=Object.freeze({
 '1W':30, '1M':300, '3M':1440, '6M':1440, '1Y':1440,
});
const DAY_MS=86400000;
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const validDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(x);
const validTime=x=>{
 if(!validDay(x))return NaN;
 const time=Date.parse(x);
 return Number.isFinite(time)?time:NaN;
};

/**
 * One real source observation per populated bucket, choosing the latest actual
 * observedAt; days without stored intraday observations retain genuine daily
 * history. No extra ticks, duplicates or synthetic values are generated.
 *
 * @param {{
 *  period:'1W'|'1M'|'3M'|'6M'|'1Y',
 *  days:number,
 *  observedPoints:Array<{observedAt:string,score:number}>,
 *  dailyPoints:Array<{date:string,time?:number,score:number}>,
 * }} input
 * @returns {Array<{date:string,time:number,score:number,kind:'observed'|'daily'}>}
 */
export function buildCnnPeriodChart({period,days,observedPoints=[],dailyPoints=[]}){
 const minutes=CNN_PERIOD_BUCKET_MINUTES[period];
 if(!minutes||!Number.isInteger(days)||days<=0)throw Error('CNN_PERIOD_CHART_INTERVAL_INVALID');
 const observedByTime=new Map();
 for(const point of observedPoints){
  const time=validTime(point?.observedAt);
  if(!Number.isFinite(time)||!validScore(point?.score))continue;
  // The later supplied authoritative source wins at an identical timestamp.
  observedByTime.set(time,{date:new Date(time).toISOString(),time,score:point.score,kind:'observed'});
 }
 const dailyByTime=new Map();
 for(const point of dailyPoints){
  const time=validTime(point?.date);
  if(!Number.isFinite(time)||!validScore(point?.score))continue;
  dailyByTime.set(time,{date:point.date,time,score:point.score,kind:'daily'});
 }
 const observed=[...observedByTime.values()].sort((a,b)=>a.time-b.time);
 const daily=[...dailyByTime.values()].sort((a,b)=>a.time-b.time);
 const latest=Math.max(observed.at(-1)?.time??-Infinity,daily.at(-1)?.time??-Infinity);
 if(!Number.isFinite(latest))return [];
 const start=latest-days*DAY_MS;
 const eligible=observed.filter(p=>p.time>=start&&p.time<=latest);
 const width=minutes*60000;
 const buckets=new Map();
 const sourceDays=new Set();
 for(const point of eligible){
  const day=cnnNyObservationDay(point.date);
  if(!day)continue;
  sourceDays.add(day);
  // Day-scale buckets use the actual NY observation date, not UTC midnight.
  const key=minutes>=1440?day:Math.floor(point.time/width);
  buckets.set(key,point);
 }
 const realBuckets=[...buckets.values()];
 const dailyFallback=daily.filter(point=>{
  // Date-only daily history is a calendar date; timestamped history uses NY day.
  // Do not suppress two calendar dates when a late-night NY observation crosses UTC midnight.
  const day=point.date.includes('T')?cnnNyObservationDay(point.date):point.date.slice(0,10);
  return point.time>=start&&point.time<=latest&&day!==null&&!sourceDays.has(day);
 });
 return [...dailyFallback,...realBuckets].sort((a,b)=>a.time-b.time);
}
