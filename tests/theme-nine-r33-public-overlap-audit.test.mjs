import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareR33PublicOverlap} from '../scripts/pc-writer/theme-nine-r33-public-overlap-audit.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const shadowFile='upload/THEME_NINE_R32_PRIVATE_SHADOW_18279_2554.json';
const publicFile='upload/THEME_NINE_R33_PUBLIC_BASELINE_28856_6920.json';
const evidenceSkip=(!fs.existsSync(path.join(root,shadowFile))||
 !fs.existsSync(path.join(root,publicFile)))&&'PC_PRIVATE_AND_PUBLIC_FILES_NOT_IN_GITHUB';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const input=()=>({shadow:read(shadowFile),publicSnapshot:read(publicFile)});

test('does not accept a public status without an actual READY snapshot',()=>{
 assert.throws(()=>compareR33PublicOverlap({shadow:{},publicSnapshot:{status:'UNAVAILABLE'}}),
  /PRIVATE_SHADOW_CONTRACT_INVALID/);
});

test('real user PC baseline compares 8 themes and all 2016 shared dates',
 {skip:evidenceSkip},()=>{
 const r=compareR33PublicOverlap(input());
 assert.equal(r.status,'PARTIAL_PUBLIC_THEME_COVERAGE_RECORDED');
 assert.equal(r.comparedThemes,8);
 assert.equal(r.matchedThemeDates,2016);
 assert.deepEqual(r.unavailableThemes,['AI·반도체']);
 assert.equal(r.observationDate,'2026-10-23');
 assert.equal(r.publicPhase,'CONFIRMED');
 assert.ok(r.comparison.filter(x=>x.matchedDates===252).length===8);
 assert.equal(r.d1Writes,0);
 assert.equal(r.publicationAuthorized,false);
});

test('no artificial score threshold rejects a changed historical baseline',
 {skip:evidenceSkip},()=>{
 const p=input();p.publicSnapshot.themes[0].history[0].score=0;
 const r=compareR33PublicOverlap(p);
 assert.equal(r.comparedThemes,8);
 assert.equal(r.matchedThemeDates,2016);
});

test('invalid public history rejects duplicate dates',
 {skip:evidenceSkip},()=>{
 const p=input();p.publicSnapshot.themes[0].history[1].date=
  p.publicSnapshot.themes[0].history[0].date;
 assert.throws(()=>compareR33PublicOverlap(p),/PUBLIC_POINTS_INVALID/);
});

test('AI missing is not replaced or aliased without real public evidence',
 {skip:evidenceSkip},()=>{
 const r=compareR33PublicOverlap(input());
 const ai=r.comparison.find(x=>x.theme==='AI·반도체');
 assert.equal(ai.status,'PUBLIC_THEME_NOT_PRESENT');
 assert.equal(ai.matchedDates,0);
});
