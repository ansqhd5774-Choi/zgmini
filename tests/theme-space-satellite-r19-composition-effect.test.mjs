import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseSpaceBasketComposition,runSpaceBasketCompositionAudit} from
 '../scripts/pc-writer/theme-space-satellite-r19-composition-effect.mjs';
import {scoreRelativeThemeBasket} from
 '../scripts/pc-writer/theme-optional-relative-weight-r4.mjs';

function sample(){
 const dates=['2026-10-21','2026-10-22','2026-10-23'];
 const symbols=['UFO','ARKX','NASA'];
 const sessionCounts=Object.fromEntries(symbols.map(s=>[
  s,new Map(dates.map(d=>[d,100]))]));
 const timelines={
  UFO:[50,50,55].map(score=>({score,status:'ADAPTIVE_PROVISIONAL'})),
  ARKX:[50,50,55].map(score=>({score,status:'ADAPTIVE_PROVISIONAL'})),
  NASA:[95,95,100].map(score=>({score,status:'ADAPTIVE_PROVISIONAL'}))
 };
 const active=[['UFO','ARKX'],['UFO','ARKX','NASA'],['UFO','ARKX','NASA']];
 const history=dates.map((date,i)=>({date,active:active[i],
  score:Number(scoreRelativeThemeBasket({etfs:active[i].map(symbol=>({
   symbol,score:timelines[symbol][i].score,sessions:100,
   status:'ADAPTIVE_PROVISIONAL'}))}).score.toFixed(5))}));
 return {dates,symbols,sessionCounts,timelines,history};
}

test('R19 isolates ETF entrance from unchanged underlying scores',()=>{
 const d=diagnoseSpaceBasketComposition(sample());
 assert.equal(d.displayDays,3);
 assert.equal(d.adjacentPairs,2);
 assert.equal(d.attributablePairs,2);
 assert.equal(d.compositionChangePairs,1);
 assert.equal(d.unchangedMemberPairs,1);
 assert.equal(d.entriesByTicker.NASA,1);
 assert.equal(d.exitsByTicker.NASA,0);
 assert.equal(d.largestCompositionEvents[0].entrants[0],'NASA');
 assert.ok(d.largestCompositionEvents[0].membershipEffect>0);
 assert.ok(Math.abs(d.largestCompositionEvents[0].sameMemberMovement)<1e-6);
 assert.equal(d.largestCompositionEvents[0].totalChange,
  d.largestCompositionEvents[0].membershipEffect);
 assert.equal(d.membershipDominatesChangePairs,1);
 assert.equal(d.opposingMembershipVsCommonPairs,0);
 assert.equal(d.totalAbsoluteCommonMemberMovement,5);
});

test('R19 does not fabricate common scores if adjacent baskets overlap by one',()=>{
 const s=sample();
 s.history[0].active=['UFO','ARKX'];
 s.history[1].active=['UFO','NASA'];
 s.history[1].score=Number(scoreRelativeThemeBasket({etfs:[
  {symbol:'UFO',score:50,sessions:100,status:'ADAPTIVE_PROVISIONAL'},
  {symbol:'NASA',score:95,sessions:100,status:'ADAPTIVE_PROVISIONAL'}
 ]}).score.toFixed(5));
 const d=diagnoseSpaceBasketComposition(s);
 assert.equal(d.unattributablePairs,1);
 assert.equal(d.compositionChangePairs,2);
 assert.equal(d.attributablePairs,1);
 assert.equal(d.largestCompositionEvents.length,1);
});

test('R19 requires the exact verified R18 nine-ETF snapshot and no extra outputs',()=>{
 const s=sample();
 const stub=()=>({report:'SPACE_SATELLITE_R18_PC_PRIVATE_VARIABLE_BASKET_SHADOW',
  sourceManifestSha256:'FIX-MANIFEST',sharedSpyManifestSha256:'FIX-SPY',
  shadowHistorySha256:'FIX-HISTORY',last252DisplayDays:252,candidateCount:9,
  benchmarkLastDate:'2026-10-23',independentlyCurrentScored:6,
  latestPrivateProposal:{date:'2026-10-23',score:50,
   contributingEtfs:['UFO','NASA']},privateTrace:{...s,
   symbols:[...s.symbols,'WARP','ORBX','MARS','ROKT','DIPR','WSPC'],
   history:Array.from({length:250},(_,i)=>({date:`2025-10-${i}`,active:[],score:null}))
    .concat(s.history)}});
 assert.throws(()=>runSpaceBasketCompositionAudit({dataRoot:'/fake',
  r18Audit:stub,expectedHistory:'SOME-OTHER-HISTORY',
  expectedManifest:'FIX-MANIFEST',expectedSpy:'FIX-SPY'}),
  /R19_R18_SOURCE_OR_HISTORY_CHANGED/);
});
