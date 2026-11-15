import test from 'node:test';
import assert from 'node:assert/strict';
import {
 loadOperationalSources,buildOperationalRegistry,planOperationalBatch,
 planPhysicalFeeds,runOperationalPrivateBatch
} from '../scripts/pc-writer/theme-platform-operational.mjs';
import {identity,sourcePlan} from '../scripts/pc-writer/theme-platform.mjs';

test('ten inherited themes resolve to six existing physical feeds without new publication authority',()=>{
 const sources=loadOperationalSources();
 assert.equal(sources.bindings.publicationAuthority,'EXISTING_WRITERS_ONLY_NO_CUTOVER');
 assert.equal(sources.candidates.policy.productionOperations,'NO_CHANGE');
 assert.equal(sources.candidates.approvalScope,'RESEARCH_CANDIDATE_ROSTER_ONLY');
 const plan=planOperationalBatch({sources});
 assert.equal(plan.status,'PRIVATE_BINDINGS_PLANNED_NOT_EXECUTED');
 assert.equal(plan.registry.themes.length,10);
 assert.equal(plan.publicTargetIds.length,10);
 assert.equal(plan.privateRegisteredIds.length,0);
 assert.equal(plan.feedGroups.length,6);
 assert.equal(plan.providerCalls,0);
 assert.equal(plan.d1Writes,0);
 assert.equal(plan.schedulerWrites,0);
 assert.equal(planPhysicalFeeds(plan.registry).length,6);
 assert.equal(plan.feedGroups.filter(x=>x.themeIds.length===8).length,2);
 assert.ok(plan.uniqueStoredInputPlans>0);
 assert.equal(plan.uniqueStoredInputPlans,sourcePlan(plan.registry).length);
 for(const theme of plan.registry.themes){
  assert.equal(theme.operational.owner,'existing-writer');
  assert.equal(theme.operational.evidenceScope,
   'EXISTING_INPUT_PROVENANCE_NOT_PUBLICATION_GRANT');
 }
});

test('common private execution reuses existing ten-theme registry and only verifies injected saved proof',async()=>{
 const source=loadOperationalSources();
 const states=new Map();
 const store={
  load:async key=>structuredClone(states.get(key)??null),
  save:async(key,next,revision)=>{
   assert.equal(states.get(key)?.revision??0,revision);
   states.set(key,structuredClone(next));
  }
 };
 const stage=async({theme,stage,completed})=>({
  status:'VERIFIED',artifactSha256:identity({theme:theme.id,stage}),
  methodologyVersion:theme.methodologyVersion,
  definitionSha256:identity(theme),
  calculationSha256:completed.calculate?.artifactSha256
 });
 const adapters={source:stage,calculate:stage,validate:stage};
 const result=await runOperationalPrivateBatch({
  sources:source,adapters,store,runKey:'private-saved-only-fixture'
 });
 assert.equal(result.status,'COMPLETE');
 assert.equal(result.executed,60);
 assert.equal(result.publicTargetIds.length,10);
 assert.equal(result.coverage.public.expectedPhases,20);
 assert.equal(result.coverage.public.complete,20);
 assert.equal(result.physicalFeedGroups,6);
 assert.equal(result.d1Writes,'NOT_REQUESTED_BY_PLATFORM');
 const repeat=await runOperationalPrivateBatch({
  sources:source,adapters,store,runKey:'private-saved-only-fixture'
 });
 assert.equal(repeat.status,'COMPLETE');
 assert.equal(repeat.executed,0,'replay must not repeat verified stored stages');
});
