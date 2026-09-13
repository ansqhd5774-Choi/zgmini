import test, {before, after, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {D1KoreaMarketHistoryStore as Store, ROWS_PER_INSERT, sumRowsWritten} from '../worker/korea-market-d1.mjs';
import {standardizeMarketSnapshot} from '../worker/korea-market-v2.mjs';
import {runKoreaMarketBackfill as run} from '../worker/korea-market-backfill.mjs';

const migration=await readFile(new URL('../drizzle/0001_kfg_v2_research.sql',import.meta.url),'utf8');
const favorites=await readFile(new URL('../drizzle/0000_stormy_miek.sql',import.meta.url),'utf8');
const tables=['kfg_v2_factor_snapshots','kfg_v2_market_rows','kfg_v2_market_dates','kfg_v2_backfill_progress'];
let mf, db;
before(async()=>{
  // Actual Miniflare/workerd D1 SQLite, no fake transaction implementation, no remote DB.
  mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("fixture only")}}',
    compatibilityDate:'2026-05-15',d1Databases:['DB']});
  db=await mf.getD1Database('DB');
  for(const sql of favorites.split('--> statement-breakpoint')) await db.prepare(sql.trim()).run();
  await db.prepare("INSERT INTO favorite_sentiments(user_id,item_key,item_type,item_name) VALUES ('fixture-user','fixture-key','country','fixture-name')").run();
  for(const sql of migration.split('--> statement-breakpoint')) await db.prepare(sql.trim()).run();
});
after(async()=>{await mf?.dispose();});
beforeEach(async()=>{
  await db.prepare('DROP TRIGGER IF EXISTS kfg_test_failure').run();
  for(const table of tables)await db.prepare(`DELETE FROM ${table}`).run();
});
const raw=(date,id='I1',overrides={})=>({basDt:date,isinCd:id,srtnCd:id,mrktCtg:'KOSPI',clpr:'10',fltRt:'1',trPrc:'20',mrktTotAmt:'100',...overrides});
const snapshot=(date='20260909',rows=[raw(date)])=>standardizeMarketSnapshot(rows,date,{fetchedAt:'2026-09-13T00:00:00Z'});
async function store(options){const s=new Store(db,options);assert.equal(await s.acquireLease(),true);return s;}
const count=async table=>(await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()).n;
const response=date=>Response.json({response:{header:{resultCode:'00'},body:{totalCount:1,items:{item:[raw(date)]}}}});
const runnerArgs=(s,calls)=>({store:s,key:'fixture',fetchImpl:async url=>{const d=url.searchParams.get('basDt');calls.push(d);return response(d);}});
const factor=s=>({factor:'Breadth',advanceRatio:s.breadth.advanceRatio,advanceValueShare:s.breadth.advanceValueShare,
  score:s.breadth.score,status:s.breadth.status,coverage:{return:s.returnCoverage,tradingValue:s.tradingValueCoverage,marketCap:s.marketCapCoverage}});

