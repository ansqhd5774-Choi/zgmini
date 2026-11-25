// D05: inspect already-stored, final MARKET score snapshots only.
// This module never calls providers, recalculates a score or writes DB/D1.
import {createHash} from 'node:crypto';
import {captureFinalScoreOutputs,mergeFinalScoreEvents,
 finalScoreDailySnapshots} from './d05-final-score-output-events-r1.mjs';

const DAY=/^20\d{2}-\d\d-\d\d$/;
const DAY_MS=86400000;
const MAX_DAYS=370, MAX_ROWS=373;
const validDay=day=>typeof day==='string'&&DAY.test(day)&&
 Number.isFinite(Date.parse(day+'T00:00:00Z'))&&
 new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;
const validAt=now=>Number.isSafeInteger(now)&&now>0&&Number.isFinite(new Date(now).getTime());
const iso=ms=>new Date(ms).toISOString();
const utcDay=ms=>iso(ms).slice(0,10);
const fail=code=>{throw Error(code);};
function validateDailyRow(row,{now}){
 if(!validDay(row?.snapshot_key))fail('D05_STORED_DAY_KEY_INVALID');
 const ms=row?.stored_at;
 if(!validAt(ms)||ms>now||utcDay(ms)!==row.snapshot_key)
  fail('D05_STORED_CALCULATION_CLOCK_INVALID');
 let body;
 try{body=JSON.parse(row.body);}catch{fail('D05_STORED_FINAL_OUTPUT_INVALID');}
 if(body?.status!=='SUCCESS'||body?.overall?.status!=='READY'||!Array.isArray(body?.domains))
  fail('D05_STORED_FINAL_OUTPUT_INVALID');
 return captureFinalScoreOutputs({group:'market',body,calculatedAt:iso(ms)});
}
function outputSummary(events,calculatedAt){
 const keys=events.map(e=>e.eventId).sort();
 return Object.freeze({status:'LOCAL_FINAL_SCORE_OUTPUT_VERIFIED',
  calculatedAt,scoreCount:events.length,
  outputEventsSha256:createHash('sha256').update(JSON.stringify(keys)).digest('hex')});
}
// Exact local readback after the already-authorized marketOperationalStore.writeScore().
// Both current and UTC day rows must be byte-identical at the exact calculation
// clock. No raw stored body or individual score is copied to the Writer report.
export async function readVerifiedMarketFinalOutputs(db,{calculatedAtMs,now=Date.now()}={}){
 if(!validAt(calculatedAtMs)||!validAt(now)||calculatedAtMs>now)
  fail('D05_MARKET_CALCULATION_CLOCK_INVALID');
 if(typeof db?.prepare!=='function')fail('D05_MARKET_STORAGE_UNAVAILABLE');
 const date=utcDay(calculatedAtMs);
 const get=key=>db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(key).first();
 const current=await get('current');
 const daily=await get(date);
 if(!current||!daily||current.stored_at!==calculatedAtMs||
  daily.stored_at!==calculatedAtMs||typeof current.body!=='string'||
  current.body!==daily.body)fail('D05_MARKET_FINAL_CHECKPOINT_MISMATCH');
 const events=validateDailyRow({...daily,snapshot_key:date},{now});
 if(!events.length)fail('D05_MARKET_FINAL_OUTPUT_EMPTY');
 return outputSummary(events,iso(calculatedAtMs));
}
// Reuse existing final-output UTC day rows. No interpolation, no vintage trend
// replay and no fabricated dates. The KST requested range includes its prior
// UTC day because a KST day begins at UTC 15:00 of the previous calendar day.
export async function readStoredMarketFinalScoreDays(db,{fromDay,toDay,now=Date.now()}={}){
 if(!validDay(fromDay)||!validDay(toDay)||fromDay>toDay||
   (Date.parse(toDay+'T00:00:00Z')-Date.parse(fromDay+'T00:00:00Z'))/DAY_MS>MAX_DAYS)
  fail('D05_MARKET_RANGE_INVALID');
 if(!validAt(now)||typeof db?.prepare!=='function')fail('D05_MARKET_STORAGE_UNAVAILABLE');
 const lower=utcDay(Date.parse(fromDay+'T00:00:00Z')-DAY_MS);
 const response=await db.prepare(
  'SELECT snapshot_key,body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key BETWEEN ? AND ? ORDER BY snapshot_key ASC LIMIT 373'
 ).bind(lower,toDay).all();
 const rows=response?.results;
 if(!Array.isArray(rows)||rows.length>=MAX_ROWS)fail('D05_MARKET_ROWSET_INCOMPLETE');
 let all=[];
 for(const row of rows){
  const events=validateDailyRow(row,{now});
  all=mergeFinalScoreEvents(all,events);
 }
 const daily=finalScoreDailySnapshots(all,{fromDay,toDay});
 return Object.freeze({status:'STORED_FINAL_MARKET_DAILY_READONLY',
  storedUtcDays:rows.length,actualOutputEvents:all.length,
  dailyFinalScorePoints:daily.length,points:daily});
}
