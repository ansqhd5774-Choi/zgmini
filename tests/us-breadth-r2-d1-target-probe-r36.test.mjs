import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runUsBreadthD1TargetProbeR36} from '../scripts/pc-writer/us-breadth-r2-d1-target-probe-r36.mjs';

const table='market_public_snapshots_v1';
const createRemote=({coreTable=true,historyTable=false,failHistory=false,existingKey=false}={})=>{
 const calls=[];
 const remote={stats:{transportFailures:[]},
  async query(db,sql,params){
   calls.push({db,sql,params});
   assert.match(sql,/^SELECT /);
   if(failHistory&&db==='history'){
    remote.stats.transportFailures.push({phase:'HTTP',httpStatus:403,
      providerCodes:[10000],authType:'OAUTH',authRefresh:'NOT_NEEDED'});
    throw Error('D1_HTTP_403');
   }
   if(sql.includes('sqlite_master'))return {results:(db==='core'?coreTable:historyTable)?[{name:table}]:[]};
   assert.equal(db,'core');
   return {results:existingKey?[{body:'{private}',stored_at:1}]:[]};
  },
  async request(){throw Error('R36 must never write');}};
 return {remote,calls};
};

test('R36 identifies core-only public table and absent R2 key without any writes',async()=>{
 const {remote,calls}=createRemote();
 const result=await runUsBreadthD1TargetProbeR36({pcHome:'fixture',
  openD1:async()=>({remote,coreDatabase:'core',historyDatabase:'history'})});
 assert.equal(result.status,'CORE_PUBLIC_TABLE_ONLY');
 assert.deepEqual(result.roles.core,{status:'READ_OK',publicSnapshotTablePresent:true});
 assert.deepEqual(result.roles.history,{status:'READ_OK',publicSnapshotTablePresent:false});
 assert.equal(result.existingR2HistoryKey,'ABSENT');
 assert.equal(result.providerCalls,0);
 assert.equal(result.d1Writes,0);
 assert.equal(result.coreTaskChanges,0);
 assert.equal(calls.length,3);
 assert.equal(JSON.stringify(result).includes('fixture'),false);
});

test('R36 distinguishes permission/transport failures without leaking secrets or IDs',async()=>{
 const {remote,calls}=createRemote({failHistory:true,existingKey:true});
 const result=await runUsBreadthD1TargetProbeR36({pcHome:'fixture',
  openD1:async()=>({remote,coreDatabase:'core',historyDatabase:'history'})});
 assert.equal(result.status,'D1_ROLE_READ_FAILURE');
 assert.equal(result.existingR2HistoryKey,'EXISTS_DO_NOT_OVERWRITE');
 assert.equal(result.roles.history.code,'D1_HTTP_403');
 assert.equal(result.roles.history.httpStatus,403);
 assert.equal(result.d1Writes,0);
 assert.equal(calls.length,3);
 assert.equal(JSON.stringify(result).includes('{private}'),false);
});

test('R36 blocks broad recovery on unknown config or ambiguous table placement',async()=>{
 const missing=await runUsBreadthD1TargetProbeR36({pcHome:'fixture',
  openD1:async()=>{throw Error('private-token');}});
 assert.equal(missing.status,'R36_PC_CONFIG_OR_D1_CLIENT_UNAVAILABLE');
 assert.equal(JSON.stringify(missing).includes('private-token'),false);
 const {remote,calls}=createRemote({coreTable:true,historyTable:true});
 const ambiguous=await runUsBreadthD1TargetProbeR36({pcHome:'fixture',
  openD1:async()=>({remote,coreDatabase:'core',historyDatabase:'history'})});
 assert.equal(ambiguous.status,'BOTH_ROLES_HAVE_PUBLIC_TABLE_REVIEW_REQUIRED');
 assert.equal(calls.length,3);
});

test('R36 portable Windows launcher uses approved E: Node and Downloads only',()=>{
 const bytes=fs.readFileSync(new URL('../tools/us-market-breadth-r1/US_BREADTH_R36_D1_TARGET_READONLY.cmd',import.meta.url));
 assert.equal(bytes.every(x=>x<128),true);
 const cmd=bytes.toString('ascii');
 assert.equal(cmd.replaceAll('\r\n','').includes('\n'),false);
 assert.match(cmd,/E:\\ZGmini\\runtime\\node\.exe/);
 assert.match(cmd,/--probe-only/);
 assert.match(cmd,/USERPROFILE%\\Downloads/);
 assert.match(cmd,/D1_WRITES=0/);
 assert.doesNotMatch(cmd,/--publish-approved|--allow-d1-final-write|schtasks|wrangler deploy/i);
});
