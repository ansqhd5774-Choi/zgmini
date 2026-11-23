import test from 'node:test';
import assert from 'node:assert/strict';
import {readVerifiedSectorFinalOutputs,readStoredSectorFinalScoreDays} from
 '../lib/score-history/d05-final-sector-local-readback-r1.mjs';
import {SECTOR_FEAR_GREED_R3_PUBLIC_VERSION,SECTOR_FEAR_GREED_R3_SECTORS} from
 '../lib/market-score/sector-fear-greed-r3-public.mjs';
import {SECTOR_FEAR_GREED_R3_FEED_KEY} from '../worker/sector-fear-greed-r3-public.mjs';

const CLOCK=Date.parse('2026-11-23T16:02:00.000Z'),DAY=86400000;
const date=ms=>new Date(ms).toISOString().slice(0,10);
function fixture(clock=CLOCK,shift=0){
 const first=Date.parse('2026-01-01T00:00:00.000Z');
 const history=Array.from({length:252},(_,i)=>{
  const row={date:date(first+i*DAY)};
  for(const [j,sector] of SECTOR_FEAR_GREED_R3_SECTORS.entries())
   row[sector.id]=Number((23+j+i/1000+shift).toFixed(4));
  return row;
 });
 const latest=history.at(-1);
 return {version:SECTOR_FEAR_GREED_R3_PUBLIC_VERSION,status:'READY',
  updatedAt:new Date(clock).toISOString(),observationDate:latest.date,
  methodologyVersion:'R3',sourceVersion:'STORED_FINAL_ONLY',
  sectors:SECTOR_FEAR_GREED_R3_SECTORS.map(s=>({id:s.id,name:s.name,score:latest[s.id]})),
  history,privateInputs:{shouldNeverLeak:true}};
}
const row=(clock=CLOCK,b=fixture(clock))=>({
 snapshot_key:date(clock),body:JSON.stringify(b),stored_at:clock});
function mockDb(rows,{current=rows.at(-1)}={}){
 const dbRows=new Map(rows.map(x=>[x.snapshot_key,x]));
 if(current)dbRows.set('current',current);
 const queries=[];
 return {dbRows,queries,db:{prepare(sql){
  if(sql!=="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key=?"&&
   sql!=="SELECT snapshot_key,body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key BETWEEN ? AND ? ORDER BY snapshot_key ASC LIMIT 373")
   throw Error('UNEXPECTED_SQL_OR_WRITE');
  queries.push(sql);
  return {bind(...args){assert.equal(args[0],SECTOR_FEAR_GREED_R3_FEED_KEY);return {
   async first(){return dbRows.get(args[1])??null;},
   async all(){return {results:[...dbRows.entries()].filter(([key])=>
    key!=='current'&&key>=args[1]&&key<=args[2]).map(([key,value])=>
    ({...value,snapshot_key:key})).sort((a,b)=>a.snapshot_key.localeCompare(b.snapshot_key))};}
  }};}}}};
}
const exact=(db,clock=CLOCK,now=CLOCK+2000)=>readVerifiedSectorFinalOutputs(db,{calculatedAtMs:clock,now});
const range=(db,fromDay='2026-11-24',toDay='2026-11-24',now=CLOCK+2000)=>
 readStoredSectorFinalScoreDays(db,{fromDay,toDay,now});