test('migration adds only research tables; favorites schema/index/fixture rows unchanged',async()=>{
  const {results}=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kfg_v2_%'").all();
  assert.deepEqual(results.map(r=>r.name).sort(),[...tables].sort());
  assert.ok(!/\b(?:DROP|ALTER|REPLACE)\b/i.test(migration));
  assert.ok(!migration.includes('favorite_sentiments'));
  const {results:columns}=await db.prepare('PRAGMA table_info(favorite_sentiments)').all();
  assert.deepEqual(columns.map(c=>c.name),['id','user_id','item_key','item_type','item_name','created_at']);
  const row=await db.prepare('SELECT user_id,item_key,item_type,item_name FROM favorite_sentiments').first();
  assert.deepEqual(row,{user_id:'fixture-user',item_key:'fixture-key',item_type:'country',item_name:'fixture-name'});
  const {results:index}=await db.prepare('PRAGMA index_info(kfg_v2_security_date)').all();
  assert.deepEqual(index.map(r=>r.name),['security_id','date']);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND name LIKE 'idx_favorite_sentiments_%'").first()).n,2);
});
test('complete date roundtrip and all four data groups committed',async()=>{
  const s=await store(), input=snapshot();await s.saveMarketDate(input);
  assert.deepEqual(await s.getMarketDate('20260909'),{...input,requestCount:0});
  assert.equal(await count(tables[0]),1);assert.equal(await count(tables[1]),1);assert.equal(await count(tables[2]),1);
  const p=await s.getBackfillProgress();assert.equal(p.successfulTradingDates,1);assert.equal(p.oldestProcessedDate,'20260909');
  assert.equal(p.rowsProcessed,1);
});
test('numeric zero and null preserved, only eight raw columns',async()=>{
  const s=await store(),input=snapshot('20260909',[raw('20260909','I1',{clpr:'0',fltRt:'0',trPrc:'0',mrktTotAmt:'0'}),raw('20260909','I2',{clpr:'',mrktTotAmt:''})]);
  await s.saveMarketDate(input);const rows=(await s.getMarketDate('20260909')).rows;
  assert.equal(rows[0].close,0);assert.equal(rows[0].returnPct,0);assert.equal(rows[0].tradingValue,0);assert.equal(rows[0].marketCap,0);
  assert.equal(rows[1].close,null);assert.equal(rows[1].marketCap,null);assert.equal(Object.keys(rows[0]).length,8);
});
for(const invalid of [NaN,Infinity,-Infinity,'12',Number.MAX_SAFE_INTEGER+1])test(`numeric reject ${String(invalid)}`,async()=>{
  const s=await store(),input=snapshot();input.rows[0].marketCap=invalid;
  await assert.rejects(s.saveMarketDate(input),/INVALID_NUMERIC/);assert.equal(await count(tables[1]),0);
});
test('security history chronological, uses index; no synthetic dates',async()=>{
  const s=await store();await s.saveMarketDate(snapshot('20260909'));await s.saveMarketDate(snapshot('20260907'));
  assert.deepEqual((await s.getSecurityHistory('I1')).map(r=>r.date),['20260907','20260909']);
  assert.deepEqual(await s.getSecurityHistory('ABSENT'),[]);
  const q=await db.prepare('EXPLAIN QUERY PLAN SELECT * FROM kfg_v2_market_rows WHERE security_id=? ORDER BY date').bind('I1').all();
  assert.ok(q.results.some(r=>r.detail.includes('kfg_v2_security_date')));
});
test('Breadth roundtrip is idempotent only, conflicts cannot overwrite',async()=>{
  const s=await store(),input=snapshot();await s.saveMarketDate(input);const expected=factor(input);
  await s.saveFactorSnapshot('20260909',expected);assert.deepEqual(await s.getFactorHistory(),[{date:'20260909',...expected}]);
  await assert.rejects(s.saveFactorSnapshot('20260909',{...expected,score:0}),/FACTOR_CONFLICT/);
  assert.deepEqual(await s.getFactorHistory('Momentum'),[]);
});
test('checkpoint roundtrip; count matches durable complete dates after reconstruction',async()=>{
  const s=await store();await s.saveMarketDate(snapshot());const p={...await s.getBackfillProgress(),status:'PAUSED'};
  await s.saveBackfillProgress(p);const rebuilt=new Store(db);assert.deepEqual(await rebuilt.getBackfillProgress(),p);
  assert.equal(p.successfulTradingDates,await count(tables[2]));
  await assert.rejects(s.saveBackfillProgress({...p,successfulTradingDates:2}));assert.deepEqual(await s.getBackfillProgress(),p);
});
for(const [name,table,event,condition] of [
  ['row',tables[1],'INSERT','1'],['metadata',tables[2],'INSERT','1'],['factor',tables[0],'INSERT','1'],
  ['checkpoint',tables[3],'UPDATE','NEW.rows_processed > OLD.rows_processed']
]) test(`actual D1 batch rollback on ${name} statement failure`,async()=>{
  const s=await store();
  await db.prepare(`CREATE TRIGGER kfg_test_failure BEFORE ${event} ON ${table} WHEN ${condition} BEGIN SELECT RAISE(ABORT,'fixture failure'); END`).run();
  await assert.rejects(s.saveMarketDate(snapshot()));
  for(const table of tables.slice(0,3))assert.equal(await count(table),0);
  const p=await s.getBackfillProgress();assert.equal(p.successfulTradingDates,0);assert.equal(p.oldestProcessedDate,null);assert.equal(p.rowsProcessed,0);
});
test('2766 rows commit in bounded prepared statements, 96 parameters each maximum',async()=>{
  let maximum=0;const wrapped={prepare(sql){const statement=db.prepare(sql);return {bind(...values){maximum=Math.max(maximum,values.length);assert.ok(values.length<=100);assert.ok(Buffer.byteLength(sql)<=100000);return statement.bind(...values);}};},batch:ss=>db.batch(ss)};
  const s=new Store(wrapped);await s.acquireLease();await s.saveMarketDate(snapshot('20260909',Array.from({length:2766},(_,i)=>raw('20260909',`I${i}`))));
  assert.equal(ROWS_PER_INSERT,12);assert.equal(maximum,96);assert.equal(await count(tables[1]),2766);
});
test('complete duplicate fails without row/factor/progress rewrite',async()=>{
  const s=await store(),input=snapshot();await s.saveMarketDate(input);const p=await s.getBackfillProgress();
  await assert.rejects(s.saveMarketDate(input),/DATE_ALREADY_STORED/);assert.deepEqual(await s.getBackfillProgress(),p);
  assert.equal(await count(tables[1]),1);assert.equal(await count(tables[0]),1);
});
test('lease persisted across instances, second runner ALREADY_RUNNING with zero provider calls',async()=>{
  const first=await store(),second=new Store(db),calls=[];
  assert.equal(await second.acquireLease(),false);const result=await run(runnerArgs(second,calls));
  assert.equal(result.status,'ALREADY_RUNNING');assert.equal(calls.length,0);assert.equal(await first.releaseLease(),true);
  assert.equal(await second.acquireLease(),true);assert.equal(await second.releaseLease(),true);
});
test('expired lease takeover fences old writer and wrong owner release',async()=>{
  let now=100;const first=await store({now:()=>now,leaseMs:10});now=111;
  const second=new Store(db,{now:()=>now,leaseMs:10});assert.equal(await second.acquireLease(),true);
  await assert.rejects(first.saveMarketDate(snapshot()));assert.equal(await count(tables[1]),0);
  assert.equal(await first.releaseLease(),false);assert.equal(await new Store(db,{now:()=>now}).acquireLease(),false);
  assert.equal(await second.releaseLease(),true);
});
test('renewal is conditional; expired writer cannot resurrect its lease',async()=>{
  let now=100;const s=await store({now:()=>now,leaseMs:10});now=105;await s.renewLease();
  now=115;await assert.rejects(s.renewLease(),/LEASE_LOST/);await assert.rejects(s.saveBackfillProgress({...await s.getBackfillProgress(),status:'PAUSED'}));
});
test('writes without lease blocked',async()=>{await assert.rejects(new Store(db).saveMarketDate(snapshot()),/LEASE_REQUIRED/);});
test('real D1 resume five plus five across adapter instances; no refetch/count duplication',async()=>{
  const one=[],two=[];const a=await run(runnerArgs(new Store(db),one));const b=await run(runnerArgs(new Store(db),two));
  assert.equal(a.status,'CHUNK_COMPLETE');assert.equal(b.status,'CHUNK_COMPLETE');assert.equal(b.checkpoint.successfulTradingDates,10);
  assert.equal(b.checkpoint.requestCount,10);assert.equal(b.checkpoint.rowsProcessed,10);assert.ok(two.every(d=>!one.includes(d)));
  assert.equal(await count(tables[0]),10);
});
test('empty weekday persists but does not increment successful dates',async()=>{
  const s=await store();await s.saveMarketDate(snapshot('20260909',[]));
  assert.equal((await s.getMarketDate('20260909')).status,'NO_TRADING_OBSERVATION');
  assert.equal((await s.getBackfillProgress()).successfulTradingDates,0);assert.equal(await count(tables[0]),0);
});
test('provider failure stops and next run resumes exact uncommitted candidate',async()=>{
  const s=new Store(db),calls=[];const r=await run({...runnerArgs(s,calls),fetchImpl:async()=>new Response('',{status:500})});
  assert.equal(r.status,'ERROR');assert.equal((await s.getBackfillProgress()).requestCount,1);
  const next=[];const resumed=await run({...runnerArgs(new Store(db),next),targetAdditionalDates:1});
  assert.deepEqual(next,['20260909']);assert.equal(resumed.checkpoint.requestCount,2);
});
test('rowsWritten observation and unknown metadata distinct from zero',async()=>{
  assert.equal(sumRowsWritten([{meta:{rows_written:0}}]),0);assert.equal(sumRowsWritten([{meta:{}}]),null);
  assert.equal(sumRowsWritten([{meta:{rows_written:2}},{meta:{rows_written:3}}]),5);
  const s=await store();await s.saveMarketDate(snapshot());assert.ok(s.getWriteUsage().rowsWritten>0);
});
