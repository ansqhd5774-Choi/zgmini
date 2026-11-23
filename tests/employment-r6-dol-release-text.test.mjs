import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDolWeeklyReleaseText} from '../lib/market-score/employment-r6-dol-release-text.mjs';
const release='UNEMPLOYMENT INSURANCE WEEKLY CLAIMS SEASONALLY ADJUSTED DATA In the week ending November 14, the advance figure for seasonally adjusted initial claims was 203,000, an increase of 1,000 from the previous week\'s revised level. The previous week\'s level was revised up by 2,000 from 200,000 to 202,000. The 4-week moving average was 197,750, an increase of 2,000. The advance seasonally adjusted insured unemployment rate was 1.1 percent for the week ending November 7, unchanged from the previous week\'s unrevised rate. The advance number for seasonally adjusted insured unemployment during the week ending November 7 was 1,763,000, an increase of 70,000.';
test('published values and distinct observation weeks remain candidate-only',()=>{
 const r=parseDolWeeklyReleaseText(release,{releaseDate:'2026-11-19',expectedInitialWeekEnd:'2026-11-14'});
 assert.equal(r.status,'CANDIDATE_ONLY');
 assert.deepEqual(r.rows.map(x=>x.value),[203000,197750,1763000,1.1]);
 assert.deepEqual(r.rows.map(x=>x.observationDate),['2026-11-14','2026-11-14','2026-11-07','2026-11-07']);
 assert.ok(r.rows.every(x=>!('availableAt'in x)&&!('sourceHash'in x)));
});
test('wrong week, invalid release date, missing series and missing identity hold',()=>{
 assert.equal(parseDolWeeklyReleaseText(release,{releaseDate:'2026-11-19',expectedInitialWeekEnd:'2026-11-07'}).status,'HOLD');
 assert.equal(parseDolWeeklyReleaseText(release,{releaseDate:'2026-11-01'}).status,'HOLD');
 assert.equal(parseDolWeeklyReleaseText(release.replace('1,763,000','unknown'),{releaseDate:'2026-11-19'}).status,'HOLD');
 assert.equal(parseDolWeeklyReleaseText(release.replace('SEASONALLY ADJUSTED DATA','UNADJUSTED DATA'),{releaseDate:'2026-11-19'}).status,'HOLD');
});