test('exact existing sector current and UTC-day storage proves 11 final scores',async()=>{
 const s=mockDb([row()]),result=await exact(s.db);
 assert.equal(result.status,'LOCAL_FINAL_SECTOR_OUTPUT_VERIFIED');
 assert.equal(result.scoreCount,11);assert.equal(result.calculatedAt,new Date(CLOCK).toISOString());
 assert.match(result.outputEventsSha256,/^[a-f0-9]{64}$/);
 assert.equal(s.queries.length,2);
 assert.ok(!('points'in result)&&!('privateInputs'in result));
});
test('only SELECT calls occur; no new raw input, DB write or provider request',async()=>{
 const s=mockDb([row()]);await exact(s.db);await range(s.db);
 assert.equal(s.queries.length,3);
 assert.ok(s.queries.every(q=>q.startsWith('SELECT ')));
});
test('missing stored current or UTC day never counts as completed history',async()=>{
 await assert.rejects(exact(mockDb([row()],{current:null}).db),/CHECKPOINT_MISMATCH/);
 const s=mockDb([]);s.dbRows.set('current',row());
 await assert.rejects(exact(s.db),/CHECKPOINT_MISMATCH/);
});
test('current and day must share same body and calculation clock',async()=>{
 const s=mockDb([row()]);
 s.dbRows.set('current',{...row(),stored_at:CLOCK+1});
 await assert.rejects(exact(s.db),/CHECKPOINT_MISMATCH/);
 s.dbRows.set('current',row(CLOCK,fixture(CLOCK,1)));
 await assert.rejects(exact(s.db),/CHECKPOINT_MISMATCH/);
});
test('source updatedAt must match the saved actual output event clock',async()=>{
 const b=fixture(CLOCK-1000),s=mockDb([row(CLOCK,b)]);
 await assert.rejects(exact(s.db),/OUTPUT_INVALID/);
});
test('a published final sector score cannot disagree with its saved last point',async()=>{
 const b=fixture();b.sectors[0].score+=1;
 await assert.rejects(exact(mockDb([row(CLOCK,b)]).db),/FINAL_SCORE_MISMATCH/);
});
test('incomplete or malformed output is never recorded as 11 READY scores',async()=>{
 const b=fixture();b.sectors.pop();
 await assert.rejects(exact(mockDb([row(CLOCK,b)]).db),/OUTPUT_INVALID/);
 const s=mockDb([{...row(),body:'invalid-json'}]);
 await assert.rejects(exact(s.db),/OUTPUT_INVALID/);
});
test('one KST day includes prior UTC day with exact existing score rows only',async()=>{
 const s=mockDb([row()]);
 const r=await range(s.db);
 assert.equal(r.storedUtcDays,1);
 assert.equal(r.storedFinalScoreEvents,11);
 assert.equal(r.dailyFinalScorePoints,11);
 assert.ok(r.points.every(x=>x.calculatedDateKst==='2026-11-24'));
});
test('full 252-day model rolling history is not falsely treated as 252 calculated days',async()=>{
 const r=await range(mockDb([row()]).db);
 assert.equal(r.points.length,11);
 assert.ok(r.points.every(x=>!('history'in x)&&!('privateInputs'in x)&&!('price'in x)));
});
test('two saved UTC-day outputs sharing KST date keep latest actual output',async()=>{
 const later=CLOCK+8*3600000;
 const b=fixture(later,1);
 const result=await range(mockDb([row(),row(later,b)]).db);
 assert.equal(result.storedUtcDays,2);
 assert.equal(result.storedFinalScoreEvents,22);
 assert.equal(result.dailyFinalScorePoints,11);
 assert.ok(result.points.every(x=>x.calculatedAt===new Date(later).toISOString()));
});
test('unobserved weekend and holiday dates are not filled',async()=>{
 const r=await range(mockDb([row()]).db,'2026-11-21','2026-11-24');
 assert.equal(new Set(r.points.map(x=>x.calculatedDateKst)).size,1);
});
test('saved UTC day and stored timestamp mismatch is not accepted',async()=>{
 const bad={...row(),snapshot_key:'2026-11-22'};
 await assert.rejects(range(mockDb([bad]).db,'2026-11-22','2026-11-24'),/OUTPUT_CLOCK_UNPROVEN/);
});
test('future output timestamp cannot be claimed as a historical calculation',async()=>{
 await assert.rejects(range(mockDb([row()]).db,'2026-11-24','2026-11-24',CLOCK-1),
 /OUTPUT_CLOCK_UNPROVEN/);
});
test('invalid and oversized date ranges stop before any database query',async()=>{
 const s=mockDb([row()]);
 await assert.rejects(range(s.db,'2026-02-30','2026-11-24'),/RANGE_INVALID/);
 await assert.rejects(range(s.db,'2025-01-01','2026-11-24'),/RANGE_INVALID/);
 assert.equal(s.queries.length,0);
});
test('empty stored output stays empty, never generates synthetic 1Y points',async()=>{
 const r=await range(mockDb([]).db);
 assert.deepEqual(r.points,[]);
 assert.equal(r.dailyFinalScorePoints,0);
});
test('valid score zero is preserved and is never converted into missing',async()=>{
 const b=fixture();b.sectors[0].score=0;b.history.at(-1).technology=0;
 const r=await range(mockDb([row(CLOCK,b)]).db);
 assert.equal(r.points.find(x=>x.scoreId==='sector:technology')?.score,0);
});
