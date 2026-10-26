import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {projectFromSavedDb} from '../scripts/pc-writer/market-calendar-r7-raw-shadow.mjs';

const ics=(entries)=>`BEGIN:VCALENDAR\n${entries.map(([date,title])=>`BEGIN:VEVENT\nDTSTART;TZID=US-Eastern:${date}T083000\nSUMMARY:${title}\nEND:VEVENT`).join('\n')}\nEND:VCALENDAR`;

test('R7 projects the expanded parser from saved raw text, preserving SQLite and keeping inputs private',t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-calendar-r7-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const file=path.join(base,'core.sqlite');
 const db=new DatabaseSync(file);
 db.exec('CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT,stored_at INTEGER)');
 const insert=db.prepare('INSERT INTO public_feed_snapshots_v1 VALUES(?,?,?,?,?)');
 const now=Date.parse('2026-10-27T00:00:00Z');
 const old=[{id:'employment',date:'2026-11-06',source:'bls',title:'Employment Situation',sourceUrl:'https://www.bls.gov/schedule/news_release/empsit.htm'}];
 insert.run('output','release-calendar','current',JSON.stringify({status:'READY',events:old,updatedAt:new Date(now).toISOString()}),now);
 const raw={
  bls:ics([['20261106','Employment Situation'],['20261110','Consumer Price Index']]),
  bea:ics([['20261029','GDP (Advance Estimate)\\, 3rd Quarter 2026'],['20261029','Personal Income and Outlays\\, September 2026']]),
  fed:'<p><strong>2026:</strong>January 5, February 10</p>',
  census:'<tr><td>Advance Monthly Sales for Retail and Food Services</td><td>January 15, 2026</td></tr>',
 };
 for(const [source,text] of Object.entries(raw))insert.run('input',`release-calendar:${source}`,'current',JSON.stringify({text,token:'DO_NOT_REPORT'}),now);
 db.close();
 const before=fs.statSync(file).size;
 const result=projectFromSavedDb(file);
 assert.equal(result.status,'FULL_SHADOW');
 assert.equal(result.original.count,1);
 assert.equal(result.candidate.count,7);
 assert.equal(result.candidate.delta,6);
 assert.equal(result.candidate.duplicateKeys,0);
 assert.equal(result.candidate.newlyIdentified,6);
 assert.equal(result.sources.bls.uniqueIds,2);
 assert.equal(fs.statSync(file).size,before);
 assert.ok(!JSON.stringify(result).includes('DO_NOT_REPORT'));
 assert.ok(!JSON.stringify(result).includes('BEGIN:VCALENDAR'));
});

test('R7 does not imply full coverage when saved raw input is absent',t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-calendar-r7-missing-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const file=path.join(base,'core.sqlite');
 const db=new DatabaseSync(file);
 db.exec('CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT,stored_at INTEGER)');
 db.close();
 const result=projectFromSavedDb(file);
 assert.equal(result.status,'PARTIAL_SHADOW');
 assert.equal(result.gate,'INCOMPLETE_NO_COMPARE');
 assert.equal(result.sources.bls.status,'SAVED_INPUT_MISSING');
});
