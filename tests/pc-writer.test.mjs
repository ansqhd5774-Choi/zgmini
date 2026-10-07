import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {readonly,client} from '../scripts/pc-writer/d1.mjs';
import {marketPlan} from '../scripts/pc-writer/publish.mjs';
import {readBreadthB1R5StoredScore} from '../lib/market-score/breadth-b1-r5-reader.mjs';

test('readonly transport rejects mutations and stacked statements',()=>{
 for(const sql of ['DELETE FROM x','SELECT 1; DELETE FROM x','PRAGMA x','CREATE TABLE x(y)','SELECT 1 -- hidden'])assert.equal(readonly(sql),false);
 assert.equal(readonly('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?'),true);
 assert.equal(readonly('WITH recent AS (SELECT value FROM inputs) SELECT SUM(value) FROM recent'),true);
 for(const sql of ['WITH recent AS (SELECT 1) DELETE FROM x','WITH recent AS (DELETE FROM x RETURNING *) SELECT * FROM recent'])assert.equal(readonly(sql),false);
});
test('stored breadth reads existing schema without any initialization write',async()=>{
 const queries=[];
 const db={prepare(sql){assert.equal(readonly(sql),true);queries.push(sql);return {bind(){return this},async all(){return {results:[]}}};}};
 const out=await readBreadthB1R5StoredScore({db,asOfDate:'2026-10-05'});
 assert.equal(out.status,'PARTIAL');assert.deepEqual(out.missing,['B1_R4_STORED_COVERAGE_MISSING']);assert.ok(queries.length>0);
});
function database(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE market_collection_jobs_v1(job TEXT PRIMARY KEY,lease_id TEXT,lease_until INTEGER); CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY,body TEXT,stored_at INTEGER);');db.prepare('INSERT INTO market_collection_jobs_v1 VALUES(?,?,?)').run('pipeline','owner',Date.now()+60000);db.prepare('INSERT INTO market_public_snapshots_v1 VALUES(?,?,?)').run('current','{}',10);return db;}
const body={status:'SUCCESS',domains:Array.from({length:12},()=>({status:'PARTIAL'}))};
function execute(db,plan){db.exec('BEGIN');try{for(const item of plan)db.prepare(item.sql).run(...item.params);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}}
test('publication is guarded by the existing pipeline lease and prior generation',()=>{
 const db=database();assert.throws(()=>execute(db,marketPlan(body,20,'other',10)));
 assert.equal(db.prepare("SELECT stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'").get().stored_at,10);
 assert.throws(()=>execute(db,marketPlan(body,20,'owner',9)));
 execute(db,marketPlan(body,20,'owner',10));
 assert.equal(db.prepare("SELECT stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'").get().stored_at,20);db.close();
});
test('incomplete response cannot be published as a complete market envelope',()=>{
 assert.throws(()=>marketPlan({status:'SUCCESS',domains:[]},20,'owner',10));
});
test('read adapters cannot write or change schema',async()=>{
 const c=client({account:'a'.repeat(32),core:'a'.repeat(36),history:'b'.repeat(36)},'unused');
 const db=c.adapter('a'.repeat(36));
 await assert.rejects(db.prepare('INSERT INTO x VALUES(?)').bind(1).run(),/REMOTE_WRITE_DISABLED/);
 await assert.rejects(db.batch([]),/REMOTE_WRITE_DISABLED/);
 assert.throws(()=>db.exec('CREATE TABLE x(y)'),/SCHEMA_CHANGE_DISABLED/);
});


test('local writer merges stored composite history before saving and publishing',()=>{
 const src=fs.readFileSync(new URL('../scripts/pc-writer/run-local.mjs',import.meta.url),'utf8');
 assert.match(src,/mergeStoredCompositeTrend/);
 assert.match(src,/readScoreHistory\(\{sinceDate:oneYearHistoryStart\(now\),limit:370\}\)/);
 assert.match(src,/body\.overall\.trend=mergeStoredCompositeTrend/);
 assert.match(src,/trendPoints:body\.overall\?\.trend\?\.length\?\?0/);
});


test('local writer preserves liquidity coverage evidence through publish',()=>{
 const src=fs.readFileSync(new URL('../scripts/pc-writer/run-local.mjs',import.meta.url),'utf8');
 assert.match(src,/LIQUIDITY_1Y_COVERAGE/);
 assert.match(src,/liquidityCoverage/);
 assert.match(src,/report\.market=\{\.\.\.report\.market,\.\.\.await publishMarket/);
 assert.match(src,/console\.warn=originalWarn/);
});

test('local cycle blocks publication after collection error',()=>{
 const src=fs.readFileSync(new URL('../scripts/pc-writer/local-cycle.mjs',import.meta.url),'utf8');
 assert.match(src,/collectionFailed=collection\.status!==0/);
 assert.match(src,/COLLECTION_FAILED_PUBLISH_BLOCKED/);
 assert.match(src,/publishSkipped/);
});


test('local core cycle automatically accumulates prospective dollar evidence without gating publication',()=>{
 const src=fs.readFileSync(new URL('../scripts/pc-writer/local-cycle.mjs',import.meta.url),'utf8');
 assert.match(src,/lane==='core'/);
 assert.match(src,/dollar-prospective-forward-r1\.mjs/);
 assert.match(src,/local-dollar-prospective-last-run\.json/);
 assert.match(src,/researchProspective/);
 assert.match(src,/nonBlocking:true/);
 assert.match(src,/SKIPPED_KOREA_LANE/);
 assert.match(src,/if\(publication\.status!==0\)process\.exitCode=1/);
 assert.doesNotMatch(src,/if\(prospective\.status!==0\)process\.exitCode=1/);
});


test('local core cycle automatically accumulates prospective index-fund flow evidence without gating publication',()=>{
 const src=fs.readFileSync(new URL('../scripts/pc-writer/local-cycle.mjs',import.meta.url),'utf8');
 assert.match(src,/fund-flow-index-prospective-r1\.mjs/);
 assert.match(src,/local-fund-flow-index-prospective-last-run\.json/);
 assert.match(src,/researchFundFlowProspective/);
 assert.match(src,/nonBlocking:true/);
 assert.match(src,/observedReleaseDate/);
 assert.doesNotMatch(src,/if\(fundFlowProspective\.status!==0\)process\.exitCode=1/);
 assert.match(src,/if\(publication\.status!==0\)process\.exitCode=1/);
});


test('local core cycle automatically accumulates prospective Breadth R7 PIT evidence without gating publication',()=>{
 const src=fs.readFileSync(new URL('../scripts/pc-writer/local-cycle.mjs',import.meta.url),'utf8');
 assert.match(src,/breadth-r7-prospective-r1\.mjs/);
 assert.match(src,/local-breadth-r7-prospective-last-run\.json/);
 assert.match(src,/researchBreadthProspective/);
 assert.match(src,/nonBlocking:true/);
 assert.match(src,/pitRefreshed/);
 assert.doesNotMatch(src,/if\(breadthProspective\.status!==0\)process\.exitCode=1/);
 assert.match(src,/if\(publication\.status!==0\)process\.exitCode=1/);
});
