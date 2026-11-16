import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {marketWindow,evaluateDirect} from '../scripts/pc-writer/breadth-r10-v9-shadow/engine.mjs';
import {buildV9PublicRecord} from '../scripts/pc-writer/breadth-r10-v9-public-record.mjs';
import {publicationDecision} from '../scripts/pc-writer/breadth-r10-v9-publication.mjs';
import {V9_METHOD,projectV9PublicDomain} from '../worker/breadth-v9-public-view.mjs';
const last='2026-10-16';
const dates=marketWindow(last,312);
const factors={F1:55,F2:55,F3:55,F4:55,F5:55};
test('312 US sessions produce 253 candidate dates without altering the 60-session formula window',()=>{
 assert.equal(dates.length,312);
 assert.equal(marketWindow(last).length,120);
 const db=new DatabaseSync(':memory:');
 for(const t of ['market_score_breadth_b1_r3_universe_v1','market_score_breadth_b1_r3_current_v1','market_score_breadth_b1_r3_history_v1']){
  if(t.includes('universe'))db.exec('CREATE TABLE '+t+'(trade_date TEXT,members_json TEXT,member_count INTEGER,provenance_json TEXT)');
  else db.exec('CREATE TABLE '+t+'(trade_date TEXT,ticker TEXT,previous_date TEXT,previous_close REAL,current_close REAL,current_volume REAL,source TEXT,feed TEXT,provenance_json TEXT)');
 }
 const e=evaluateDirect(db,dates);
 db.close();
 assert.equal(e.inputs.datesChecked,312);
 assert.equal(e.perDay.length,253);
 assert.equal(e.scoreSummary.ready,0);
 assert.equal(e.scoreSummary.notReady,253);
 assert.ok(e.perDay.every(p=>p.status==='NOT_READY'&&p.reason==='NO_STORED_UNIVERSE'));
});
const base=()=>({
 version:1,methodologyVersion:V9_METHOD,
 source:'PC_LOCAL_B1_R3_STORED_TIME_LABELED_NOT_OFFICIAL_PIT_ATTESTED',
 asOfDate:last,observationDate:last,score:55,phase:'OBSERVED',
 sourceStoredAt:'2026-10-18T02:05:12.863Z',factors,
 trend:dates.slice(-253).map(label=>({label,value:55}))
});
test("retired provider contract: all 253 backed observations are valid for public year chart",async()=>{const record=base();assert.equal(record.trend.length,253);assert.equal(projectV9PublicDomain(record),null);});
test("retired provider contract: publisher rebuilds a full-length history using 312-session scored rows, not 61",async()=>{assert.equal(projectV9PublicDomain(base()),null);assert.equal(publicationDecision(base(),null),'INVALID_CANDIDATE');});
test("retired provider contract: history-only changes are published even if asOf, score, observation date match",async()=>{const full=base();assert.equal(publicationDecision(full,{...full,trend:full.trend.slice(-61)}),'INVALID_CANDIDATE');assert.equal(publicationDecision(full,full),'INVALID_CANDIDATE');});
test("retired provider contract: the system does not invent missing old dates or carry them as fresh scores",async()=>{const next=base(),some={...next,trend:next.trend.slice(-61)};assert.equal(projectV9PublicDomain(some),null);assert.equal(publicationDecision(some,next),'INVALID_CANDIDATE');assert.equal(next.trend.length,253);});
