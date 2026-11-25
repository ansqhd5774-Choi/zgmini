import test from 'node:test';
import {createHash} from 'node:crypto';
import {verifyAndAggregateStoredR6Snapshots as verifyRaw} from '../lib/market-score/employment-r6-raw-aggregate-source-only.mjs';
import assert from 'node:assert/strict';
import {aggregateAttestedR6Snapshots as aggregate} from '../lib/market-score/employment-r6-raw-aggregate-source-only.mjs';
const allowedGroups=['BLS_CES','DOL_UI_WEEKLY_CLAIMS'];
const entry=(identity,group='BLS_CES',month='2026-11',bodyVerified=true,runCertified=true)=>({identity,group,month,bodyVerified,runCertified});
const run=entries=>aggregate({entries,allowedGroups});
test('empty source-only output is zero',()=>{const o=run([]);assert.equal(o.metadataKeys,0);assert.deepEqual(o.rawSnapshotByMonth,[]);});
test('group, month and three attestation classes agree',()=>{
 const o=run([entry('secret-a'),entry('secret-b','DOL_UI_WEEKLY_CLAIMS','2026-10',true,false),entry('secret-c','BLS_CES','UNKNOWN',false,false)]);
 assert.deepEqual([o.metadataKeys,o.bodyVerifiedKeys,o.runCertifiedKeys],[3,2,1]);
 assert.equal(o.rawSnapshotByGroup.length,2);assert.equal(o.rawSnapshotByMonth.length,3);
 assert.ok(!JSON.stringify(o).includes('secret'));
});
test('latest 12 months plus OLDER and UNKNOWN only',()=>{
 const rows=Array.from({length:16},(_,i)=>entry('key-'+i,'BLS_CES',String(2025+Math.floor(i/12))+'-'+String(i%12+1).padStart(2,'0'),true,false));
 const o=run([...rows,entry('other','BLS_CES','UNKNOWN',false,false)]);
 assert.equal(o.rawSnapshotByMonth.length,14);
 assert.deepEqual([o.rawSnapshotByMonth[12].retrievalMonth,o.rawSnapshotByMonth[12].metadataKeys],['OLDER',4]);
 assert.equal(o.rawSnapshotByMonth[13].retrievalMonth,'UNKNOWN');
 assert.equal(o.metadataKeys,17);
});
test('duplicated private identity fails closed',()=>assert.throws(()=>run([entry('same'),entry('same')]),/R6_AGG_DUPLICATE_IDENTITY/));
test('certified without body validity fails closed',()=>assert.throws(()=>run([entry('bad','BLS_CES','2026-11',false,true)]),/R6_AGG_ROW_INVALID/));
test('unapproved group fails closed',()=>assert.throws(()=>run([entry('bad','NOT_ALLOWED')]),/R6_AGG_ROW_INVALID/));
test('invalid month fails closed',()=>assert.throws(()=>run([entry('bad','BLS_CES','2026-13')]),/R6_AGG_ROW_INVALID/));
test('missing private identity fails closed',()=>assert.throws(()=>run([entry('')]),/R6_AGG_ROW_INVALID/));
test('invalid quota and excess rows fail closed',()=>{
 assert.throws(()=>aggregate({entries:[],allowedGroups:[]}),/R6_AGG_INPUT_INVALID/);
 assert.throws(()=>aggregate({entries:[],allowedGroups,maxEntries:5000}),/R6_AGG_INPUT_INVALID/);
 assert.throws(()=>aggregate({entries:[entry('a'),entry('b')],allowedGroups,maxEntries:1}),/R6_AGG_INPUT_INVALID/);
});
test('output never exposes raw input fields',()=>{
 const o=run([{...entry('private-path'),body:'sensitive',sha256:'private-hash',requestKey:'private-key'}]);
 assert.deepEqual(Object.keys(o).sort(),['schema','status','metadataKeys','bodyVerifiedKeys','runCertifiedKeys','rawSnapshotByGroup','rawSnapshotByMonth'].sort());
 assert.ok(!JSON.stringify(o).includes('private'));
});
test('4000-row boundary remains within hard cap and 4001 fails closed',()=>{
 const rows=Array.from({length:4000},(_,i)=>entry('bounded-'+i));
 const out=run(rows);
 assert.deepEqual([out.metadataKeys,out.bodyVerifiedKeys,out.runCertifiedKeys],[4000,4000,4000]);
 assert.throws(()=>run([...rows,entry('overflow')]),/R6_AGG_INPUT_INVALID/);
});
test('group and month totals are independent and deterministic',()=>{
 const rows=[entry('z','BLS_CES','2026-01',true,true),entry('a','DOL_UI_WEEKLY_CLAIMS','2026-02',true,false),entry('b','BLS_CES','2026-02',false,false)];
 const first=run(rows),second=run([...rows].reverse());
 assert.deepEqual(first,second);
 const fields=['metadataKeys','bodyVerifiedKeys','runCertifiedKeys'];
 for(const bucket of [first.rawSnapshotByGroup,first.rawSnapshotByMonth])
  for(const field of fields)assert.equal(bucket.reduce((n,row)=>n+row[field],0),first[field]);
});
test('group whitelist duplicates and malformed values are rejected',()=>{
 assert.throws(()=>aggregate({entries:[],allowedGroups:['BLS_CES','BLS_CES']}),/R6_AGG_INPUT_INVALID/);
 assert.throws(()=>aggregate({entries:[],allowedGroups:['../secret']}),/R6_AGG_INPUT_INVALID/);
 assert.throws(()=>aggregate({entries:[],allowedGroups:Array.from({length:65},(_,i)=>'G_'+i)}),/R6_AGG_INPUT_INVALID/);
});
test('private input fields are not returned in grouped projections',()=>{
 const out=run([{...entry('sensitive-id','BLS_CES','UNKNOWN'),filePath:'C:/secret',requestKey:'token',sha256:'ff'}]);
 assert.equal(out.rawSnapshotByGroup[0].releaseGroup,'BLS_CES');
 assert.equal(out.rawSnapshotByMonth[0].retrievalMonth,'UNKNOWN');
 assert.ok(!JSON.stringify(out).includes('sensitive-id'));
 assert.ok(!JSON.stringify(out).includes('C:/secret'));
 assert.ok(!JSON.stringify(out).includes('token'));
});

