import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {EMPLOYMENT_R6_TABLES as T} from '../lib/market-score/employment-r6-contract.mjs';
import {auditEmploymentR6PitCoverage} from '../scripts/pc-writer/employment-r6-pit-coverage.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'w04-owner-optin-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'core.sqlite'),db=new DatabaseSync(file);
 const schema='(logical_series_id TEXT,geography_type TEXT,geography_code TEXT,observation_date TEXT,source_hash TEXT,value REAL,available_at TEXT,retrieved_at TEXT,provider TEXT,provider_series_id TEXT,quality_status TEXT,pit_class TEXT,provenance_json TEXT)';
 for(const table of [T.observationCurrent,T.observationHistory])db.exec('CREATE TABLE '+table+schema);
 db.exec('CREATE TABLE '+T.rawSnapshot+' (snapshot_id TEXT,chunk_index INTEGER,chunk_count INTEGER,release_group TEXT,provider TEXT,request_key TEXT,retrieved_at TEXT,created_at TEXT,body_sha256 TEXT,detail_json TEXT,body_chunk TEXT)');
 db.exec('CREATE TABLE '+T.runs+' (provider TEXT,status TEXT,completed_at TEXT,detail_json TEXT)');
 const putRaw=db.prepare('INSERT INTO '+T.rawSnapshot+' VALUES(?,?,?,?,?,?,?,?,?,?,?)');
 const putRun=db.prepare('INSERT INTO '+T.runs+' VALUES(?,?,?,?)');
 for(const [group,provider] of [['DOL_UI_WEEKLY_CLAIMS','DOL_ETA'],['BLS_EMPLOYMENT_SITUATION','BLS']]){
  const body=JSON.stringify({group,value:1}),bodyHash=hash(body),key='private-'+group;
  const id=hash([group,provider,key,bodyHash].join('|'));
  putRaw.run(id,0,1,group,provider,key,'2026-11-20T02:00:00.000Z',
   '2026-11-20T02:00:01.000Z',bodyHash,JSON.stringify({responseHash:bodyHash}),body);
  putRun.run('EMPLOYMENT_R6_'+group,'SUCCESS','2026-11-20T02:00:02.000Z',
   JSON.stringify({rawSnapshots:[{snapshotId:id,bodySha256:bodyHash}]}));
 }
 db.close();return file;
}
test('owner PIT core read transaction opt-in aggregates all allowed groups but default remains unchanged',t=>{
 const file=fixture(t),before=hash(fs.readFileSync(file));
 const opts={dbPath:file,asOfDate:'2026-11-25'};
 const ordinary=auditEmploymentR6PitCoverage(opts);
 assert.equal(Object.hasOwn(ordinary,'rawAggregateSourceOnly'),false);
 const extended=auditEmploymentR6PitCoverage({...opts,rawAggregateSourceOnly:true});
 const aggregate=extended.rawAggregateSourceOnly;
 assert.deepEqual([aggregate.metadataKeys,aggregate.bodyVerifiedKeys,aggregate.runCertifiedKeys],[2,2,2]);
 assert.equal(aggregate.rawSnapshotByGroup.length,2);
 assert.equal(aggregate.transactionOwnershipVerified,false);
 assert.equal(aggregate.runtimeAuthorizationVerified,false);
 assert.equal(aggregate.historicalPitAttested,false);
 assert.equal(aggregate.repairAuthorized,false);
 assert.ok(!JSON.stringify(aggregate).includes('private-'));
 const {rawAggregateSourceOnly:unused,...original}=extended;
 assert.deepEqual(original,ordinary);
 assert.equal(hash(fs.readFileSync(file)),before);
});
test('owner source opt-in requires R6 schema but normal PIT does not',t=>{
 const file=fixture(t),db=new DatabaseSync(file);
 try{db.exec('DROP TABLE '+T.rawSnapshot);}finally{db.close();}
 const opts={dbPath:file,asOfDate:'2026-11-25'};
 assert.equal(Object.hasOwn(auditEmploymentR6PitCoverage(opts),'rawAggregateSourceOnly'),false);
 assert.throws(()=>auditEmploymentR6PitCoverage({...opts,rawAggregateSourceOnly:true}),
  /R6_OPEN_SNAPSHOT_SCHEMA_UNAVAILABLE/);
 assert.throws(()=>auditEmploymentR6PitCoverage({...opts,rawAggregateSourceOnly:'1'}),
  /PIT_AUDIT_RAW_AGGREGATE_SCOPE_INVALID/);
});
