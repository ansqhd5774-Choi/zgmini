import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditNineR33Private} from '../scripts/pc-writer/theme-nine-r33-stage6-shadow-audit.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const r25path='upload/THEME_NINE_R25_INDIVIDUAL_SCORES_2665_21261.json';
const shadowpath='upload/THEME_NINE_R32_PRIVATE_SHADOW_18279_2554.json';
// PC uploads are never committed. GitHub-only runners skip these private
// evidence tests, while the supplied user files permit full replay locally.
const evidenceSkip=(!fs.existsSync(path.join(root,r25path))||
 !fs.existsSync(path.join(root,shadowpath)))&&'USER_PC_PRIVATE_UPLOADS_NOT_AVAILABLE';
const inputs=()=>({r25:read(r25path),shadow:read(shadowpath),
 roster:read('config/theme-nine-r20-approved-candidates.json'),
 aum:read('config/theme-nine-r26-official-aum-evidence.json'),
 approval:read('config/theme-nine-r32-dated-aum-approval.json')});

test('private contract rejects an attempted publication without PC files',()=>{
 assert.throws(()=>auditNineR33Private({shadow:{publicationAuthorized:true}}),
  /SHADOW_NOT_PRIVATE_R32/);
});

test('real PC shadow exactly replays all nine themes and 252 sessions',
 {skip:evidenceSkip},()=>{
 const result=auditNineR33Private(inputs());
 assert.equal(result.replayMatchedExactly,true);
 assert.equal(result.dailyThemePoints,2268);
 assert.equal(result.weightChecksPassed,2268);
 assert.equal(result.datedOfficialAumContributorDays,1710);
 assert.equal(result.modes.NORMALIZED_DATED_OFFICIAL_AUM_THREE_PLUS,2177);
 assert.equal(result.modes.R3_APPROVED_BOTH_R188_COMPATIBLE_50_50,91);
 assert.equal(result.perTheme.length,9);
 assert.ok(result.perTheme.every(t=>t.totalDates===252&&t.nullDates===0));
 assert.equal(result.publicHistoryComparison.status,
  'PENDING_NO_VERIFIED_LEGACY_PUBLIC_SNAPSHOT');
});

test('changed PC shadow score fails exact full replay',{skip:evidenceSkip},()=>{
 const p=inputs();p.shadow.themes[0].history[0].score+=0.01;
 assert.throws(()=>auditNineR33Private(p),/SHADOW_EXACT_REPLAY_MISMATCH/);
});

test('changed contributor weights fail full replay',{skip:evidenceSkip},()=>{
 const p=inputs();p.shadow.themes[1].history[51].weightsPercent.SKYY+=0.1;
 assert.throws(()=>auditNineR33Private(p),/SHADOW_EXACT_REPLAY_MISMATCH/);
});

test('missing date fails full replay',{skip:evidenceSkip},()=>{
 const p=inputs();p.shadow.themes[0].history.splice(50,1);
 assert.throws(()=>auditNineR33Private(p),/SHADOW_EXACT_REPLAY_MISMATCH/);
});

test('attempted publication cannot pass audit',{skip:evidenceSkip},()=>{
 const p=inputs();p.shadow.publicationAuthorized=true;
 assert.throws(()=>auditNineR33Private(p),/SHADOW_NOT_PRIVATE_R32/);
});

test('unapproved AUM evidence refuses the real private replay',
 {skip:evidenceSkip},()=>{
 const p=inputs();p.approval=null;
 assert.throws(()=>auditNineR33Private(p),/AUM_FRESHNESS_UNAPPROVED/);
});
