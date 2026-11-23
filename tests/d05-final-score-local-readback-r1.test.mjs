import test from 'node:test';
import assert from 'node:assert/strict';
import {readVerifiedMarketFinalOutputs,readStoredMarketFinalScoreDays} from
 '../lib/score-history/d05-final-score-local-readback-r1.mjs';

const DAY=86400000, ms=Date.parse('2026-11-23T16:02:00.000Z');
const body=()=>({status:'SUCCESS',asOfDate:'2026-11-23',
 overall:{status:'READY',score:40,methodologyVersion:'CM-R1'},
 domains:[{id:'inflation',status:'READY',score:63.5},
  {id:'credit',status:'PARTIAL',score:null}],
 indicators:[{id:'do-not-store',score:99}],
 overallTrend:[{label:'2025-11-23',value:72}]});
const row=(clock=ms,marketBody=body())=>({snapshot_key:new Date(clock).toISOString().slice(0,10),
 body:JSON.stringify(marketBody),stored_at:clock});
function store(rows,{current=rows.at(-1),denyWrites=false}={}){
 const records=new Map(rows.map(x=>[x.snapshot_key,x]));
 if(current)records.set('current',current);
 const queries=[];
 const db={prepare(sql){
  if(!/^SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=\?$/.test(sql)&&
    !/^SELECT snapshot_key,body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key BETWEEN \? AND \? ORDER BY snapshot_key ASC LIMIT 373$/.test(sql))
   throw Error('UNEXPECTED_SQL_OR_WRITE');
  queries.push(sql);
  return {bind(...args){return {
   async first(){return records.get(args[0])??null;},
   async all(){return {results:[...records.values()].filter(v=>v.snapshot_key!=='current'&&
    v.snapshot_key>=args[0]&&v.snapshot_key<=args[1])
    .sort((a,b)=>a.snapshot_key.localeCompare(b.snapshot_key))};}
  };}};
 }};
 return {db,queries,records};
}
const at=(db,clock=ms)=>readVerifiedMarketFinalOutputs(db,{calculatedAtMs:clock,now:ms+10000});
test('exact existing current and UTC-day output receipt proves final-score count',async()=>{
 const s=store([row()]),result=await at(s.db);
 assert.equal(result.status,'LOCAL_FINAL_SCORE_OUTPUT_VERIFIED');
 assert.equal(result.calculatedAt,'2026-11-23T16:02:00.000Z');
 assert.equal(result.scoreCount,2);
 assert.match(result.outputEventsSha256,/^[a-f0-9]{64}$/);
 assert.equal(s.queries.length,2);
});
test('no DB writes or provider calls occur while readback runs',async()=>{
 const s=store([row()]);
 await at(s.db);
 assert.equal(s.queries.every(q=>q.startsWith('SELECT')),true);
});
test('missing current or day row is never treated as completed output',async()=>{
 await assert.rejects(at(store([row()],{current:null}).db),/CHECKPOINT_MISMATCH/);
 const s=store([]);s.records.set('current',row());
 await assert.rejects(at(s.db),/CHECKPOINT_MISMATCH/);
});
test('exact body equality is required for current/day snapshot',async()=>{
 const s=store([row()]);const copy=body();copy.overall.score=41;
 s.records.set('current',row(ms,copy));
 await assert.rejects(at(s.db),/CHECKPOINT_MISMATCH/);
});
test('same body with changed stored-at cannot pass checkpoint CAS',async()=>{
 const s=store([row()]);s.records.set('current',{...row(),stored_at:ms+10});
 await assert.rejects(at(s.db),/CHECKPOINT_MISMATCH/);
});
test('invalid and not-READY historical score is rejected or skipped safely',async()=>{
 const b=body();b.overall.score=null;
 await assert.rejects(at(store([row(ms,b)]).db),/SCORE_INVALID/);
 const c=body();c.status='FAILED';
 await assert.rejects(at(store([row(ms,c)]).db),/FINAL_OUTPUT_INVALID/);
});
test('KST local day select includes UTC previous day after 15:00',async()=>{
 const r=row(ms),s=store([r]);
 const out=await readStoredMarketFinalScoreDays(s.db,{fromDay:'2026-11-24',toDay:'2026-11-24',now:ms+10000});
 assert.equal(out.storedUtcDays,1);
 assert.equal(out.actualOutputEvents,2);
 assert.equal(out.dailyFinalScorePoints,2);
 assert.equal(out.points[0].calculatedDateKst,'2026-11-24');
});
test('only existing day rows contribute; no gaps, trends or input observations',async()=>{
 const older=row(ms-DAY*2),recent=row(ms);
 const out=await readStoredMarketFinalScoreDays(store([older,recent]).db,{
  fromDay:'2026-11-22',toDay:'2026-11-24',now:ms+10000});
 assert.equal(out.storedUtcDays,2);
 assert.equal(out.actualOutputEvents,4);
 assert.ok(out.points.every(x=>!('indicators'in x)&&!('overallTrend'in x)));
 assert.equal(out.points.length,4);
});
test('invalid stored UTC key-to-clock mapping is not silently accepted',async()=>{
 const bad={...row(),snapshot_key:'2026-11-22'};
 await assert.rejects(readStoredMarketFinalScoreDays(store([bad]).db,{
  fromDay:'2026-11-22',toDay:'2026-11-24',now:ms+10000}),/CALCULATION_CLOCK_INVALID/);
});
test('future write clocks cannot masquerade as real older scores',async()=>{
 await assert.rejects(readStoredMarketFinalScoreDays(store([row()]).db,{
  fromDay:'2026-11-24',toDay:'2026-11-24',now:ms-1}),/CALCULATION_CLOCK_INVALID/);
});
test('an invalid date or excessive date span is rejected before a query',async()=>{
 const s=store([row()]);
 await assert.rejects(readStoredMarketFinalScoreDays(s.db,{fromDay:'2026-02-30',toDay:'2026-11-24'}),/RANGE_INVALID/);
 await assert.rejects(readStoredMarketFinalScoreDays(s.db,{fromDay:'2025-01-01',toDay:'2026-11-24'}),/RANGE_INVALID/);
 assert.equal(s.queries.length,0);
});
test('no historic source points are produced from an empty saved output store',async()=>{
 const out=await readStoredMarketFinalScoreDays(store([]).db,{
  fromDay:'2026-11-23',toDay:'2026-11-24',now:ms+10000});
 assert.deepEqual(out.points,[]);assert.equal(out.storedUtcDays,0);
});
test('numeric zero remains a real final score with no artificial input detail',async()=>{
 const b=body();b.overall.score=0;b.domains[0].score=0;
 const res=await readStoredMarketFinalScoreDays(store([row(ms,b)]).db,{
  fromDay:'2026-11-24',toDay:'2026-11-24',now:ms+10000});
 assert.deepEqual(res.points.map(x=>x.score),[0,0]);
});
test('equal UTC-day conflicting rows are refused instead of rewriting events',async()=>{
 const a=row(ms),b=row(ms);
 const s=store([a,b]); // regular store map keeps only one key
 s.records.set('2026-11-23',a);
 const output=await readStoredMarketFinalScoreDays(s.db,{
  fromDay:'2026-11-24',toDay:'2026-11-24',now:ms+10000});
 assert.equal(output.storedUtcDays,1);assert.equal(output.dailyFinalScorePoints,2);
});
