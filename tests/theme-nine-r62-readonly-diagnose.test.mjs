import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {inspectNineR62} from '../scripts/pc-writer/theme-nine-r62-readonly-diagnose.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'scripts/pc-writer/theme-nine-r62-readonly-diagnose.mjs'));
const command=fs.readFileSync(path.join(root,'scripts/pc-writer/THEME_NINE_R62_READONLY_DIAGNOSE.cmd'));

test('R62 is read-only and reports missing record without exposing raw D1 contents',()=>{
 const base={status:'READY',version:'BASE',observationDate:'2026-10-26',
  phase:'PROVISIONAL',themes:[],provisional:{asOf:'2026-10-27',points:[]}};
 const result=inspectNineR62({base,record:null,storedAt:null,databaseMatchesApproved:true});
 assert.equal(result.d1WriteAttempts,0);
 assert.equal(result.eligibleInSameReader,false);
 assert.equal(result.checks.recordExists,false);
 assert.equal(result.next,'D1_ROW_READER_ELIGIBILITY_FAILED');
 assert.equal(Object.hasOwn(result,'rawBody'),false);
 assert.doesNotMatch(source.toString(),/\b(?:INSERT|UPDATE|DELETE)\b\s+public_feed_snapshots_v1/i);
});

test('R62 CMD is ASCII CRLF and contains identical SHA-checked diagnostic source',()=>{
 const s=command.toString('ascii');
 assert.match(s,/^@echo off\r\n/);
 assert.ok(!/(^|[^\r])\n/.test(s));
 assert.ok(!/[^\x00-\x7f]/.test(s));
 assert.match(s,/D1_WRITE_ATTEMPTS=0/);
 assert.doesNotMatch(s,/THEME_NINE_R54_PUBLIC_CYCLE\.cmd/);
 assert.doesNotMatch(s,/schtasks\s+\/(create|delete|change)/i);
 const line=s.split('\r\n').find(x=>x.includes('-e')&&x.includes('R62_DIAGNOSTIC_SOURCE_VERIFIED'));
 assert.ok(line);
 const js=line.slice(line.indexOf('-e "')+4,line.indexOf('" >>'));
 new Script(js);
 const x=s.lastIndexOf('::R62_SOURCE_BEGIN');
 const y=s.indexOf('::R62_SOURCE_END',x+19);
 const decoded=Buffer.from(s.slice(x+19,y).replace(/[^A-Za-z0-9+/=]/g,''),'base64');
 assert.equal(createHash('sha256').update(decoded).digest('hex'),
  createHash('sha256').update(source).digest('hex'));
});
