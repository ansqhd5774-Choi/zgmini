import test from 'node:test';
import assert from 'node:assert/strict';
import {configuredDependencyClosure} from '../scripts/pc-writer/theme-config-install.mjs';
import {R32,identity} from '../scripts/pc-writer/theme-platform.mjs';
import {R51_APPROVED_ROSTER} from '../scripts/pc-writer/theme-nine-r51-provisional-overlay.mjs';
import {PAIR50,SPACE_R32,loadOperationalSources,buildOperationalRegistry,
 planOperationalBatch,planPhysicalFeeds,runOperationalPrivateBatch} from
 '../scripts/pc-writer/theme-platform-operational.mjs';

const sha='e'.repeat(64);
const registered=i=>({sha256:sha,internalId:`registered-custom-${i}`,
 definition:{schema:'ZGMINI_THEME_CONFIG_V2',id:`custom-${i}`,label:`신규 테마 ${i}`,
  etfs:['AAA','BBB'],benchmark:'SPY',profile:R32,
  selectionEvidence:{sha256:sha}}});
const fakeStore=()=>{let state;return {
 load:async()=>structuredClone(state),
 save:async(_,next,prior)=>{assert.equal(prior,state?.revision??0);state=structuredClone(next);},
};};
const mockExistingAdapters=()=>Object.fromEntries(['source','calculate','validate'].map(stage=>
 [stage,async({theme,completed})=>({status:'VERIFIED',artifactSha256:identity({stage,theme}),
  methodologyVersion:theme.methodologyVersion,definitionSha256:identity(theme),
  calculationSha256:completed.calculate?.artifactSha256})]));

test('one public registry identifies exact 10, excludes research-only AI and keeps mixed formulas',()=>{
 const p=planOperationalBatch();
 assert.equal(p.status,'PRIVATE_BINDINGS_PLANNED_NOT_EXECUTED');
 assert.deepEqual(p.publicTargetIds,['robotics','cloud-saas','autonomous-driving',
  'nuclear-smr','defense','fintech','cybersecurity','biotech',
  'data-center-power','space-satellite']);
 assert.equal(p.publicTargetIds.includes('ai-semiconductor'),false);
 assert.equal(p.registry.themes[0].methodologyVersion,R32);
 assert.equal(p.registry.themes[8].methodologyVersion,PAIR50);
 assert.equal(p.registry.themes[9].methodologyVersion,SPACE_R32);
 for(const row of p.registry.themes.slice(0,8)){
  assert.deepEqual(row.etfs,R51_APPROVED_ROSTER.find(r=>r.theme===row.label)?.etfs);
 }
 assert.equal(p.providerCalls,0);assert.equal(p.d1Writes,0);
});

test('8 logical R37/R88 themes keep 1 shared physical feed per phase',()=>{
 const p=planOperationalBatch(),groups=planPhysicalFeeds(p.registry);
 assert.equal(groups.length,6);
 assert.deepEqual(groups.find(g=>g.feedKey==='theme-legacy-nine-r37').themeIds,
  p.publicTargetIds.slice(0,8));
 assert.deepEqual(groups.find(g=>g.feedKey==='theme-nine-r32-provisional-r88').themeIds,
  p.publicTargetIds.slice(0,8));
 assert.equal(new Set(p.registry.themes.flatMap(t=>Object.values(t.publication))).size,20);
 assert.ok(p.uniqueStoredInputPlans>0);
});

test('dynamic 164 additions use same registry and never gain public publication rights',()=>{
 const p=planOperationalBatch({registrations:Array.from({length:164},(_,i)=>registered(i))});
 assert.equal(p.registry.themes.length,174);
 assert.equal(p.publicTargetIds.length,10);
 assert.equal(p.privateRegisteredIds.length,164);
 assert.equal(p.feedGroups.length,6+164*2);
 assert.equal(p.registry.themes[10].operational.owner,'configured-existing');
});

test('legacy collision or data-center methodology drift fails closed',()=>{
 const sources=loadOperationalSources();
 assert.throws(()=>buildOperationalRegistry({sources,registrations:[{
  ...registered(0),definition:{...registered(0).definition,id:'robotics'}
 }]}),/THEME_ID_DUPLICATE_OR_INVALID/);
 const altered=structuredClone(sources);
 altered.bindings.families['data-center'].methodologyVersion=R32;
 assert.throws(()=>buildOperationalRegistry({sources:altered}),/THEME_OPERATIONAL_METHOD_BINDING_DRIFT/);
});

test('common batch genuinely traverses all 10 with injected stored proofs, no publishing',async()=>{
 let writes=0;
 const adapters={...mockExistingAdapters(),publish:async()=>{writes++;throw Error('WRITE');}};
 const first=await runOperationalPrivateBatch({adapters,store:fakeStore(),runKey:'stage2-fixture'});
 assert.equal(first.status,'COMPLETE');assert.equal(first.executed,10*2*3);
 assert.equal(first.results.length,20);assert.equal(first.physicalFeedGroups,6);
 assert.equal(writes,0);assert.equal(first.providerCalls,'REQUIRES_ADAPTER_METERING');
 assert.equal(first.d1Writes,'NOT_REQUESTED_BY_PLATFORM');
});

test('source connector requires real stored proof handlers; no implicit mock adapter',async()=>{
 await assert.rejects(runOperationalPrivateBatch({runKey:'missing',store:fakeStore()}),
  /THEME_OPERATIONAL_STORED_ADAPTERS_REQUIRED/);
});

test('existing package includes central source and operational bindings without new task',()=>{
 const files=configuredDependencyClosure(['scripts/pc-writer/theme-config-tool.mjs',
  'config/theme-public-operational-bindings.json']);
 assert.ok(files.includes('scripts/pc-writer/theme-platform-operational.mjs'));
 assert.ok(files.includes('config/theme-public-operational-bindings.json'));
});
