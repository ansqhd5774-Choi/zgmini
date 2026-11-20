import test from 'node:test';
import assert from 'node:assert/strict';
import {
 approvedGmhSevenR178Storage,runApprovedGmhSevenR178FromPcWriter
} from '../scripts/pc-writer/theme-seven-gmh-r178-approved-writer-entry.mjs';
import {R32_KEY}
 from '../scripts/pc-writer/theme-seven-gmh-r178-authorized-cas.mjs';
import {THEME_ETF_ROLLING_KEY}
 from '../worker/theme-etf-rolling-public.mjs';
import {THEME_ETF_ONLY_PUBLIC_KEY}
 from '../worker/theme-etf-only-public.mjs';

const CORE='a'.repeat(36);
const OLD=1794450000000;
const NEW=OLD+1000;
const old={status:'READY',version:'THEME_ETF_ROLLING_R178'};
const r32={status:'READY',version:'THEME_LEGACY_NINE_R37_PUBLIC_V1'};
const seed={status:'READY',version:'THEME_ETF_ONLY_R144_252_PUBLIC_V1'};

function fixture({changes=1,breakReadback=false,throwWrite=false}={}){
 let reads=0,writes=0;
 const state={body:JSON.stringify(old),stored_at:OLD};
 const client={
  async query(db,sql,params){
   assert.equal(db,CORE);
   assert.match(sql,/^SELECT body,stored_at FROM /);
   reads++;
   if(sql.includes('market_public_snapshots_v1')){
    assert.deepEqual(params,[THEME_ETF_ONLY_PUBLIC_KEY]);
    return {results:[{body:JSON.stringify(seed),stored_at:OLD}]};
   }
   assert.match(sql,/kind='output'/);
   if(params[0]===R32_KEY)return {results:[{
    body:JSON.stringify(r32),stored_at:OLD
   }]};
   assert.equal(params[0],THEME_ETF_ROLLING_KEY);
   return {results:[breakReadback&&writes?{...state,body:'{}'}:{...state}]};
  },
  async request(db,batch){
   assert.equal(db,CORE);
   assert.equal(batch.length,1);
   assert.match(batch[0].sql,/^UPDATE public_feed_snapshots_v1 SET body=\?,stored_at=\?/);
   const [body,stamp,key,prior]=batch[0].params;
   assert.equal(key,THEME_ETF_ROLLING_KEY);
   assert.equal(prior,OLD);
   assert.equal(stamp,NEW);
   writes++;
   if(throwWrite)throw Error('D1_TRANSPORT_UNKNOWN');
   if(changes===1){state.body=body;state.stored_at=stamp;}
   return [{meta:{changes}}];
  }
 };
 return {client,stats:()=>({reads,writes})};
}

test('approved Writer reuses existing D1 read APIs for exact seed/R178/R32 keys',async()=>{
 const f=fixture(),storage=approvedGmhSevenR178Storage({
  writerClient:f.client,coreDb:CORE,clock:()=>NEW
 });
 assert.deepEqual(await storage.readSeed(),seed);
 assert.deepEqual(await storage.read(THEME_ETF_ROLLING_KEY),
  {body:old,storedAt:OLD});
 assert.deepEqual(await storage.read(R32_KEY),{body:r32,storedAt:OLD});
 await assert.rejects(storage.read('another-feed'),
  {code:'W03_GMH_WRITER_D1_READ_KEY_DENIED'});
 assert.deepEqual(f.stats(),{reads:3,writes:0});
});

test('single R178 stored_at CAS and exact body readback; R32 remains untouched',async()=>{
 const f=fixture(),storage=approvedGmhSevenR178Storage({
  writerClient:f.client,coreDb:CORE,clock:()=>NEW
 });
 const record={status:'READY',version:'THEME_ETF_ROLLING_R178',score:40};
 assert.deepEqual(await storage.replace(THEME_ETF_ROLLING_KEY,record,OLD),
  {storedAt:NEW});
 assert.deepEqual(await storage.read(THEME_ETF_ROLLING_KEY),
  {body:record,storedAt:NEW});
 assert.deepEqual(await storage.read(R32_KEY),
  {body:r32,storedAt:OLD});
 assert.equal(f.stats().writes,1);
});

test('unknown effect or CAS collision never retries a D1 write',async()=>{
 for(const opts of [
  {changes:0,code:'W03_GMH_WRITER_D1_CAS_NOT_APPLIED_NO_RETRY'},
  {throwWrite:true,code:'W03_GMH_WRITER_D1_CAS_OUTCOME_UNKNOWN_NO_RETRY'},
  {breakReadback:true,code:'W03_GMH_WRITER_D1_CAS_READBACK_MISMATCH_NO_RETRY'}
 ]){
  const f=fixture(opts),storage=approvedGmhSevenR178Storage({
   writerClient:f.client,coreDb:CORE,clock:()=>NEW
  });
  await assert.rejects(storage.replace(THEME_ETF_ROLLING_KEY,old,OLD),
   {code:opts.code});
  assert.equal(f.stats().writes,1);
 }
});

test('R32/seed writes, stale CAS preimage, and clock regression are forbidden',async()=>{
 const f=fixture(),storage=approvedGmhSevenR178Storage({
  writerClient:f.client,coreDb:CORE,clock:()=>OLD
 });
 await assert.rejects(storage.replace(R32_KEY,r32,OLD),
  {code:'W03_GMH_WRITER_D1_CAS_SCOPE_DENIED'});
 await assert.rejects(storage.replace(THEME_ETF_ROLLING_KEY,old,OLD),
  {code:'W03_GMH_WRITER_D1_CAS_CLOCK_REGRESSION'});
 await assert.rejects(storage.replace(THEME_ETF_ROLLING_KEY,old,0),
  {code:'W03_GMH_WRITER_D1_CAS_SCOPE_DENIED'});
 assert.equal(f.stats().writes,0);
});

test('no external approved record/verifier: stop before source files or D1 access',async()=>{
 const f=fixture();let savedReads=0;
 await assert.rejects(runApprovedGmhSevenR178FromPcWriter({
  dataRoot:'/synthetic',writerClient:f.client,coreDb:CORE,
  approvedRecord:{status:'READY'},readSaved:()=>{
   savedReads++;throw Error('SHOULD_NOT_READ');
  }
 }),{code:'W03_GMH_WRITER_APPROVAL_CONTEXT_REQUIRED'});
 assert.equal(savedReads,0);
 assert.deepEqual(f.stats(),{reads:0,writes:0});
});

test('authorized host enters SHA-pinned loader; synthetic source cannot reach D1',async()=>{
 const f=fixture();let reads=0;
 await assert.rejects(runApprovedGmhSevenR178FromPcWriter({
  dataRoot:'/synthetic',writerClient:f.client,coreDb:CORE,
  approvedRecord:{status:'READY'},verifyApprovedEffect:async()=>true,
  readSaved:()=>{reads++;return {manifestSha256:'0'.repeat(64),
   checkpointSha256:'1'.repeat(64)};},
  readPrivate:()=>{throw Error('MUST_NOT_READ_PRIVATE');}
 }),{code:'W03_GMH_R178_ONCE_SAVED_MANIFEST_CHECKPOINT_PIN_STOP'});
 assert.equal(reads,1);
 assert.deepEqual(f.stats(),{reads:0,writes:0});
});
