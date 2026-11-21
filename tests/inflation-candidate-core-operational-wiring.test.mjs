import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cycle=()=>fs.readFileSync('scripts/pc-writer/local-cycle.mjs','utf8');

test('candidate collection reuses Core lock and precedes early Writer publication',()=>{
 const source=cycle();
 const lock=source.indexOf("fs.writeFileSync(file,JSON.stringify(");
 const existing19=source.indexOf('inflationRecurring=await runInflation19RecurringFromCore(base)');
 const candidate=source.indexOf('inflationCandidates=await runInflationCandidatesFromCore(base)');
 const publication=source.indexOf('await progressivePublication({');
 assert.ok(lock>=0&&existing19>lock&&candidate>existing19&&publication>candidate);
 assert.match(source,/const \{runInflationCandidatesFromCore\}=await import\('\.\/inflation-causal-candidate-core-bridge\.mjs'\)/);
});

test('candidate collection is independent of unrelated collection exit and reports nonblocking failure',()=>{
 const source=cycle();
 assert.match(source,/let inflationCandidates=\{status:lane==='core'\?'DISABLED':'SKIPPED_KOREA_LANE',providerRequests:0\}/);
 assert.match(source,/if\(lane==='core'\)\{\s*try\{\s*const \{runInflationCandidatesFromCore\}=await import\('\.\/inflation-causal-candidate-core-bridge\.mjs'\);\s*inflationCandidates=await runInflationCandidatesFromCore\(base\);\s*\}catch\{\s*inflationCandidates=\{status:'FAILED_PREVIOUS_INPUTS_PRESERVED',providerRequests:null\}/);
 assert.match(source,/collectionStatus:collectionReport\?\.status\?\?null,inflationRecurring,inflationCandidates,supplyR10/);
 const bridge=fs.readFileSync('scripts/pc-writer/inflation-causal-candidate-core-bridge.mjs','utf8');
 assert.match(bridge,/if\(env\?\.ZGMINI_INFLATION_CANDIDATE_CORE_APPROVED!=='1'\)/);
 assert.match(bridge,/return \{status:'DISABLED',providerRequests:0\}/);
});

test('W01 both 19 recurring and 7 candidate collectors run independently of unrelated collect-local exit',()=>{
 const source=cycle();
 const index19=source.indexOf('inflationRecurring=await runInflation19RecurringFromCore(base)');
 const index7=source.indexOf('inflationCandidates=await runInflationCandidatesFromCore(base)');
 assert.ok(index19>0&&index7>index19);
 const gate19=source.slice(source.lastIndexOf('if(',index19),index19);
 const gate7=source.slice(source.lastIndexOf('if(',index7),index7);
 assert.match(gate19,/if\(lane==='core'\)/);
 assert.match(gate7,/if\(lane==='core'\)/);
 assert.doesNotMatch(gate19,/collection\.status|collectionExit/);
 assert.doesNotMatch(gate7,/collection\.status|collectionExit/);
 assert.match(source,/runInflation19RecurringFromCore/);
 assert.match(source,/runInflationCandidatesFromCore/);
 const recurring=fs.readFileSync('scripts/pc-writer/inflation-causal-recurring-r1.mjs','utf8');
 const candidate=fs.readFileSync('scripts/pc-writer/inflation-causal-candidate-core-bridge.mjs','utf8');
 assert.match(recurring,/ZGMINI_INFL19_RECURRING_APPROVED/);
 assert.match(candidate,/ZGMINI_INFLATION_CANDIDATE_CORE_APPROVED/);
});
