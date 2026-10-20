import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildLegacyMarketInflationDomain,LEGACY_MARKET_INFLATION_METHOD} from '../lib/market-score/inflation-legacy-public-domain.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';

const date='2026-10-20';
const row=(value,observationDate='2026-10-19')=>[{observationDate,value}];
const weighted=60*.35+55*.25+62*.15+61.4496*.25;
function fixture(score=weighted){
 return {snapshot:{diagnostics:{inflationStability:{status:'READY',score,missing:[]}}},
  artifacts:{inflationBatchA:{corePce:{score:row(60)},coreCpi:{score:row(55)},headlineCpi:{score:row(62)}},
  inflationExpectations:{score:row(61.4496)}}};
}
test('the approved four diagnostic parts exactly reconstruct the market inflation total',()=>{
 const out=buildLegacyMarketInflationDomain(fixture(),date);
 assert.equal(out.status,'READY');
 assert.equal(out.score,weighted);
 assert.equal(out.indicators.length,4);
 assert.deepEqual(out.indicators.map(p=>p.id),['corePce','coreCpi','cpi','inflationExpectations']);
 assert.deepEqual(out.trend,[{label:date,value:weighted}]);
 assert.equal(out.methodologyVersion,LEGACY_MARKET_INFLATION_METHOD);
});
test('mismatched aggregate must not silently publish a four-factor score',()=>{
 const out=buildLegacyMarketInflationDomain(fixture(61.2177),date);
 assert.equal(out.status,'PARTIAL');
 assert.equal(out.score,null);
 assert.ok(out.missingFactors.includes('DIAGNOSTIC_AGGREGATE_MISMATCH'));
});
test('missing, later-dated or unverified observations never become a score',()=>{
 const missing=fixture();
 missing.artifacts.inflationBatchA.corePce.score=row(60,'2026-10-21');
 const out=buildLegacyMarketInflationDomain(missing,date);
 assert.equal(out.status,'PARTIAL');
 assert.equal(out.indicators[0].score,null);
 assert.deepEqual(out.trend,[]);
});
test('zero scored component is valid; no missing-factor reweighting',()=>{
 const input=fixture(weighted-21);
 input.artifacts.inflationBatchA.corePce.score=row(0);
 const out=buildLegacyMarketInflationDomain(input,date);
 assert.equal(out.status,'READY');
 assert.equal(out.indicators[0].score,0);
 assert.equal(out.score,weighted-21);
});
test('market domain preserves four-factor method; risk Inflation R2 remains independent',()=>{
 const old4=buildLegacyMarketInflationDomain(fixture(),date);
 const domain=buildCmR1DomainResults({publicDomains:{inflation:old4}}).find(d=>d.id==='inflation');
 assert.equal(domain.score,weighted);
 assert.equal(domain.methodologyVersion,LEGACY_MARKET_INFLATION_METHOD);
 assert.equal(domain.source,'STORED_DIAGNOSTIC_R7');
 assert.equal(domain.indicators.length,4);
 assert.equal(DOMAIN_WEIGHTS.find(d=>d.id==='inflation').weight,8);
 const risk=readFileSync('worker/projection-builders/inflation.mjs','utf8');
 const main=readFileSync('worker/market-score-r1.mjs','utf8');
 assert.match(risk,/calculateInflationR2At/);
 assert.doesNotMatch(risk,/buildLegacyMarketInflationDomain/);
 assert.ok(main.includes('inflation:buildLegacyMarketInflationDomain(diagnostic,asOf),'));
});
test('legacy R2 trend cannot be relabeled as valid four-factor history',()=>{
 const out=buildLegacyMarketInflationDomain(fixture(),date);
 assert.equal(out.trend.length,1);
 assert.equal(out.trend[0].value,out.score);
});
