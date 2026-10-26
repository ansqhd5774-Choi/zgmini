import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {runAudit,summarizeFeed} from '../scripts/pc-writer/market-calendar-r6-readonly.mjs';

const sample={status:'READY',updatedAt:'2026-10-27T00:00:00Z',sources:{bls:{status:'READY',checkedAt:'2026-10-27T00:00:00Z'}},events:[
 {source:'bls',id:'cpi',date:'2026-11-10',title:'CPI',sourceUrl:'https://www.bls.gov/schedule/'},
 {source:'bea',id:'gdp',date:'2026-11-10',title:'GDP',sourceUrl:'https://www.bea.gov/news/schedule'},
]};

test('R6 feed summary is deterministic and emits only counts, approved-source states and hash',()=>{
 const first=summarizeFeed(sample,Date.parse('2026-10-27T00:00:00Z'));
 const reorder=summarizeFeed({...sample,events:[...sample.events].reverse()});
 assert.equal(first.events,2);
 assert.equal(first.bySource.bls,1);
 assert.equal(first.bySource.bea,1);
 assert.equal(first.eventsSha256,reorder.eventsSha256);
 assert.equal(first.duplicates,0);
 assert.equal(first.invalidDates,0);
 assert.ok(!JSON.stringify(first).includes('www.bls.gov'));
 const malformed=summarizeFeed({...sample,events:[sample.events[0],sample.events[0],{source:'bls',id:'bad',date:'2026-02-30',sourceUrl:'http://invalid'}]});
 assert.equal(malformed.duplicates,1);
 assert.equal(malformed.invalidDates,1);
 assert.equal(malformed.invalidUrls,1);
});

test('R6 audit opens an existing SQLite database read-only and matches the public payload without exposing settings',async t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-calendar-r6-test-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 fs.mkdirSync(path.join(base,'storage'));
 fs.writeFileSync(path.join(base,'config.json'),JSON.stringify({source:'a'.repeat(40),enabled:true,collectionTarget:'pc',secret:'DO_NOT_REPORT'}));
 fs.writeFileSync(path.join(base,'local-collection-last-run.json'),JSON.stringify({at:'2026-10-27T00:00:00Z',lane:'core',status:'COMPLETE',releaseCalendar:{status:'READY',providerRequests:4},token:'DO_NOT_REPORT'}));
 const file=path.join(base,'storage','core.sqlite');
 const db=new DatabaseSync(file);
 db.exec('CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT,stored_at INTEGER)');
 db.prepare('INSERT INTO public_feed_snapshots_v1 VALUES(?,?,?,?,?)').run('output','release-calendar','current',JSON.stringify(sample),Date.parse('2026-10-27T00:00:00Z'));
 db.close();
 const before=fs.statSync(file).size;
 const report=await runAudit({base,remote:async()=>summarizeFeed(sample),task:()=>({state:'TEST_TASK'})});
 assert.equal(report.sqlite.events,2);
 assert.equal(report.parity.sameEvents,true);
 assert.equal(report.local.collection.calendarRequests,4);
 assert.equal(report.task.state,'TEST_TASK');
 assert.equal(fs.statSync(file).size,before);
 assert.ok(!JSON.stringify(report).includes('DO_NOT_REPORT'));
});
