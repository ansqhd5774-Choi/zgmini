import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMiniflare,MFResponse} from './miniflare-harness.mjs';
import {Rev7D1Store,REV7_ROWS_PER_INSERT} from '../worker/korea-rev7-d1.mjs';
import {calculateRev7} from '../worker/korea-rev7-engine.mjs';

const migration=await readFile(new URL('../drizzle/0005_kfg_rev7_foundation.sql',import.meta.url),'utf8');
const tables=['kfg_rev7_snapshots','kfg_rev7_daily_series','kfg_rev7_kospi_rows','kfg_rev7_market_dates','kfg_rev7_backfill_progress'];
let mf,db;
before(async()=>{
  mf=createMiniflare({modules:true,script:'export default {fetch(){return new MFResponse("fixture")}}',compatibilityDate:'2026-05-15',d1Databases:['DB']});
  db=await mf.getD1Database('DB');
  for(const sql of migration.split('--> statement-breakpoint')) if(sql.trim()) await db.prepare(sql.trim()).run();
});
after(async()=>{await mf?.dispose();});
beforeEach(async()=>{for(const table of tables)await db.prepare(`DELETE FROM ${table}`).run();});

const snapshot=(date='20260915')=>({
  requestedDate:date,status:'SUCCESS',complete:true,
  rows:[
    {date,securityId:'000001',shortCode:'000001',close:100,high:105,low:95,changeAmount:1,shareVolume:1000},
    {date,securityId:'000002',shortCode:'000002',close:200,high:205,low:195,changeAmount:-1,shareVolume:2000},
  ],
  series:{date,kospiClose:3000,vkospi200Close:22,ktbTotalReturn:15000,governmentPrimeTotalReturn:200,
    standardPutVolume:75,standardCallVolume:100,putCallRatio:.75,aaMinus3Y:3.5,bbbMinus3Y:5.5,junkSpread:2},
  quality:{kospiCount:2,validHighCount:2,validLowCount:2,validShareVolumeCount:2},
  krxRequestCount:5,bokRequestCount:2,fetchedAt:'2026-09-18T00:00:00Z',
});
async function store(){const s=new Rev7D1Store(db);assert.equal(await s.acquireLease('fixture'),true);return s;}

test('migration is additive and contains only kfg_rev7 tables',async()=>{
  assert.ok(!/\b(?:DROP|REPLACE)\b/i.test(migration));
  const {results}=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kfg_rev7_%'").all();
  assert.deepEqual(results.map(r=>r.name).sort(),[...tables].sort());
});
test('one date roundtrips all primary raw inputs atomically',async()=>{
  const s=await store();await s.saveDate(snapshot());
  const got=await s.getDate('20260915');
  assert.equal(got.rows.length,2);
  assert.equal(got.rows[0].high,105);
  assert.equal(got.rows[0].shareVolume,1000);
  assert.equal(got.series.vkospi200Close,22);
  assert.equal(got.series.junkSpread,2);
  const p=await s.getBackfillProgress();
  assert.equal(p.successfulTradingDates,1);
  assert.equal(p.rowsProcessed,2);
});
test('duplicate date is fenced and old value is not overwritten',async()=>{
  const s=await store();await s.saveDate(snapshot());
  await assert.rejects(s.saveDate(snapshot()),/DATE_ALREADY_STORED/);
  assert.equal((await s.getDate('20260915')).rows[0].close,100);
});
test('bounded insert stays below D1 100-parameter limit',()=>{
  assert.equal(REV7_ROWS_PER_INSERT,12);
  assert.equal(REV7_ROWS_PER_INSERT*8,96);
});
test('history read is deterministic and feeds the pure Revision 7 engine',async()=>{
  const s=await store();
  for(let i=0;i<3;i++){
    const d=`2026091${i+3}`;
    const x=snapshot(d);
    x.series.kospiClose+=i;x.series.vkospi200Close+=i;x.series.ktbTotalReturn+=i;
    for(const row of x.rows){row.date=d;row.close+=i;row.high+=i;row.low+=i;}
    await s.saveDate(x);
  }
  const history=await s.getHistory(3);
  assert.equal(history.dailySeries.length,3);
  assert.equal(history.marketRows.length,6);
  const result=calculateRev7(history);
  assert.equal(result.history.length,3);
  assert.equal(result.score,null);
});
