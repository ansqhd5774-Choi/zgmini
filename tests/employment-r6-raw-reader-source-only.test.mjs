import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {EMPLOYMENT_R6_TABLES} from '../lib/market-score/employment-r6-contract.mjs';
import {readAndAggregateR6RawSourceOnly as read} from '../lib/market-score/employment-r6-raw-reader-source-only.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex');
function fixture({body='{"value":7}',tamper=false,chunkGap=false,invalidRun=false}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r6-raw-source-only-'));
 const file=path.join(dir,'core.sqlite');
 const db=new DatabaseSync(file);
 const raw=EMPLOYMENT_R6_TABLES.rawSnapshot, runs=EMPLOYMENT_R6_TABLES.runs;
 try{
  db.exec('CREATE TABLE '+raw+' (snapshot_id TEXT,chunk_index INTEGER,chunk_count INTEGER,release_group TEXT,provider TEXT,request_key TEXT,retrieved_at TEXT,created_at TEXT,body_sha256 TEXT,detail_json TEXT,body_chunk TEXT)');
  db.exec('CREATE TABLE '+runs+' (provider TEXT,status TEXT,completed_at TEXT,detail_json TEXT)');
  const provider='BLS',releaseGroup='BLS_EMPLOYMENT_SITUATION',requestKey='private-key',bodySha256=digest(body);
  const snapshotId=digest([releaseGroup,provider,requestKey,bodySha256].join('|'));
  const retrievedAt='2026-11-20T02:00:00.000Z',createdAt='2026-11-20T02:00:01.000Z';
  const insert=db.prepare('INSERT INTO '+raw+' VALUES(?,?,?,?,?,?,?,?,?,?,?)');
  const pieces=[body.slice(0,Math.floor(body.length/2)),body.slice(Math.floor(body.length/2))];
  pieces.forEach((piece,i)=>insert.run(snapshotId,chunkGap&&i===1?2:i,2,
    releaseGroup,provider,requestKey,retrievedAt,createdAt,bodySha256,
    JSON.stringify({responseHash:bodySha256}),tamper&&i===1?'bad':piece));
  const runsInsert=db.prepare('INSERT INTO '+runs+' VALUES(?,?,?,?)');
  runsInsert.run('OTHER_PROVIDER','SUCCESS','2026-11-20T02:01:00.000Z','{}');
  runsInsert.run('EMPLOYMENT_R6_'+releaseGroup,invalidRun?'FAILED':'SUCCESS',
    '2026-11-20T02:01:00.000Z',JSON.stringify({rawSnapshots:[{snapshotId,bodySha256}]}));
  return {dir,file,body,snapshotId};
 }finally{db.close();}
}
function execute(f,opts={}){
 const before=digest(fs.readFileSync(f.file));
 const output=read({dbPath:f.file,approvedDbRealpath:fs.realpathSync(f.file),
   asOfDate:'2026-11-25',...opts});
 assert.equal(digest(fs.readFileSync(f.file)),before,'read-only source bytes changed');
 return output;
}
async function withFixture(options,callback){
 const f=fixture(options);
 try{return await callback(f);}finally{fs.rmSync(f.dir,{recursive:true,force:true});}
}
test('approved SQLite source delivers one body-verified and Run-certified count only',()=>withFixture({},f=>{
 const o=execute(f);
 assert.deepEqual([o.metadataKeys,o.bodyVerifiedKeys,o.runCertifiedKeys],[1,1,1]);
 assert.equal(o.runtimeAuthorizationVerified,false);
 assert.equal(o.historicalPitAttested,false);
 assert.equal(o.repairAuthorized,false);
 assert.equal(o.rawSnapshotByGroup[0].releaseGroup,'BLS_EMPLOYMENT_SITUATION');
 assert.ok(!JSON.stringify(o).includes(f.snapshotId));
 assert.ok(!JSON.stringify(o).includes('private-key'));
}));
test('tampered content is metadata-only without body or Run certification',()=>withFixture({tamper:true},f=>{
 const o=execute(f);
 assert.deepEqual([o.metadataKeys,o.bodyVerifiedKeys,o.runCertifiedKeys],[1,0,0]);
}));
test('nonconsecutive chunk indices fail closed',()=>withFixture({chunkGap:true},f=>{
 assert.throws(()=>execute(f),/R6_READER_CHUNKS_INVALID/);
}));
test('non-success collector receipts do not certify',()=>withFixture({invalidRun:true},f=>{
 assert.deepEqual([execute(f).bodyVerifiedKeys,execute(f).runCertifiedKeys],[1,0]);
}));
test('incorrect approved realpath rejects before SQLite open',()=>withFixture({},f=>{
 assert.throws(()=>execute(f,{approvedDbRealpath:f.file+'.unapproved'}),/R6_READER_PATH_UNVERIFIED/);
}));
test('invalid as-of date rejects before SQLite open',()=>withFixture({},f=>{
 assert.throws(()=>execute(f,{asOfDate:'2026-02-31'}),/R6_READER_DATE_INVALID/);
}));
test('source adapter never calls DB-writing path and has no provider or runner activation',()=>withFixture({},f=>{
 let called=0;
 const out=execute(f,{beforeReadOnlyOpen:()=>{called++;}});
 assert.equal(called,1);
 assert.equal(out.inputSnapshotIdentity,'CALLER_APPROVED_READONLY_SINGLE_CORE_TRANSACTION');
}));

test('path replaced immediately before SQLite open is rejected without reading substituted bytes',()=>withFixture({},f=>{
 const replacement=path.join(f.dir,'replacement.sqlite');
 fs.copyFileSync(f.file,replacement);
 assert.throws(()=>execute(f,{beforeReadOnlyOpen:()=>{fs.renameSync(replacement,f.file);}}),
  /R6_READER_SOURCE_CHANGED/);
}));
test('path switched to an approved-looking symlink before SQLite open is rejected',()=>withFixture({},f=>{
 const original=path.join(f.dir,'original.sqlite');
 fs.copyFileSync(f.file,original);
 assert.throws(()=>execute(f,{beforeReadOnlyOpen:()=>{
  fs.rmSync(f.file);fs.symlinkSync(original,f.file);
 }}),/R6_READER_SOURCE_CHANGED/);
}));

test('source-only result reports descriptor binding separately from runtime authorization',()=>withFixture({},f=>{
 const out=execute(f);
 assert.equal(out.descriptorBindingVerified,process.platform==='linux');
 assert.equal(out.runtimeAuthorizationVerified,false);
}));
test('Linux pinned descriptor reads original inode even when pathname is substituted',()=>{
 if(process.platform!=='linux')return;
 const f=fixture();
 const retained=path.join(f.dir,'retained.sqlite');
 try{
  const fd=fs.openSync(f.file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try{
   fs.renameSync(f.file,retained);
   const substitute=new DatabaseSync(f.file);
   substitute.exec('CREATE TABLE decoy (not_original TEXT)');
   substitute.close();
   const pinnedDb=new DatabaseSync('/proc/self/fd/'+fd,{readOnly:true});
   try{
    assert.ok(pinnedDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .get(EMPLOYMENT_R6_TABLES.rawSnapshot));
    assert.equal(pinnedDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='decoy'").get(),undefined);
   }finally{pinnedDb.close();}
  }finally{fs.closeSync(fd);}
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
