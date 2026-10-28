import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildExistingEvidenceAudit} from './stage05-existing-evidence-bridge.mjs';
import {buildVerifiedResultsHandoff} from './stage05-verified-results-handoff.mjs';
import {SCHEMA_VERSION,calculateFusionStage05} from './stage05-fusion-core.mjs';

const original=readFileSync(new URL(
  '../STAGE04_INVESTMENT_BOT_R17_SENTIMENT_INDUSTRY_CONTRAST_20261025.md',import.meta.url),'utf8');
const audit=()=>buildExistingEvidenceAudit({r17Markdown:original,asOfDate:'2026-10-28'});

test('R17 historic scores remain observations, not Stage04 M4 or Ollama instructions',()=>{
  const r=buildVerifiedResultsHandoff({audit:audit()});
  assert.equal(r.status,'BLOCKED_STAGE01_04_SCORES');
  assert.equal(r.ollamaInput,null);
  assert.equal(r.coverage.approvedThemes,9);
  assert.equal(r.coverage.verifiedCompleteScores,0);
  assert.equal(r.candidates[0].archivedFearGreed.score,20.69);
  assert.equal(r.candidates[0].archivedFearGreed.notCurrent,true);
  assert.ok(r.candidates.every(x=>x.stage04M4===null&&x.stage05S5===null));
});

test('even a current F or industry proxy cannot be promoted to a calculated score',()=>{
  const r=buildVerifiedResultsHandoff({audit:buildExistingEvidenceAudit({
    r17Markdown:original,asOfDate:'2026-10-28',liveF:{records:[{
      topic_id:12,score:8,observed_at:'2026-10-28',status:'CONFIRMED',
      source:'https://zgmini.kr/api/theme-fear-greed',source_version:'test-only',
    }]},
  })});
  assert.equal(r.candidates[0].currentFearGreed.score,8);
  assert.equal(r.candidates[0].stage04M4,null);
  assert.equal(r.ollamaInput,null);
});

test('explicit incomplete fusion preserves valid component E but blocks research',()=>{
  const a=audit();
  const rows=a.themes.map((x,i)=>({themeId:`approved-${x.topicId}`,
    status:'BLOCKED',stage02Score:i===0?65:null,stage03Score:70,
    stage04M4:i===0?80:null,S5:null,
    calculation:'STAGE04_FINAL_SCORE_REUSED_NO_REWEIGHTING',
    blockReasons:['STAGE02_FINAL_SCORE_MISSING']}));
  const r=buildVerifiedResultsHandoff({audit:a,fusion:{
    schemaVersion:SCHEMA_VERSION,snapshotDate:a.asOfDate,rows,
  }});
  assert.equal(r.candidates[0].stage04M4,80);
  assert.equal(r.candidates[0].stage05S5,null);
  assert.equal(r.status,'BLOCKED_STAGE01_04_SCORES');
});

test('explicit computed nine-of-nine results are handed to Ollama without program selecting a theme',()=>{
  const a=audit();
  // Synthetic structural fixture only. Not Windows readings or an investment ranking.
  const rows=a.themes.map((x,i)=>({themeId:`approved-${x.topicId}`,
    status:'RANKABLE',stage02Score:60+i,stage03Score:80+i,
    stage04M4:70+i,S5:70+i,
    calculation:'STAGE04_FINAL_SCORE_REUSED_NO_REWEIGHTING',blockReasons:[]}));
  const r=buildVerifiedResultsHandoff({audit:a,fusion:{
    schemaVersion:SCHEMA_VERSION,snapshotDate:a.asOfDate,rows,
  }});
  assert.equal(r.status,'READY_FOR_OLLAMA_RESEARCH');
  assert.equal(r.coverage.verifiedCompleteScores,9);
  assert.equal(r.ollamaInput.candidates.length,9);
  assert.equal(r.ollamaInput.selectedThemeId,undefined);
  assert.equal(r.ollamaInput.candidates[0].stage04M4,70);
  assert.equal(r.ollamaInput.candidates[0].stage03Score,80);
  assert.equal(r.ollamaInput.candidates[0].stage05S5,70);
});

