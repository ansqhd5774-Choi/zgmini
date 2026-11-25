import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {EMPLOYMENT_R6_TABLES as T} from '../lib/market-score/employment-r6-contract.mjs';
import {runnerOptionsFrom,runEmploymentR6Runner,
 projectR6RawAggregateSourceOnly} from '../scripts/pc-writer/employment-r6-runner-stage.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'w04-runner-optin-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const core=path.join(dir,'core.sqlite'),candidateDir=path.join(dir,'candidate');
 const output=path.join(dir,'out');fs.mkdirSync(candidateDir);fs.mkdirSync(output);
 const candidate=path.join(candidateDir,'EMPLOYMENT_R6_CANDIDATE.sqlite');
 const schema='(logical_series_id TEXT,geography_type TEXT,geography_code TEXT,observation_date TEXT,source_hash TEXT,value REAL,available_at TEXT,retrieved_at TEXT,provider TEXT,provider_series_id TEXT,quality_status TEXT,pit_class TEXT,provenance_json TEXT)';
 for(const file of [core,candidate]){
  const db=new DatabaseSync(file);
  for(const table of [T.observationCurrent,T.observationHistory])db.exec('CREATE TABLE '+table+schema);
  if(file===core){
   db.exec('CREATE TABLE '+T.rawSnapshot+' (snapshot_id TEXT,chunk_index INTEGER,chunk_count INTEGER,release_group TEXT,provider TEXT,request_key TEXT,retrieved_at TEXT,created_at TEXT,body_sha256 TEXT,detail_json TEXT,body_chunk TEXT)');
   db.exec('CREATE TABLE '+T.runs+' (provider TEXT,status TEXT,completed_at TEXT,detail_json TEXT)');
   const raw=db.prepare('INSERT INTO '+T.rawSnapshot+' VALUES(?,?,?,?,?,?,?,?,?,?,?)');
   const run=db.prepare('INSERT INTO '+T.runs+' VALUES(?,?,?,?)');
   for(const [group,provider] of [['BLS_EMPLOYMENT_SITUATION','BLS'],['DOL_UI_WEEKLY_CLAIMS','DOL_ETA']]){
    const body=JSON.stringify({group,payload:'private'}),digest=hash(body),key='SECRET_REQUEST_KEY_'+group;
    const id=hash([group,provider,key,digest].join('|'));
    raw.run(id,0,1,group,provider,key,'2026-11-20T02:00:00.000Z',
     '2026-11-20T02:00:01.000Z',digest,JSON.stringify({responseHash:digest}),body);
    run.run('EMPLOYMENT_R6_'+group,'SUCCESS','2026-11-20T02:00:02.000Z',
     JSON.stringify({rawSnapshots:[{snapshotId:id,bodySha256:digest}]}));
   }
  }
  db.close();
 }
 const argv=['--db',core,'--candidate-db-external',candidate,'--output-dir',output,
  '--as-of','2026-11-25'];
 return {core,candidate,output,argv};
}
test('runner raw aggregate option is mutually exclusive with PIT private modes',t=>{
 const e=fixture(t);
 const opts=runnerOptionsFrom([...e.argv,'--raw-aggregate-source-only','1']);
 assert.equal(opts.rawAggregateSourceOnly,true);
 assert.equal(runnerOptionsFrom(e.argv).rawAggregateSourceOnly,false);
 for(const suffix of [
  ['--raw-aggregate-source-only','0'],
  ['--raw-aggregate-source-only','yes'],
  ['--raw-aggregate-source-only','1','--pit0605-raw','1'],
  ['--raw-aggregate-source-only','1','--pit0408-private','1','--pit04-offset','0'],
  ['--raw-aggregate-source-only','1','--pit04-offset','24'],
  ['--raw-aggregate-source-only','1','--raw-aggregate-source-only','1'],
 ])assert.throws(()=>runnerOptionsFrom([...e.argv,...suffix]),/RUNNER_R6_ARGUMENT_NOT_ALLOWED/);
});
test('runner opt-in emits only count-only BLS/DOL report with unchanged Core/Candidate files',async t=>{
 const e=fixture(t),before=[e.core,e.candidate].map(f=>hash(fs.readFileSync(f)));
 const out=await runEmploymentR6Runner([...e.argv,'--raw-aggregate-source-only','1']);
 assert.equal(out.status,'PASS',JSON.stringify(out));
 assert.equal(out.code,'R6_RAW_AGGREGATE_SOURCE_ONLY_NOT_PIT');
 const json=fs.readFileSync(path.join(e.output,out.reportFile+'.json'),'utf8');
 const txt=fs.readFileSync(path.join(e.output,out.reportFile+'.txt'),'utf8');
 const report=JSON.parse(json);
 assert.equal(report.kind,'EMPLOYMENT_R6_RUNNER_RAW_AGGREGATE_SOURCE_ONLY_V1');
 assert.deepEqual([report.rawAggregate.metadataKeys,report.rawAggregate.bodyVerifiedKeys,
  report.rawAggregate.runCertifiedKeys],[2,2,2]);
 assert.equal(report.rawAggregate.rawSnapshotByGroup.length,2);
 assert.equal(report.rawAggregate.rawSnapshotByMonth.length,1);
 assert.equal(report.rawAggregate.historicalPitAttested,false);
 assert.equal(report.rawAggregate.runtimeAuthorizationVerified,false);
 assert.equal(report.rawAggregate.promotionApproved,false);
 assert.equal(report.promotionApproved,false);
 assert.equal(report.providerCalls,0);assert.equal(report.d1Writes,0);
 assert.doesNotMatch(json+txt,/SECRET_REQUEST_KEY|private|bodySha256|sourceHash|snapshotId|core\.sqlite|candidate\//);
 assert.deepEqual([e.core,e.candidate].map(f=>hash(fs.readFileSync(f))),before);
});
test('runner projection validates exact labels and totals; discards extra private properties',()=>{
 const base={schema:'W04_R6_SAFE_RAW_AGGREGATE_SOURCE_ONLY_V1',
  status:'SOURCE_ONLY_NOT_RUNTIME_ATTESTATION',
  metadataKeys:1,bodyVerifiedKeys:1,runCertifiedKeys:1,
  rawSnapshotByGroup:[{releaseGroup:'BLS_EMPLOYMENT_SITUATION',
   metadataKeys:1,bodyVerifiedKeys:1,runCertifiedKeys:1,private:'secret'}],
  rawSnapshotByMonth:[{retrievalMonth:'2026-11',
   metadataKeys:1,bodyVerifiedKeys:1,runCertifiedKeys:1}],
  runtimeAuthorizationVerified:false,historicalPitAttested:false,
  repairAuthorized:false,transactionOwnershipVerified:false,
  private:'secret'};
 const actual=projectR6RawAggregateSourceOnly(base);
 assert.equal(actual.rawSnapshotByGroup[0].private,undefined);
 assert.doesNotMatch(JSON.stringify(actual),/secret/);
 for(const change of [
  {metadataKeys:2},{rawSnapshotByGroup:[{...base.rawSnapshotByGroup[0],releaseGroup:'UNKNOWN'}]},
  {historicalPitAttested:true},{transactionOwnershipVerified:true},
  {rawSnapshotByMonth:[{...base.rawSnapshotByMonth[0],retrievalMonth:'2026-13'}]},
 ])assert.throws(()=>projectR6RawAggregateSourceOnly({...base,...change}),
  /RUNNER_R6_RAW_AGGREGATE_INVALID/);
});
