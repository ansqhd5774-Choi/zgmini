// D05: read only the existing finalized sector score OUTPUT, not its five inputs.
// Existing public_feed_snapshots_v1 output rows are the sole data source.
import {createHash} from 'node:crypto';
import {captureFinalScoreOutputs,mergeFinalScoreEvents,finalScoreDailySnapshots} from
 './d05-final-score-output-events-r1.mjs';
import {
 SECTOR_FEAR_GREED_R3_SECTORS,SECTOR_FEAR_GREED_R3_REQUIRED_HISTORY
} from '../market-score/sector-fear-greed-r3-public.mjs';
import {
 SECTOR_FEAR_GREED_R3_FEED_KEY,validateSectorFearGreedR3Payload
} from '../../worker/sector-fear-greed-r3-public.mjs';

const DAY=/^20\d{2}-\d{2}-\d{2}$/;
const DAY_MS=86400000,MAX_SPAN=370,ROW_LIMIT=373;
const validDay=x=>typeof x==='string'&&DAY.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&
 new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const validAt=x=>Number.isSafeInteger(x)&&x>0&&Number.isFinite(new Date(x).getTime());
const iso=x=>new Date(x).toISOString();
const utcDay=x=>iso(x).slice(0,10);
function fail(code){throw Error(code);}
function sectorEvents(row,{now}){
 if(!validDay(row?.snapshot_key))fail('D05_SECTOR_DAY_KEY_INVALID');
 const ms=Number(row?.stored_at);
 if(!validAt(ms)||ms>now||utcDay(ms)!==row.snapshot_key)
  fail('D05_SECTOR_OUTPUT_CLOCK_UNPROVEN');
 let body;
 try{body=JSON.parse(row.body);}catch{fail('D05_SECTOR_OUTPUT_INVALID');}
 if(!validateSectorFearGreedR3Payload(body)||
  body.updatedAt!==iso(ms)||body.history.at(-1)?.date!==body.observationDate||
  body.history.length!==SECTOR_FEAR_GREED_R3_REQUIRED_HISTORY)
  fail('D05_SECTOR_OUTPUT_INVALID');
 const last=body.history.at(-1);
 if(body.sectors.some(item=>last[item.id]!==item.score))
  fail('D05_SECTOR_FINAL_SCORE_MISMATCH');
 const events=captureFinalScoreOutputs({group:'sector',body,calculatedAt:iso(ms)});
 if(events.length!==SECTOR_FEAR_GREED_R3_SECTORS.length)
  fail('D05_SECTOR_OUTPUT_COUNT_INVALID');
 return events;
}
function getRow(db,key){
 return db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key=?")
  .bind(SECTOR_FEAR_GREED_R3_FEED_KEY,key).first();
}
// Must follow the existing successful publicFeedStore.writeOutput() and its
// local readback. No provider calls, new DB keys, writes or extra Task.
export async function readVerifiedSectorFinalOutputs(db,{calculatedAtMs,now=Date.now()}={}){
 if(!validAt(calculatedAtMs)||!validAt(now)||calculatedAtMs>now)
  fail('D05_SECTOR_CALCULATION_CLOCK_INVALID');
 if(typeof db?.prepare!=='function')fail('D05_SECTOR_STORAGE_UNAVAILABLE');
 const day=utcDay(calculatedAtMs),current=await getRow(db,'current'),daily=await getRow(db,day);
 if(!current||!daily||Number(current.stored_at)!==calculatedAtMs||
  Number(daily.stored_at)!==calculatedAtMs||current.body!==daily.body)
  fail('D05_SECTOR_OUTPUT_CHECKPOINT_MISMATCH');
 const events=sectorEvents({...daily,snapshot_key:day},{now});
 const hash=createHash('sha256').update(JSON.stringify(events.map(e=>e.eventId).sort())).digest('hex');
 return Object.freeze({status:'LOCAL_FINAL_SECTOR_OUTPUT_VERIFIED',calculatedAt:iso(calculatedAtMs),
  scoreCount:events.length,outputEventsSha256:hash});
}
// Reads actual UTC-day output rows only; groups by KST displayed date. R3's
// 252-point rolling model history is NOT imported as 252 real calculation days.
// A later output may have replaced a prior same-day row in this existing store;
// that overwritten point is never reconstructed or claimed as retained.
export async function readStoredSectorFinalScoreDays(db,{fromDay,toDay,now=Date.now()}={}){
 if(!validDay(fromDay)||!validDay(toDay)||fromDay>toDay||
  (Date.parse(toDay+'T00:00:00Z')-Date.parse(fromDay+'T00:00:00Z'))/DAY_MS>MAX_SPAN)
  fail('D05_SECTOR_RANGE_INVALID');
 if(!validAt(now)||typeof db?.prepare!=='function')fail('D05_SECTOR_STORAGE_UNAVAILABLE');
 const lower=utcDay(Date.parse(fromDay+'T00:00:00Z')-DAY_MS);
 const response=await db.prepare(
  "SELECT snapshot_key,body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key BETWEEN ? AND ? ORDER BY snapshot_key ASC LIMIT 373"
 ).bind(SECTOR_FEAR_GREED_R3_FEED_KEY,lower,toDay).all();
 const rows=response?.results;
 if(!Array.isArray(rows)||rows.length>=ROW_LIMIT)
  fail('D05_SECTOR_ROWSET_INCOMPLETE');
 let all=[];
 for(const row of rows)all=mergeFinalScoreEvents(all,sectorEvents(row,{now}));
 const points=finalScoreDailySnapshots(all,{fromDay,toDay});
 return Object.freeze({status:'STORED_FINAL_SECTOR_DAILY_READONLY',
  storedUtcDays:rows.length,storedFinalScoreEvents:all.length,
  dailyFinalScorePoints:points.length,points});
}
