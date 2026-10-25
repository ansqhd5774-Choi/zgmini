import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseNewThemeRoute,adaptivePairWeights} from '../scripts/pc-writer/theme-optional-pair-weight-r3.mjs';

test('new-theme acceptance is OR, gives legacy precedence, and does not inspect existing nine',()=>{
 assert.deepEqual(chooseNewThemeRoute({legacyQualified:true,adaptiveQualified:false}),
  {accepted:true,route:'R188_LEGACY'});
 assert.deepEqual(chooseNewThemeRoute({legacyQualified:false,adaptiveQualified:true}),
  {accepted:true,route:'ADAPTIVE_R2'});
 assert.deepEqual(chooseNewThemeRoute({legacyQualified:true,adaptiveQualified:true}),
  {accepted:true,route:'R188_LEGACY'});
 assert.deepEqual(chooseNewThemeRoute({legacyQualified:false,adaptiveQualified:false}),
  {accepted:false,route:'WATCH_PENDING_REAL_DATA'});
 assert.throws(()=>chooseNewThemeRoute({legacyQualified:1}),/INVALID_ELIGIBILITY/);
});

test('mixed maturity pair evolves smoothly from 70:30 to 50:50 using real observations',()=>{
 const long='R188_COMPATIBLE',short='ADAPTIVE_PROVISIONAL';
 const cases=[[40,.7],[120,.5+.2*(377-120)/337],[252,.5+.2*(377-252)/337],
  [376,.5+.2/337],[377,.5]];
 for(const [shortAge,wLong] of cases){
  const status=shortAge===377?long:short;
  const actual=adaptivePairWeights({firstSessions:700,secondSessions:shortAge,
   firstStatus:long,secondStatus:status});
  assert.ok(Math.abs(actual.first-wLong)<1e-12,`${shortAge} ${actual.first} ${wLong}`);
  assert.ok(Math.abs(actual.first+actual.second-1)<1e-14);
  const reversed=adaptivePairWeights({firstSessions:shortAge,secondSessions:700,
   firstStatus:status,secondStatus:long});
  assert.ok(Math.abs(reversed.second-actual.first)<1e-12);
 }
});

test('same maturity uses equal weight, neither immature member is automatically discarded',()=>{
 const bothYoung=adaptivePairWeights({firstSessions:120,secondSessions:120,
  firstStatus:'ADAPTIVE_PROVISIONAL',secondStatus:'ADAPTIVE_PROVISIONAL'});
 assert.equal(bothYoung.first,.5);assert.equal(bothYoung.second,.5);
 const bothMature=adaptivePairWeights({firstSessions:628,secondSessions:377,
  firstStatus:'R188_COMPATIBLE',secondStatus:'R188_COMPATIBLE'});
 assert.equal(bothMature.first,.5);assert.equal(bothMature.second,.5);
 assert.throws(()=>adaptivePairWeights({firstSessions:628,secondSessions:39,
  firstStatus:'R188_COMPATIBLE',secondStatus:'ADAPTIVE_PROVISIONAL'}),
 /INSUFFICIENT_ACTUAL_SESSIONS/);
});

test('missing original 252-rank comparability cannot be inferred solely from age',()=>{
 const pair=adaptivePairWeights({firstSessions:700,secondSessions:500,
  firstStatus:'R188_COMPATIBLE',secondStatus:'ADAPTIVE_PROVISIONAL'});
 assert.ok(pair.first>.5);
 assert.ok(pair.first<.501);
 assert.equal(pair.secondEffectiveSessions,376);
});