const sha=v=>createHash('sha256').update(v).digest('hex');
function snapshot(body='{"hello":"world"}',createdAt='2026-11-20T01:02:04.000Z'){
 const releaseGroup='BLS_CES',provider='BLS',requestKey='key-1';
 const bodySha256=sha(body),snapshotId=sha([releaseGroup,provider,requestKey,bodySha256].join('|'));
 return {releaseGroup,provider,requestKey,bodySha256,snapshotId,body,
   responseHash:bodySha256,retrievedAt:'2026-11-20T01:02:03.000Z',createdAt};
}
const attest=(snap,overrides={})=>({
 provider:'EMPLOYMENT_R6_BLS_CES',status:'SUCCESS',completedAt:'2026-11-20T01:03:00.000Z',
 rawSnapshots:[{snapshotId:snap.snapshotId,bodySha256:snap.bodySha256}],...overrides});
const verify=(snapshots,runs)=>verifyRaw({snapshots,runs,allowedGroups,asOfDate:'2026-11-25'});
test('real SHA256 matching body and successful provider Run attest one key',()=>{
 const s=snapshot(),o=verify([s],[attest(s)]);
 assert.deepEqual([o.metadataKeys,o.bodyVerifiedKeys,o.runCertifiedKeys],[1,1,1]);
 assert.ok(!JSON.stringify(o).includes(s.snapshotId));
 assert.ok(!JSON.stringify(o).includes(s.requestKey));
});
test('tampered body does not obtain body or Run certification',()=>{
 const s=snapshot(),o=verify([{...s,body:'TAMPERED'}],[attest(s)]);
 assert.deepEqual([o.metadataKeys,o.bodyVerifiedKeys,o.runCertifiedKeys],[1,0,0]);
});
test('wrong response detail hash does not become verified',()=>{
 const s=snapshot(),o=verify([{...s,responseHash:'f'.repeat(64)}],[attest(s)]);
 assert.deepEqual([o.metadataKeys,o.bodyVerifiedKeys,o.runCertifiedKeys],[1,0,0]);
});
test('Run provider mismatch, FAILED outcome and wrong body receipt are not certified',()=>{
 const s=snapshot();
 for(const r of [attest(s,{provider:'OTHER'}),attest(s,{status:'FAILED'}),
   attest(s,{rawSnapshots:[{snapshotId:s.snapshotId,bodySha256:'f'.repeat(64)}]})]){
  const o=verify([s],[r]);assert.deepEqual([o.metadataKeys,o.bodyVerifiedKeys,o.runCertifiedKeys],[1,1,0]);
 }
});
test('Run completion before retrieval is not certified',()=>{
 const s=snapshot(),r=attest(s,{completedAt:'2026-11-20T01:02:02.000Z'});
 assert.equal(verify([s],[r]).runCertifiedKeys,0);
});
test('Run completion before snapshot storage is not certified despite earlier retrieval',()=>{
 const s=snapshot(),premature=attest(s,{completedAt:'2026-11-20T01:02:03.500Z'});
 const before=verify([s],[premature]);
 assert.deepEqual([before.metadataKeys,before.bodyVerifiedKeys,before.runCertifiedKeys],[1,1,0]);
 const atStorage=attest(s,{completedAt:'2026-11-20T01:02:04.000Z'});
 assert.deepEqual([verify([s],[atStorage]).bodyVerifiedKeys,verify([s],[atStorage]).runCertifiedKeys],[1,1]);
});
test('duplicate snapshot identity and future capture reject before aggregation',()=>{
 const s=snapshot();
 assert.throws(()=>verify([s,s],[]),/R6_ATTEST_DUPLICATE_SNAPSHOT/);
 assert.throws(()=>verify([snapshot(undefined,'2026-11-26T01:02:04.000Z')],[]),/R6_ATTEST_TIME_INVALID/);
});
test('future/invalid source Run receipts fail closed',()=>{
 const s=snapshot();
 assert.throws(()=>verify([s],[attest(s,{completedAt:'2026-11-26T00:00:00.000Z'})]),/R6_ATTEST_RUN_INVALID/);
 assert.throws(()=>verify([s],[attest(s,{rawSnapshots:null})]),/R6_ATTEST_RUN_INVALID/);
});
test('wrong identity digest is only unverified, not certified',()=>{
 const s=snapshot(),o=verify([{...s,snapshotId:'0'.repeat(64)}],[attest(s)]);
 assert.deepEqual([o.metadataKeys,o.bodyVerifiedKeys,o.runCertifiedKeys],[1,0,0]);
});

test('invalid calendar day and malformed as-of fail closed',()=>{
 const s=snapshot();
 assert.throws(()=>verify([{...s,retrievedAt:'2026-02-31T01:02:03.000Z'}],[]),/R6_ATTEST_SNAPSHOT_INVALID/);
 assert.throws(()=>verifyRaw({snapshots:[s],runs:[],allowedGroups,asOfDate:'2026-02-31'}),/R6_ATTEST_INPUT_INVALID/);
 assert.throws(()=>verifyRaw({snapshots:[s],runs:[],allowedGroups,asOfDate:'not-a-date'}),/R6_ATTEST_INPUT_INVALID/);
});

test('cumulative collector Run reference work is capped at 40000',()=>{
 const s=snapshot(),items=Array.from({length:4000},()=>({snapshotId:s.snapshotId,bodySha256:s.bodySha256}));
 const runs=Array.from({length:11},()=>attest(s,{rawSnapshots:items}));
 assert.throws(()=>verify([s],runs),/R6_ATTEST_RUN_REFERENCE_CAP/);
});
