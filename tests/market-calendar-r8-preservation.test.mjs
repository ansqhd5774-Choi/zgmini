import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {auditSavedCalendar} from '../scripts/pc-writer/market-calendar-r8-preservation-audit.mjs';

const ics=rows=>`BEGIN:VCALENDAR\n${rows.map(([date,title])=>`BEGIN:VEVENT\nDTSTART:${date}T083000\nSUMMARY:${title}\nEND:VEVENT`).join('\n')}\nEND:VCALENDAR`;

function fixture(t,{missingSource=false}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-calendar-r8-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'core.sqlite');
 const db=new DatabaseSync(file);
 db.exec('CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT,stored_at INTEGER)');
 const insert=db.prepare('INSERT INTO public_feed_snapshots_v1 VALUES(?,?,?,?,?)');
 const old=[
  {source:'bls',id:'employment',date:'2026-11-06',title:'Employment Situation'},
  {source:'bls',id:'old-consumer-id',date:'2026-11-10',title:'Consumer Price Index'},
  {source:'bls',id:'removed-event',date:'2026-11-11',title:'No Longer Published'},
 ];
 insert.run('output','release-calendar','current',JSON.stringify({status:'READY',events:old}),1);
 const raw={
  bls:ics([['20261106','Employment Situation'],['20261110','Consumer Price Index'],['20261215','Producer Price Index']]),
  bea:ics([['20261130','Personal Income and Outlays\\, October 2026']]),
  fed:'<p><strong>2026:</strong>November 9</p>',
  census:'<tr><td>Advance Monthly Sales for Retail and Food Services</td><td>November 17, 2026</td></tr>',
 };
 for(const [source,text] of Object.entries(raw)){
  if(missingSource&&source==='bea')continue;
  insert.run('input',`release-calendar:${source}`,'current',JSON.stringify({text,privateSecret:'DO_NOT_REPORT'}),1);
 }
 db.close();
 return file;
}

test('R8 pinpoints renamed and unmatched historical entries without altering SQLite',t=>{
 const file=fixture(t);
 const before=fs.statSync(file).size;
 const result=auditSavedCalendar(file,{today:'2026-10-27'});
 assert.equal(result.status,'FULL_AUDIT');
 assert.equal(result.comparison.originalCount,3);
 assert.equal(result.comparison.candidateCount,6);
 assert.equal(result.comparison.newlyIdentified,5);
 assert.equal(result.comparison.notPreservedCount,2);
 assert.equal(result.comparison.notPreserved[0].reason,'SAME_DATE_TITLE_ID_CHANGED');
 assert.equal(result.comparison.notPreserved[0].related[0].id,'cpi');
 assert.equal(result.comparison.notPreserved[1].reason,'NO_MATCH_IN_CURRENT_SAVED_INPUT');
 assert.equal(result.comparison.next90Days.candidate,6);
 assert.equal(result.comparison.candidateDuplicateKeys,0);
 assert.equal(result.gate,'REVIEW_EXISTING_EVENT_PRESERVATION');
 assert.equal(fs.statSync(file).size,before);
 assert.ok(!JSON.stringify(result).includes('DO_NOT_REPORT'));
});

test('R8 suppresses preservation conclusions when one raw source is missing',t=>{
 const result=auditSavedCalendar(fixture(t,{missingSource:true}),{today:'2026-10-27'});
 assert.equal(result.status,'PARTIAL_NO_COMPARE');
 assert.equal(result.gate,'NO_CHANGES_ALLOWED');
 assert.equal(result.inputs.bea,'SAVED_INPUT_MISSING');
 assert.equal(result.comparison,undefined);
});
