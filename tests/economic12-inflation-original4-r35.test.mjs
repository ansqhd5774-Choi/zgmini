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

test('published R2 history does not qualify as original four-factor history',async()=>{
 const {sameVerifiedLineage}=await import('../scripts/pc-writer/market-snapshot-comparisons.mjs');
 const old4={status:'READY',score:58,methodologyVersion:LEGACY_MARKET_INFLATION_METHOD};
 const r2={status:'READY',score:61,methodologyVersion:'INFLATION_R2_R29_56'};
 assert.equal(sameVerifiedLineage(old4,r2),false);
 assert.equal(sameVerifiedLineage(old4,{...old4,score:57}),true);
 assert.equal(sameVerifiedLineage(old4,{status:'READY',score:58}),false);
 assert.equal(sameVerifiedLineage({...old4,source:'DIAGNOSTIC'},old4),false);
 const writer=readFileSync('scripts/pc-writer/run-local.mjs','utf8');
 assert.ok(writer.includes('storedSnapshots:comparableCompositeHistory'));
 assert.ok(writer.includes('sameVerifiedLineage(currentInflation,snapshot?.body?.domains?.find(d=>d.id===\'inflation\'))'));
 assert.ok(writer.includes('sameVerifiedLineage(domain,old)'));
});

test('one-year chart rebuilds only original four-factor current-vintage points',()=>{
 const source=fixture();
 const older={observationDate:'2025-09-01',value:50};
 for(const field of ['corePce','coreCpi','headlineCpi'])
   source.artifacts.inflationBatchA[field].score.unshift(older);
 source.artifacts.inflationExpectations.score.unshift(older);
 const out=buildLegacyMarketInflationDomain(source,date);
 assert.equal(out.status,'READY');
 assert.equal(out.trend.length,14);
 assert.equal(out.trend[0].label,'2025-10-20');
 assert.equal(out.trend.at(-1).label,date);
 assert.equal(out.trend.at(-1).value,out.score);
 assert.ok(out.trend.every(point=>point.value>=0&&point.value<=100));
 assert.ok(out.interpretation.includes('PIT'));
 const risk=readFileSync('worker/projection-builders/inflation.mjs','utf8');
 assert.ok(risk.includes('calculateInflationR2At'));
});

test('one-year boundary requires all four stored components at or before the date',()=>{
 const source=fixture();
 for(const field of ['corePce','coreCpi','headlineCpi'])
   source.artifacts.inflationBatchA[field].score.unshift({observationDate:'2025-09-01',value:50});
 source.artifacts.inflationExpectations.score.unshift({observationDate:'2025-10-21',value:50});
 const out=buildLegacyMarketInflationDomain(source,date);
 assert.equal(out.trend[0].label,'2025-10-31');
 assert.equal(out.trend.at(-1).value,weighted);
 assert.ok(!out.trend.some(point=>point.label==='2025-10-20'));
});

test('month-end one-year boundary is not duplicated',()=>{
 const source=fixture();
 for(const field of ['corePce','coreCpi','headlineCpi'])
   source.artifacts.inflationBatchA[field].score.unshift({observationDate:'2025-09-01',value:50});
 source.artifacts.inflationExpectations.score.unshift({observationDate:'2025-09-01',value:50});
 const out=buildLegacyMarketInflationDomain(source,'2026-10-31');
 assert.equal(out.trend[0].label,'2025-10-31');
 assert.equal(new Set(out.trend.map(point=>point.label)).size,out.trend.length);
});
