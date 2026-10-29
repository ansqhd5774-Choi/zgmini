import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateVerifiedIssuerGrades as evaluate} from './market-calendar-r54-marketcap-gate.mjs';
const asOf='2026-10-29';
const policy={id:'MARKET_CALENDAR_R43',approved:true,enabled:true,oneToTwoUsd:20_000_000_000,twoToThreeUsd:200_000_000_000};
const base=(cap=250_000_000_000,extras={})=>({issuerId:'0000123456',marketCapUsd:cap,currency:'USD',priceAsOf:'2026-10-28',sharesAsOf:'2026-10-15',sourceVersion:'v1',sourceStoredAt:'2026-10-29T12:00:00Z',
 provenanceVerified:true,issuerWideCapVerified:true,classAndAdrVerified:true,corporateActionsVerified:true,approvedFreshnessVerified:true,publicDerivedDisplayRightsVerified:true,...extras});
const input=(snapshot,other={})=>({asOf,policy,tickers:['GOOG','GOOGL'],issuerMap:[{ticker:'GOOG',issuerId:'0000123456'},{ticker:'GOOGL',issuerId:'0000123456'}],capSnapshots:snapshot?[snapshot]:[],...other});
test('default policy disabled, even verified values cannot leak into public grade',()=>{
 const r=evaluate(input(base(),{policy:undefined}));assert.equal(r.status,'R54_POLICY_DISABLED');assert.equal(r.accepted,0);assert(r.items.every(i=>i.stars===null));
});
test('same issuer classes share one verified grade, not individually double counted',()=>{
 const r=evaluate(input(base()));assert.equal(r.accepted,2);assert.deepEqual(r.items.map(x=>x.stars),[3,3]);assert.equal(r.publishReady,false);
});
test('R43 boundaries are exact and no rounding of USD cap',()=>{
 for(const [n,expected] of [[19_999_999_999,1],[20_000_000_000,2],[199_999_999_999,2],[200_000_000_000,3]]){
  const r=evaluate(input(base(n)));assert.deepEqual(r.items.map(x=>x.stars),[expected,expected]);
 }
});
test('no verification status or absent market cap is never backfilled from priority',()=>{
 assert.equal(evaluate(input(null)).accepted,0);
 assert.equal(evaluate(input(base(1,{issuerWideCapVerified:false}))).accepted,0);
 assert.equal(evaluate(input(base(1,{publicDerivedDisplayRightsVerified:false}))).accepted,0);
});
test('split and ADR/class validation missing blocks an otherwise recent cap',()=>{
 for(const field of ['classAndAdrVerified','corporateActionsVerified','approvedFreshnessVerified']) {
  const r=evaluate(input(base(250e9,{[field]:false})));assert.equal(r.accepted,0);assert(r.items[0].reason.includes(field.toUpperCase()));
 }
});
test('future dates, wrong currency, invalid cap or missing sourceVersion fail closed',()=>{
 for(const mutation of [{priceAsOf:'2026-11-01'},{currency:'KRW'},{marketCapUsd:0},{sourceVersion:''}]){
  assert.equal(evaluate(input(base(250e9,mutation))).accepted,0);
 }
});
test('conflicting ticker mapping and duplicated issuer snapshot fail closed',()=>{
 let r=evaluate(input(base(),{issuerMap:[{ticker:'GOOG',issuerId:'0000123456'},{ticker:'GOOG',issuerId:'0000654321'}]}));
 assert.equal(r.items[0].stars,null);
 r=evaluate(input(base(),{capSnapshots:[base(),base(123e9)]}));assert.equal(r.accepted,0);
});
test('untrusted positive cap is never accepted without approved gate and other operands',()=>{
 const r=evaluate(input({issuerId:'0000123456',marketCapUsd:250e9,currency:'USD'}));
 assert.equal(r.accepted,0);assert.equal(r.publicStarsChanged,false);assert.equal(r.dataProviderRequests,0);
});