test('unknown ID, duplicate ID, date mismatch or non-approved roster are rejected',()=>{
  const a=audit();
  const rows=a.themes.map(x=>({themeId:`approved-${x.topicId}`,status:'BLOCKED',
    stage02Score:null,stage03Score:null,stage04M4:null,S5:null,
    blockReasons:['MISSING']}));
  const fusion={schemaVersion:SCHEMA_VERSION,snapshotDate:a.asOfDate,rows};
  assert.throws(()=>buildVerifiedResultsHandoff({audit:a,fusion:{...fusion,
    snapshotDate:'2026-10-27'}}),/CONTRACT_MISMATCH/);
  assert.throws(()=>buildVerifiedResultsHandoff({audit:a,fusion:{...fusion,
    rows:[...rows.slice(0,8),{...rows[8],themeId:'unapproved-999'}]}}),
    /UNAPPROVED_OR_DUPLICATE/);
  assert.throws(()=>buildVerifiedResultsHandoff({audit:a,fusion:{...fusion,
    rows:[...rows.slice(0,8),rows[7]]}}),/UNAPPROVED_OR_DUPLICATE/);
});

test('handoff rejects reweighted S5 rather than presenting an invented final score',()=>{
  const a=audit();
  const rows=a.themes.map(x=>({themeId:`approved-${x.topicId}`,
    status:'RANKABLE',stage02Score:40,stage03Score:60,stage04M4:80,S5:76,
    calculation:'STAGE04_FINAL_SCORE_REUSED_NO_REWEIGHTING',blockReasons:[]}));
  const r=buildVerifiedResultsHandoff({audit:a,fusion:{
    schemaVersion:SCHEMA_VERSION,snapshotDate:a.asOfDate,rows,
  }});
  assert.equal(r.status,'BLOCKED_STAGE01_04_SCORES');
  assert.equal(r.ollamaInput,null);
  assert.ok(r.candidates.every(c=>c.stage05S5===null));
});

test('R85 direct handoff uses completed results without reading any Stage01-04 archive',()=>{
  const snapshot={schemaVersion:SCHEMA_VERSION,snapshotDate:'2026-10-28',
    stage01:{status:'READY',date:'2026-10-28',risk:'CAUTION'},
    stage02:{status:'READY',sectors:[{id:'sector',score:75}]},
    stage03:{status:'READY',themes:Array.from({length:9},(_,i)=>({
      id:`approved-${i+12}`,name:`테마-${i+12}`,sectorId:'sector',
      approved:true,score:60+i}))},
    stage04:{status:'READY',themes:Array.from({length:9},(_,i)=>({
      id:`approved-${i+12}`,status:'QUANTIFIED',M4:45+i,
      scoreKind:'STAGE04_M4_FINAL',scoreValidation:'VERIFIED',
      validatedDate:'2026-10-28'}))},
  };
  const fusion=calculateFusionStage05(snapshot);
  const result=buildVerifiedResultsHandoff({completedSnapshot:snapshot,fusion});
  assert.equal(result.version,'STAGE05_VERIFIED_RESULTS_HANDOFF_R85');
  assert.equal(result.status,'READY_FOR_OLLAMA_RESEARCH');
  assert.equal(result.coverage.verifiedCompleteScores,9);
  assert.equal(result.inputSources.archive,'NOT_USED');
  assert.equal(result.ollamaInput.candidates[0].stage02Score,75);
  assert.equal(result.ollamaInput.candidates[0].stage03Score,60);
  assert.equal(result.ollamaInput.candidates[0].stage04M4,45);
  assert.equal(result.ollamaInput.candidates[0].stage05S5,45);
  assert.equal(result.ollamaInput.selectedThemeId,undefined);
});
