import test from 'node:test';
import assert from 'node:assert/strict';
import {R24_V2_APPROVED_PC_SOURCE,runR24V2} from '../scripts/pc-writer/market-calendar-r24-usda-apply-v2.mjs';

const scan=()=>({
 decision:'R24_SOURCE_DRIFT_READONLY_COMPLETE',
 observedHead:R24_V2_APPROVED_PC_SOURCE,
 configSource:R24_V2_APPROVED_PC_SOURCE,
 configSourceMatchesHead:true,configEnabled:true,collectionTarget:'pc',
 worktreeId:'d0a4b3cb8b95',r23ObjectAvailable:true,r23IsAncestor:true,
 protectedTrackedDirty:false,cycleLockPresent:false,
 installedFileSha256:{
  'lib/release-calendar.mjs':'cf94658ade12f83326c5f9403e4303150f7f0b3d771ab25bf7d65bf8d9313de5',
  'lib/eia-calendar.mjs':'6099a1fb912077b2627369b8428a600f613004b2facdb16b262a8ea5b3f65e90',
  'scripts/pc-writer/release-calendar.mjs':'b684ab2495b5f25fa604276694111be48df6861d8aaf5b86f75ee3593973a007',
  'lib/usda-calendar.mjs':null,
 },
 protectedFilesChangedSinceR23:[
  'lib/market-score/sec-earnings-e1-r4-provider.mjs',
  'scripts/pc-writer/collect-local.mjs',
  'scripts/pc-writer/collection-events.mjs',
  'scripts/pc-writer/local-data-alert.mjs',
  'worker/market-operational-refresh.mjs',
 ],
});

test('R24 V2 recognizes exact new PC source and five unrelated retained changes',()=>{
 let call=null;
 const result=runR24V2({apply:false,diagnose:scan,install:args=>{
  call=args;return {decision:'R24_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE',newSource:null};
 }});
 assert.deepEqual(call,{apply:false,approvedSource:R24_V2_APPROVED_PC_SOURCE});
 assert.equal(result.decision,'R24_USDA_V2_PREFLIGHT_READY_NO_CHANGES_MADE');
 assert.equal(result.sourceLineageVerified,true);
 assert.equal(result.preservedUnrelatedFiles,5);
});

test('R24 V2 never invokes installer for changed source, config, ancestry, target files or unrelated file diff',()=>{
 const mutations=[
  s=>{s.observedHead='0'.repeat(40);},
  s=>{s.configSource='0'.repeat(40);},
  s=>{s.r23IsAncestor=false;},
  s=>{s.installedFileSha256['lib/release-calendar.mjs']='0'.repeat(64);},
  s=>{s.installedFileSha256['lib/eia-calendar.mjs']='0'.repeat(64);},
  s=>{s.installedFileSha256['lib/usda-calendar.mjs']='extra module';},
  s=>{s.protectedFilesChangedSinceR23.push('scripts/pc-writer/release-calendar.mjs');},
  s=>{s.protectedTrackedDirty=true;},
  s=>{s.cycleLockPresent=true;},
 ];
 for(const mutate of mutations){
  const value=scan();mutate(value);
  const result=runR24V2({apply:true,diagnose:()=>value,
   install:()=>{throw Error('MUST_NOT_INSTALL');}});
  assert.equal(result.decision,'R24_V2_SOURCE_RECHECK_STOP');
  assert.equal(result.newSource,null);
  assert.equal(result.backupCreated,false);
 }
});

test('R24 V2 propagates underlying failed source preflight without inventing install success',()=>{
 const result=runR24V2({apply:true,diagnose:scan,install:()=>({
  decision:'PC_SOURCE_CHANGED_STOP',changedFiles:[],backupCreated:false,newSource:null,
 })});
 assert.equal(result.decision,'PC_SOURCE_CHANGED_STOP');
 assert.equal(result.baseInstallerDecision,'PC_SOURCE_CHANGED_STOP');
 assert.equal(result.newSource,null);
});

test('R24 V2 names verified installation only on underlying three-file success',()=>{
 const result=runR24V2({apply:true,diagnose:scan,install:()=>({
  decision:'R24_USDA_CALENDAR_INSTALLED_NO_FORCED_COLLECTION',phase:'INSTALLED',
  changedFiles:['lib/release-calendar.mjs','lib/usda-calendar.mjs','scripts/pc-writer/release-calendar.mjs'],
  backupCreated:true,forcedCollection:false,gitPushed:false,publisherExecuted:false,
  newSource:'2'.repeat(40),
 })});
 assert.equal(result.decision,'R24_USDA_V2_INSTALLED_NO_FORCED_COLLECTION');
 assert.equal(result.phase,'INSTALLED');
 assert.equal(result.changedFiles.length,3);
 assert.equal(result.preservedUnrelatedFiles,5);
});
