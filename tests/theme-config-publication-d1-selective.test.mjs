import test from 'node:test';
import assert from 'node:assert/strict';
import {publishPreparedConfiguredThemeD1} from '../scripts/pc-writer/theme-config-publication-d1.mjs';

const now=Date.parse('2026-10-29T04:00:00Z'),key='theme-configured:fixture-safe';
const point=(date,score)=>({date,score,status:'R188_COMPATIBLE',weights:{
 first:.5,second:.5,firstEffectiveSessions:377,secondEffectiveSessions:377,
 method:'R3_APPROVED_BOTH_R188_COMPATIBLE_50_50'}});
const candidate={version:'ZGMINI_CONFIGURED_THEME_PUBLIC_V1',status:'READY',
 themeId:'fixture-safe',theme:'Fixture 안전',etfs:['AAA','BBB'],benchmark:'SPY',
 methodologyVersion:'ADAPTIVE_R2_PAIR_R3',
 definitionSha256:'a'.repeat(64),candidateSha256:'b'.repeat(64),
 approvalSha256:'c'.repeat(64),sourceVersion:'GMH_MANIFEST_SHA256_'+'d'.repeat(64),
 sourceStoredAt:'2026-10-29T02:00:00.000Z',observationDate:'2026-10-28',
 score:51,history:[point('2026-10-27',50),point('2026-10-28',51)],
 derivedOnlyNoRaw:true,publicationAuthorized:true,
 publicationAuthorizationBasis:'LOCAL_OPERATOR_ATTESTATION_NOT_INDEPENDENT_LEGAL_VERIFICATION'};
const prepared=(c=candidate)=>({version:'ZGMINI_CONFIGURED_PUBLICATION_PREFLIGHT_V1',
 status:'PREFLIGHT_PASS_NO_REMOTE_ACCESS',stage:'LOCAL_PREPARATION_COMPLETE',
 providerCalls:0,d1Queries:0,d1Writes:0,schedulerWrites:0,
 publicationExecuted:false,feedKey:key,definitionSha256:c.definitionSha256,
 candidateSha256:c.candidateSha256,approvalSha256:c.approvalSha256,
 observationDate:c.observationDate,sourceStoredAt:c.sourceStoredAt,candidate:c});

function fakeD1(initial=null,{lostAck=false,failBeforeWrite=false}={}){
 let row=initial?{body:JSON.stringify(initial),stored_at:now-1000}:null;
 const calls=[];
 return {calls,get row(){return row;},async query(sql,params,{write=false}={}){
  calls.push({sql,params,write});
  assert.match(sql,/public_feed_snapshots_v1/);
  if(!write){
   assert.equal(params[0],key);
   return {results:row?[row]:[]};
  }
  if(failBeforeWrite)throw Error('502');
  if(sql.startsWith('INSERT')){
   if(row)return {meta:{changes:0}};
   assert.equal(params[0],key);
   row={body:params[1],stored_at:params[2]};
  }else{
   assert.equal(params[2],key);
   if(!row||row.stored_at!==params[3]||row.body!==params[4])
    return {meta:{changes:0}};
   row={body:params[0],stored_at:params[1]};
  }
  if(lostAck)throw Error('timeout after commit');
  return {meta:{changes:1}};
 }};
}
const run=(db,p=prepared(),stamp=null)=>publishPreparedConfiguredThemeD1({
 query:db.query,preflight:p,now,expectedStoredAt:stamp});

test('approved derived-only candidate inserts isolated key and exact readback',async()=>{
 const db=fakeD1(),result=await run(db);
 assert.equal(result.status,'WRITTEN_AND_READBACK_VERIFIED');
 assert.equal(result.key,key);assert.equal(result.written,1);
 assert.equal(db.calls.filter(c=>c.write).length,1);
 const record=JSON.parse(db.row.body);
 assert.equal(record.publicationAuthorized,true);
 assert.equal(record.observationDate,'2026-10-28');
 assert.equal(record.publishedAt,'2026-10-29T04:00:00.000Z');
 assert.equal(db.row.body.includes('"close"'),false);
});
test('preflight missing, changed scope or future observation never queries D1',async()=>{
 for(const p of [null,{...prepared(),status:'PREFLIGHT_BLOCKED'},
  prepared({...candidate,publicationAuthorized:false}),
  prepared({...candidate,observationDate:'2026-10-30'})]){
  const db=fakeD1();
  await assert.rejects(run(db,p),/PREFLIGHT_REQUIRED|CANDIDATE_CONTRACT|SOURCE_STALE_OR_FUTURE/);
  assert.equal(db.calls.length,0);
 }
});
test('same-date exact record is idempotent without fresh timestamp',async()=>{
 const original={...candidate,publishedAt:'2026-10-28T10:00:00.000Z'};
 const db=fakeD1(original);
 const result=await run(db,prepared(),now-1000);
 assert.equal(result.status,'UNCHANGED');
 assert.equal(result.written,0);
 assert.equal(db.calls.filter(c=>c.write).length,0);
});
test('same-date changed score, older source or different identity is denied',async()=>{
 const db=fakeD1({...candidate,publishedAt:'2026-10-28T10:00:00.000Z'});
 const changes=[
  {...candidate,score:52,history:[point('2026-10-27',50),point('2026-10-28',52)]},
  {...candidate,observationDate:'2026-10-27',score:50,history:[point('2026-10-27',50)]},
  {...candidate,definitionSha256:'f'.repeat(64)}
 ];
 for(const c of changes)
  await assert.rejects(run(db,prepared(c),now-1000),
   /D1_PRIOR_HISTORY_IMMUTABLE|D1_SAME_DATE_REWRITE_DENIED|D1_EXISTING_IDENTITY_OR_NEWER_PRESERVED/);
 assert.equal(db.calls.filter(c=>c.write).length,0);
});
test('new session CAS update retains every overlapping prior score',async()=>{
 const old={...candidate,observationDate:'2026-10-27',score:50,
  history:[point('2026-10-27',50)],publishedAt:'2026-10-28T10:00:00.000Z'};
 const db=fakeD1(old);
 const result=await run(db,prepared(),now-1000);
 assert.equal(result.status,'WRITTEN_AND_READBACK_VERIFIED');
 assert.equal(db.calls.filter(c=>c.write).length,1);
 assert.equal(JSON.parse(db.row.body).history.length,2);
});
test('CAS mismatch forbids mutations',async()=>{
 const db=fakeD1(candidate);
 await assert.rejects(run(db,prepared(),now-3),/D1_CAS_EXPECTED_STAMP/);
 assert.equal(db.calls.filter(c=>c.write).length,0);
});
test('unknown POST outcome readback recognizes committed value without retry',async()=>{
 const db=fakeD1(null,{lostAck:true});
 const result=await run(db);
 assert.equal(result.status,'WRITTEN_AND_READBACK_VERIFIED');
 assert.equal(db.calls.filter(c=>c.write).length,1);
});
test('502 before commit preserves D1 state and never retries write',async()=>{
 const db=fakeD1(null,{failBeforeWrite:true});
 await assert.rejects(run(db),/D1_WRITE_OUTCOME_UNKNOWN/);
 assert.equal(db.row,null);
 assert.equal(db.calls.filter(c=>c.write).length,1);
});
