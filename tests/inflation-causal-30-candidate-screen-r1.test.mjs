import test from 'node:test';
import assert from 'node:assert/strict';
import {INFLATION_CAUSAL_19} from '../lib/inflation-causal-public-catalog.mjs';
import {INFLATION_CANDIDATES_7} from '../lib/inflation-causal-candidates-public-7-catalog.mjs';
import {
 INFLATION30_CANDIDATES,INFLATION30_CORRELATION_REVIEW,
 INFLATION30_STATUS,summarizeInflation30Screen
} from '../lib/inflation-causal-30-candidate-screen-r1.mjs';

const byId=id=>INFLATION30_CANDIDATES.find(c=>c.id===id);

test('exact original 30 numbered candidates, excluding only #20',()=>{
 const wanted=Array.from({length:31},(_,i)=>String(i+1)).filter(x=>x!=='20');
 assert.deepEqual(INFLATION30_CANDIDATES.map(x=>x.id),wanted);
 assert.equal(new Set(wanted).size,30);
 assert.equal(summarizeInflation30Screen().evaluatedCandidates,30);
});

test('matches the current source catalogs, not a fabricated new 30-source collector',()=>{
 const existing=INFLATION30_CANDIDATES.filter(x=>x.sourceGroup===INFLATION30_STATUS.CATALOG_19);
 const supplemental=INFLATION30_CANDIDATES.filter(x=>x.sourceGroup===INFLATION30_STATUS.CANDIDATE_7);
 assert.deepEqual(existing.map(x=>x.id).sort(),INFLATION_CAUSAL_19.map(x=>x.id).sort());
 assert.deepEqual(supplemental.map(x=>x.id).sort(),INFLATION_CANDIDATES_7.map(x=>x.id).sort());
 for(const item of [...existing,...supplemental])assert.ok(item.series);
 assert.deepEqual(summarizeInflation30Screen().counts,
  {CATALOG_19:19,CANDIDATE_7:7,MERGED_DERIVATION:1,DEFERRED_DEFINITION:3});
 assert.equal(summarizeInflation30Screen().independentRawCandidates,26);
});

test('no new raw collector or second weight for PCE #27, no international freight #20',()=>{
 assert.equal(byId('27').series,null);
 assert.equal(byId('27').mergedWith,'26');
 assert.equal(byId('27').researchRole,'DUPLICATE_DERIVED_VIEW');
 assert.equal(byId('20'),undefined);
 assert.deepEqual(summarizeInflation30Screen().duplicates,[{id:'27',with:'26'}]);
});

test('CPI shelter rows remain trailing outcome observations not causal model inputs',()=>{
 for(const id of ['22','23']){
  const row=byId(id);
  assert.equal(row.researchRole,'OUTCOME_OBSERVATION');
  assert.equal(row.finalAdoption,'UNDECIDED');
  assert.equal(row.weight,null);
 }
 assert.equal(byId('22').series,'CUSR0000SEHA');
 assert.equal(byId('23').series,'CUSR0000SEHC01');
 assert.equal(byId('24').series,'WPSFD4');
});

test('tariffs, DataWeb exposure, and derived shortage retain legal-definition decisions',()=>{
 const [hts,dataweb,shortage]=['15','17','30'].map(byId);
 for(const row of [hts,dataweb,shortage]){
  assert.equal(row.sourceGroup,'DEFERRED_DEFINITION');
  assert.equal(row.researchRole,'DEFINITION_UNRESOLVED');
  assert.equal(row.series,null);
  assert.equal(row.finalAdoption,'UNDECIDED');
 }
 assert.match(hts.sourceEdition,/Revision 23.*2026-11-10/);
 assert.match(hts.nextDecision,/법적 효력일/);
 assert.match(dataweb.nextDecision,/6개월/);
 assert.match(shortage.nextDecision,/수요 효과 통제/);
 assert.deepEqual(summarizeInflation30Screen().unresolvedDefinitions,['15','17','30']);
});

test('research-only: no approved formula, normalization, weights or operations',()=>{
 for(const row of INFLATION30_CANDIDATES){
  assert.equal(row.finalAdoption,'UNDECIDED');
  assert.equal(row.weight,null);
  assert.equal(row.normalization,null);
  assert.ok(Object.isFrozen(row));
 }
 const summary=summarizeInflation30Screen();
 assert.equal(summary.approvedWeights,0);
 assert.equal(summary.approvedCompositeFormula,false);
 assert.equal(summary.scope,'RESEARCH_ONLY_NOT_APPROVED');
 assert.ok(Object.isFrozen(summary));
});

test('comparative correlated inputs are explicitly for later empirical review',()=>{
 for(const pair of INFLATION30_CORRELATION_REVIEW){
  assert.equal(pair.length,2);
  assert.ok(pair.every(id=>byId(id)));
  assert.ok(Object.isFrozen(pair));
 }
 assert.ok(INFLATION30_CORRELATION_REVIEW.some(pair=>
  pair.includes('24')&&pair.includes('25')));
});
