import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeR8} from '../scripts/pc-writer/theme-space-satellite-r8-real-audit.mjs';

const data=()=>({
 status:'PRIVATE_PRIORITY_PAIR_READY',sourceVersion:'TEST_COMBINED_SHA',
 sharedSpySource:{themeId:'data-center-power',verifiedHourlyBars:11295},
 priceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
 coverage:{
  UFO:{rawFiles:1,dailySessions:656,lastObservationDate:'2026-10-23'},
  NASA:{rawFiles:1,dailySessions:142,lastObservationDate:'2026-10-23'},
  SPY:{rawFiles:5,dailySessions:707,lastObservationDate:'2026-10-23'}
 },ignoredExistingRawEntries:2,
 candidates:[{etfs:['UFO','NASA'],commonSessions:142,calendarSessions:252,
  scoredSessions:80,missingSessions:172,observationDate:'2026-10-23',
  status:'PRIVATE_ADAPTIVE_CANDIDATE_ONLY',isCurrent:true,latestStatus:'ADAPTIVE_PROVISIONAL',
  score:47.12345,latestWeights:{UFO:64,NASA:36},eligibility:{route:'ADAPTIVE'}}]
});

test('R8 summarizes real-only private metrics without prices or claiming publication',()=>{
 const out=summarizeR8(data());
 assert.equal(out.sharedSpySource,'data-center-power');
 assert.equal(out.sharedSpyVerifiedHourlyBars,11295);
 assert.equal(out.candidate.commonSessions,142);
 assert.equal(out.candidate.privateScore,47.12345);
 assert.equal(out.sourceLastDatesAgree,true);
 assert.equal(out.rightsVerified,false);
 assert.equal(out.publicationAuthorized,false);
 assert.equal(out.finalPairSelected,false);
 assert.equal(out.providerCalls,0);
 assert.equal(out.d1Writes,0);
 assert.equal(out.schedulerWrites,0);
 assert.equal(JSON.stringify(out).includes('history'),false);
});

test('R8 reports stale NASA observation as a mismatch, not a false complete score',()=>{
 const fixture=data();fixture.coverage.NASA.lastObservationDate='2026-10-22';
 const out=summarizeR8(fixture);
 assert.equal(out.sourceLastDatesAgree,false);
 assert.equal(out.candidate.privateScore,null);
 assert.equal(out.finalPairSelected,false);
});

test('R8 does not mislabel a historical score as the current provisional score',()=>{
 const fixture=data();fixture.candidates[0].isCurrent=false;
 const out=summarizeR8(fixture);
 assert.equal(out.candidate.isCurrent,false);
 assert.equal(out.candidate.privateScore,null);
 assert.equal(out.candidate.weights,null);
});

test('R8 never invents a missing candidate score',()=>{
 const fixture=data();fixture.candidates[0].score=null;
 const out=summarizeR8(fixture);
 assert.equal(out.candidate.privateScore,null);
});
