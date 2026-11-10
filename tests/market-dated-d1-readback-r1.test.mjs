import test from 'node:test';
import assert from 'node:assert/strict';
import {compareMarketDatedD1Readback} from '../lib/score-history/market-dated-d1-readback-r1.mjs';
import {DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';

const NOW=Date.parse('2026-11-10T17:37:34.025Z');
const market=()=>({status:'SUCCESS',asOfDate:'2026-11-10',overall:{status:'READY',score:47.979,trend:[{value:47.979}]},domains:DOMAIN_WEIGHTS.map(x=>({id:x.id,status:'READY',score:50,methodologyVersion:'EXISTING'}))});
function make(){const original=market(),body=JSON.stringify(original);return {snapshotKey:'2026-11-10',dateRow:{body,stored_at:NOW},currentRow:{body,stored_at:NOW},publicBody:structuredClone(original)}}

test('same UTC date, current, and all public domains is one event only',()=>{
 const result=compareMarketDatedD1Readback(make());
 assert.equal(result.status,'D1_DATE_CURRENT_PUBLIC_MATCH');
 assert.equal(result.matchedDomainCount,12);
 assert.equal(result.sameEventDisplayVerified,true);
 assert.equal(result.oneYearPitVerified,false);
 assert.match(result.bodySha256,/^[a-f0-9]{64}$/);
});
test('mismatched UTC date key or storedAt is not a history point',()=>{
 assert.equal(compareMarketDatedD1Readback({...make(),snapshotKey:'2026-11-09'}).code,'DATE_KEY_UTC_MISMATCH');
 const v=make();v.currentRow.stored_at++;
 assert.equal(compareMarketDatedD1Readback(v).code,'DATE_NOT_CURRENT_EVENT');
});
test('same timestamp but different raw body refuses false equality',()=>{
 const v=make();v.currentRow.body=JSON.stringify({...market(),asOfDate:'2026-11-09'});
 assert.equal(compareMarketDatedD1Readback(v).code,'DATE_CURRENT_BODY_MISMATCH');
});
test('changed score, missing domain, or malformed JSON fail closed',()=>{
 const score=make();score.publicBody.overall.score++;
 assert.equal(compareMarketDatedD1Readback(score).code,'PUBLIC_OVERALL_MISMATCH');
 const domain=make();domain.publicBody.domains[0].score++;
 assert.equal(compareMarketDatedD1Readback(domain).code,'PUBLIC_NON_BREADTH_MISMATCH');
 const broken=make();broken.dateRow.body='{';broken.currentRow.body='{';
 assert.equal(compareMarketDatedD1Readback(broken).code,'STORED_MARKET_INVALID');
});
test('known public breadth-only overlay retains 11-domain partial proof, not 12/12 or 1Y',()=>{
 const v=make();const breadth=v.publicBody.domains.find(x=>x.id==='breadth');
 Object.assign(breadth,{score:67,methodologyVersion:'BREADTH_V11_FIXED_5F_OBSERVED_EMA3_CONTINUITY',source:'PC_LOCAL_STORED_V11'});
 const result=compareMarketDatedD1Readback(v);
 assert.equal(result.status,'D1_DATE_CURRENT_11_DOMAINS_MATCH');
 assert.equal(result.matchedDomainCount,11);
 assert.equal(result.sameEventDisplayVerified,false);
 assert.equal(result.oneYearPitVerified,false);
 const bad=make();Object.assign(bad.publicBody.domains.find(x=>x.id==='breadth'),{score:67,methodologyVersion:'UNKNOWN',source:'X'});
 assert.equal(compareMarketDatedD1Readback(bad).code,'PUBLIC_BREADTH_OVERLAY_UNPROVEN');
});
