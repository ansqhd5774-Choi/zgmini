import test from 'node:test';
import assert from 'node:assert/strict';
import {REV7_VERSION,REV7_FACTORS,REV7_DIRECTIONS} from '../worker/korea-rev7-engine.mjs';
import {publicSnapshot,stageForDisplayScore} from '../worker/korea-funds.mjs';
import {koreaPublicationPlan} from '../scripts/pc-writer/korea-publication.mjs';

// R4 #37: read-only, synthetic completed-trading-date fixtures.
// This does not call KRX/BOK, alter D1, backfill history, or prove deployment.
const row=(date,score,method=REV7_VERSION)=>({
 date,methodology_version:method,
 composite_json:JSON.stringify({score,status:score===null?'WARMUP':'READY'}),
 factors_json:JSON.stringify(Object.fromEntries(REV7_FACTORS.map(id=>[id,{score}]))),
 history_mode:'RECONSTRUCTED_CURRENT_VINTAGE',point_in_time_verified:0,
 calculated_at:'2026-11-16T22:00:00.000Z',
});
const data=[row('20261112',45.7),row('20261113',50.2),row('20261116',53.4)];
const currentClock=()=>new Date('2026-11-17T00:20:00.000Z');
const output=(rows,progress={successfulTradingDates:1031,status:'COMPLETE'},clock=currentClock)=>
 publicSnapshot({},{
  loadRows:async()=>rows,loadProgress:async()=>progress,clock,
 });
const columns=['date','status','kospi_count','valid_high_count','valid_low_count',
 'valid_share_volume_count','rows_stored','krx_request_count','bok_request_count','fetched_at','methodology_version'];
const snapshotColumns=['date','methodology_version','factors_json','composite_json',
 'history_mode','point_in_time_verified','source_observed_at','calculated_at'];
const checkpoint=Object.fromEntries(columns.map(k=>[
 k,k==='date'?'20261116':k==='status'?'COMPLETE':k==='methodology_version'?REV7_VERSION:k==='fetched_at'?1794880000000:1,
]));
const snapshot=Object.fromEntries(snapshotColumns.map(k=>[
 k,k==='date'?'20261116':k==='methodology_version'?REV7_VERSION:
 k==='factors_json'?'{}':k==='composite_json'?'{"score":53.4}':
 k==='history_mode'?'RECONSTRUCTED_CURRENT_VINTAGE':
 k==='source_observed_at'?'20261116':k==='calculated_at'?'2026-11-16T22:00:00.000Z':0,
]));

test('R4 #37 Rev7 fixed seven factors, directions and equal weights are preserved',async()=>{
 assert.equal(REV7_VERSION,'kr-fg-cnn-r7-1.0.0');
 assert.equal(REV7_FACTORS.length,7);
 assert.equal(new Set(REV7_FACTORS).size,7);
 assert.equal(Object.keys(REV7_DIRECTIONS).length,7);
 const result=await output(data);
 assert.equal(result.composite.components.length,7);
 assert.ok(result.composite.components.every(p=>p.weight===1/7));
});

test('R4 #37 last verified completed trading date is the card and chart last valid score',async()=>{
 const result=await output(data);
 assert.equal(result.composite.status,'READY');
 assert.equal(result.composite.observationDate,'20261116');
 assert.equal(result.composite.score,53.4);
 assert.equal(result.composite.displayScore,53.4);
 assert.equal(result.composite.history.at(-1).date,'20261116');
 assert.equal(result.composite.history.at(-1).displayScore,53.4);
});

test('R4 #37 warmup/no-data next date must never become the current score',async()=>{
 const result=await output([...data,row('20261117',null)]);
 assert.equal(result.composite.observationDate,'20261116');
 assert.equal(result.composite.score,53.4);
 assert.equal(result.composite.history.at(-1).score,null);
});

test('R4 #37 incorrect methodology cannot contaminate newer dated score',async()=>{
 const result=await output([...data,row('20261117',62,'WRONG-VERSION')]);
 assert.equal(result.composite.observationDate,'20261116');
 assert.equal(result.composite.score,53.4);
 assert.equal(result.composite.history.length,3);
});

test('R4 #37 incomplete 1030-day backfill gate emits no fabricated public score',async()=>{
 const result=await output(data,{successfulTradingDates:1000,status:'RUNNING'});
 assert.equal(result.composite.status,'UNAVAILABLE');
 assert.equal(result.composite.score,null);
 assert.deepEqual(result.composite.history,[]);
});

test('R4 #37 missing actual days in stored history are never interpolated',async()=>{
 const result=await output(data);
 assert.deepEqual(result.composite.history.map(p=>p.date),['20261112','20261113','20261116']);
});

test('R4 #37 published zero is a valid real score, not missing history',async()=>{
 const result=await output([row('20261116',0)]);
 assert.equal(result.composite.score,0);
 assert.equal(result.composite.displayScore,0);
 assert.equal(stageForDisplayScore(0).stageCode,'EXTREME_FEAR');
});

test('R4 #37 stale observation is marked STALE without inventing a new trade date',async()=>{
 const result=await output(data,{successfulTradingDates:1031,status:'COMPLETE'},()=>new Date('2026-12-01T00:00:00Z'));
 assert.equal(result.composite.status,'STALE');
 assert.equal(result.composite.staleReason,'OBSERVATION_DELAY');
 assert.equal(result.composite.observationDate,'20261116');
});

test('R4 #37 reconstructed current vintage is not misreported as point-in-time verified',async()=>{
 const result=await output(data);
 assert.equal(result.composite.historyMode,'RECONSTRUCTED_CURRENT_VINTAGE');
 assert.equal(result.composite.pointInTimeVerified,false);
 assert.equal(result.composite.researchOnly,true);
});

test('R4 #37 only complete and matching KRX trading date yields bounded publication inserts',()=>{
 const sql=koreaPublicationPlan(snapshot,checkpoint);
 assert.equal(sql.length,2);
 assert.ok(sql.every(p=>/ON CONFLICT\(date\) DO NOTHING/.test(p.sql)));
 assert.ok(sql.every(p=>!p.sql.includes('raw_provider_data')));
});

test('R4 #37 uncompleted, conflicting date or methodology rejects before any D1 insertion',()=>{
 assert.throws(()=>koreaPublicationPlan(snapshot,{...checkpoint,status:'NO_TRADING_OBSERVATION'}),/KOREA_PUBLICATION_CHECKPOINT_REQUIRED/);
 assert.throws(()=>koreaPublicationPlan({...snapshot,date:'20261117'},checkpoint),/KOREA_PUBLICATION_CHECKPOINT_REQUIRED/);
 assert.throws(()=>koreaPublicationPlan(snapshot,{...checkpoint,methodology_version:'INVALID'}),/KOREA_PUBLICATION_CHECKPOINT_REQUIRED/);
});

test('R4 #37 missing source observed date blocks publishing, never guesses it',()=>{
 assert.throws(()=>koreaPublicationPlan({...snapshot,source_observed_at:undefined},checkpoint),/KOREA_PUBLICATION_COLUMN_MISSING/);
});
