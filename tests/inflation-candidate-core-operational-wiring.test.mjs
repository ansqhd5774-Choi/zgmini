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

test('candidate collection is bounded to a successful Core collection and reports nonblocking failure',()=>{
 const source=cycle();
 assert.match(source,/let inflationCandidates=\{status:lane==='core'\?'DISABLED':'SKIPPED_KOREA_LANE',providerRequests:0\}/);
 assert.match(source,/if\(lane==='core'&&collection\.status===0\)\{\s*try\{\s*const \{runInflationCandidatesFromCore\}=await import\('\.\/inflation-causal-candidate-core-bridge\.mjs'\);\s*inflationCandidates=await runInflationCandidatesFromCore\(base\);\s*\}catch\{\s*inflationCandidates=\{status:'FAILED_PREVIOUS_INPUTS_PRESERVED',providerRequests:null\}/);
 assert.match(source,/collectionStatus:collectionReport\?\.status\?\?null,inflationRecurring,inflationCandidates,supplyR10/);
 const bridge=fs.readFileSync('scripts/pc-writer/inflation-causal-candidate-core-bridge.mjs','utf8');
 assert.match(bridge,/if\(env\?\.ZGMINI_INFLATION_CANDIDATE_CORE_APPROVED!=='1'\)/);
 assert.match(bridge,/return \{status:'DISABLED',providerRequests:0\}/);
});
