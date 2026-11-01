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
test('all 253 backed observations are valid for public year chart',()=>{
 const record=base(),publicDomain=projectV9PublicDomain(record);
 assert.ok(publicDomain);
 assert.equal(publicDomain.trend.length,253);
 assert.equal(publicDomain.trend.at(-1).label,last);
 assert.ok(record.trend.at(0).label<='2025-11-01');
});
test('publisher rebuilds a full-length history using 312-session scored rows, not 61',()=>{
 const next=base();
 const latest={
  methodologyVersion:V9_METHOD,asOf:last,status:'SHADOW_READY',sourceStoredAt:next.sourceStoredAt,
  evaluation:{perDay:next.trend.map(row=>({date:row.label,status:'CANDIDATE_READY',ema3:row.value,score:row.value}))}
 };
 const verified={
  methodologyVersion:V9_METHOD,status:'SHADOW_READY',display:{score:55},
  evaluation:{scoreSummary:{latest:{date:last,ema3:55,rawScore:55,factors}}}
 };
 const record=buildV9PublicRecord({latest,verified});
 assert.ok(record);
 assert.equal(record.trend.length,253);
 assert.equal(record.trend.at(-1).label,last);
});
test('history-only changes are published even if asOf, score, observation date match',()=>{
 const full=base(),previous={...full,trend:full.trend.slice(-61)};
 assert.equal(publicationDecision(full,previous),'PUBLISH');
 assert.equal(publicationDecision(full,full),'UNCHANGED');
});
test('the system does not invent missing old dates or carry them as fresh scores',()=>{
 const next=base(),some={...next,trend:next.trend.slice(-61)};
 assert.equal(projectV9PublicDomain(some).trend.length,61);
 assert.equal(publicationDecision(some,next),'PUBLISH');
});
