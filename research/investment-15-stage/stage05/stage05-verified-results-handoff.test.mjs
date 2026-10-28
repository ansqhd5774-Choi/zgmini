import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildExistingEvidenceAudit} from './stage05-existing-evidence-bridge.mjs';
import {buildVerifiedResultsHandoff} from './stage05-verified-results-handoff.mjs';
import {SCHEMA_VERSION} from './stage05-fusion-core.mjs';

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
    status:i===0?'BLOCKED':'BLOCKED',E:i===0?80:null,T:null,S5:null,
    blockReasons:['ETF_PRICE_EVIDENCE_NOT_VERIFIED']}));
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
    status:'RANKABLE',E:70+i,T:60+i,S5:68+i,
    blockReasons:[]}));
  const r=buildVerifiedResultsHandoff({audit:a,fusion:{
    schemaVersion:SCHEMA_VERSION,snapshotDate:a.asOfDate,rows,
  }});
  assert.equal(r.status,'READY_FOR_OLLAMA_RESEARCH');
  assert.equal(r.coverage.verifiedCompleteScores,9);
  assert.equal(r.ollamaInput.candidates.length,9);
  assert.equal(r.ollamaInput.selectedThemeId,undefined);
  assert.equal(r.ollamaInput.candidates[0].stage04M4,70);
});

test('unknown ID, duplicate ID, date mismatch or non-approved roster are rejected',()=>{
  const a=audit();
  const rows=a.themes.map(x=>({themeId:`approved-${x.topicId}`,status:'BLOCKED',
    E:null,T:null,S5:null,blockReasons:['MISSING']}));
  const fusion={schemaVersion:SCHEMA_VERSION,snapshotDate:a.asOfDate,rows};
  assert.throws(()=>buildVerifiedResultsHandoff({audit:a,fusion:{...fusion,
    snapshotDate:'2026-10-27'}}),/CONTRACT_MISMATCH/);
  assert.throws(()=>buildVerifiedResultsHandoff({audit:a,fusion:{...fusion,
    rows:[...rows.slice(0,8),{...rows[8],themeId:'unapproved-999'}]}}),
    /UNAPPROVED_OR_DUPLICATE/);
  assert.throws(()=>buildVerifiedResultsHandoff({audit:a,fusion:{...fusion,
    rows:[...rows.slice(0,8),rows[7]]}}),/UNAPPROVED_OR_DUPLICATE/);
});
