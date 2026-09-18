import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMiniflare,MFResponse} from './miniflare-harness.mjs';
import {Rev7D1Store} from '../worker/korea-rev7-d1.mjs';

const migration=await readFile(new URL('../drizzle/0005_kfg_rev7_foundation.sql',import.meta.url),'utf8');
const tables=['kfg_rev7_snapshots','kfg_rev7_daily_series','kfg_rev7_kospi_rows','kfg_rev7_market_dates','kfg_rev7_backfill_progress'];
let mf,db;
before(async()=>{mf=createMiniflare({modules:true,script:'export default {fetch(){return new MFResponse("fixture")}}',compatibilityDate:'2026-05-15',d1Databases:['DB']});db=await mf.getD1Database('DB');for(const sql of migration.split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();});
after(async()=>{await mf?.dispose();});
beforeEach(async()=>{for(const t of tables)await db.prepare(`DELETE FROM ${t}`).run();});
test('backfill status transition requires active lease and persists',async()=>{
 const s=new Rev7D1Store(db);
 await assert.rejects(s.markBackfillStatus('PAUSED'),/LEASE_REQUIRED/);
 assert.equal(await s.acquireLease('status-test'),true);
 assert.equal(await s.markBackfillStatus('PAUSED',null),true);
 assert.equal((await s.getBackfillProgress()).status,'PAUSED');
 assert.equal(await s.releaseLease(),true);
});
test('invalid status/failure code are rejected',async()=>{
 const s=new Rev7D1Store(db);await s.acquireLease('status-test');
 await assert.rejects(s.markBackfillStatus('BAD'),/INVALID_BACKFILL_STATUS/);
 await assert.rejects(s.markBackfillStatus('ERROR','x'.repeat(129)),/INVALID_FAILURE_CODE/);
});
