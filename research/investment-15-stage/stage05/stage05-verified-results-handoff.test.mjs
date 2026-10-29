import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFusionStage05,SCHEMA_VERSION} from './stage05-fusion-core.mjs';
import {buildVerifiedResultsHandoff} from './stage05-verified-results-handoff.mjs';

const fixture=()=>{
  const sectors=Array.from({length:9},(_,i)=>({id:`s${i}`,score:70-i}));
  const themes=sectors.map(({id},i)=>({id:`t${i}`,name:`테마${i}`,
    sectorId:id,approved:true,score:60+i}));
  return {schemaVersion:SCHEMA_VERSION,snapshotDate:'2026-10-29',
    stage01:{status:'READY',date:'2026-10-29',risk:'NORMAL'},
    stage02:{status:'READY',sectors},stage03:{status:'READY',themes},
    stage04:{status:'READY',final_selection:{state:'UNRANKED_REVIEW',
      confirmed_theme_ids:null,approval_evidence:null}}};
};
const handoff=d=>buildVerifiedResultsHandoff({
  completedSnapshot:d,fusion:calculateFusionStage05(d)});

test('no user selection blocks Ollama without introducing M4/S5',()=>{
  const r=handoff(fixture());
  assert.equal(r.status,'BLOCKED_USER_CONFIRMATION_OR_PRIOR_RESULTS');
  assert.equal(r.ollamaInput,null);
  assert.ok(r.candidates.every(c=>!('stage04M4' in c)&&!('stage05S5'in c)));
});
test('explicit user confirmation sends selected themes only and keeps other eight blocked',()=>{
  const d=fixture();
  d.stage04.final_selection={state:'FINAL_CONFIRMED',
    confirmed_theme_ids:['t2'],approval_evidence:'USER_CONSENT',
    confirmed_at:'2026-10-29'};
  const r=handoff(d);
  assert.equal(r.status,'READY_FOR_OLLAMA_RESEARCH');
  assert.deepEqual(r.ollamaInput.candidates.map(c=>c.themeId),['t2']);
  assert.equal(r.coverage.userConfirmed,1);
  assert.ok(r.ollamaInput.candidates.every(c=>!('stage04M4' in c)));
});
test('legacy archive audit is no longer a valid handoff',()=>{
  assert.throws(()=>buildVerifiedResultsHandoff({audit:{version:'R79_EXISTING_STAGE01_04_EVIDENCE_BRIDGE'}}),
    /STAGE05_COMPLETED_RESULTS_REQUIRED/);
});
