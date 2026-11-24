// Offline W05 seed-fallback regression: no network, D1, provider or PC paths.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hasCompleteLocalSeed,publishW05WithIncompleteSeed}
 from '../scripts/pc-writer/w05-seed-fallback-r1.mjs';
import {W05_SAVED_IDS} from '../scripts/pc-writer/w05-stored-sidecar-publication-r1.mjs';

const NOW=Date.parse('2026-11-24T10:00:00Z');

test('full-market seed completeness is unchanged; unrelated incomplete history is not silently approved',()=>{
 assert.equal(hasCompleteLocalSeed({}),false);
 assert.equal(hasCompleteLocalSeed(null),false);
 assert.equal(hasCompleteLocalSeed({'core:market_public_snapshots_v1':{complete:true}}),true);
 assert.equal(hasCompleteLocalSeed({
  'core:market_public_snapshots_v1':{complete:true},
  'history:kfg_rev7_kospi_rows':{complete:false},
 }),false);
 assert.equal(hasCompleteLocalSeed({
  'core:market_public_snapshots_v1':{complete:true},
  'history:kfg_rev7_kospi_rows':{complete:true},
 }),true);
});

test('W05 fallback uses only its three independent keys and preserves failure evidence',async()=>{
 const called=[],report={};
 const output=await publishW05WithIncompleteSeed({
  report,pcHome:'/never-opened',remote:{},coreDb:'core',now:NOW,
  publishOne:async ({id,pcHome,coreDb,now,remote})=>{
   assert.equal(pcHome,'/never-opened');
   assert.equal(coreDb,'core');assert.equal(now,NOW);assert.ok(remote);
   called.push(id);
   if(id==='qfr')throw Error('W05_TEST_REJECTION');
   return {status:'ALREADY_STORED',historyParityVerified:true,
    providerCalls:0,sqliteWrites:0,d1Writes:0};
  },
 });
 assert.deepEqual(called,W05_SAVED_IDS);
 assert.deepEqual(Object.keys(output),['wpsfd42','bea']);
 assert.equal(output.wpsfd42.historyParityVerified,true);
 assert.equal(output.bea.d1Writes,0);
 assert.deepEqual(report.failures,[{id:'w05-saved-sidecar:qfr',reason:'W05_TEST_REJECTION'}]);
 assert.equal(report.writerStageTiming.samples,3);
});

test('missing saved W05 inputs remain SKIPPED and never become false verified records',async()=>{
 const report={};
 const output=await publishW05WithIncompleteSeed({
  report,pcHome:'/absent',remote:{},coreDb:'core',now:NOW,
  publishOne:async()=>({status:'SKIPPED_SOURCE_NOT_STORED',
   providerCalls:0,sqliteWrites:0,d1Writes:0}),
 });
 assert.equal(Object.keys(output).length,3);
 assert.ok(Object.values(output).every(item=>item.status==='SKIPPED_SOURCE_NOT_STORED'));
 assert.equal(report.failures,undefined);
});

test('source keeps global market/Korea guard, runtime auth, recovery and incomplete-cycle exit',()=>{
 const src=fs.readFileSync(new URL('../scripts/pc-writer/run-local.mjs',import.meta.url),'utf8');
 const guard=src.indexOf('if(!hasCompleteLocalSeed(seed))');
 const db=src.indexOf("const core=localDatabase(path.join(base,'storage','core.sqlite'))");
 assert.ok(guard>0&&db>guard);
 assert.match(src,/if\(!publish\|\|!W05_SAVED_SIDECARS_AUTO_PUBLICATION_APPROVED\)/);
 assert.match(src,/report\.recovery=await recoverPublication\(remote,config\.core,base\)/);
 assert.match(src,/await publishW05WithIncompleteSeed\(/);
 assert.match(src,/process\.exitCode=1;\s*\}else\{\s*const core=localDatabase/);
 assert.match(src,/report\.status=verified\?'VERIFIED_WITH_GAPS':'FAILED'/);
 assert.match(src,/globalThis\.fetch=async\(\)=>\{report\.providerCalls\+\+;throw Error\('W05_PROVIDER_NETWORK_FORBIDDEN'\)/);
 assert.match(src,/publicationCompatibility\(root,config\.source,source,main\)/);
 assert.doesNotMatch(src,/spawnSync\([^\n]*w05-seed-fallback/);
});
