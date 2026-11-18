import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DOMAIN_WEIGHTS,COMPOSITE_MODEL_VERSION,buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';
import {MARKETPARQUET_REMOVED_CODE as RETIRED} from '../lib/marketparquet-retirement.mjs';
import {retiredBreadthPublicDomain} from '../worker/market-retired-breadth-domain.mjs';
import {isRetiredBreadthPartialMarket,assertCompleteMarket} from '../worker/market-publication-validation.mjs';
import {maskRetiredMarketPublicSnapshot} from '../worker/market-retired-public-snapshot-mask.mjs';

function makePartial(){
 const retired=retiredBreadthPublicDomain();
 const input=DOMAIN_WEIGHTS.map(spec=>spec.id==='breadth'
  ?retired
  :{id:spec.id,status:'READY',score:spec.id==='inflation'?0:60,trend:[],indicators:[]});
 const calculated=buildCompositeMarketScore(input,{updatedAt:'2026-11-18T09:00:00Z'});
 return {
  status:'SUCCESS',modelVersion:COMPOSITE_MODEL_VERSION,asOfDate:'2026-11-18',
  overall:{...calculated.overall,state:RETIRED},
  domains:calculated.domains.map(domain=>domain.id==='breadth'
   ?{...domain,state:RETIRED,indicators:[],trend:[],missingFactors:[]}:domain),
  dataQuality:calculated.dataQuality,
 };
}
test('retired source is an explicit no-data tombstone, not a B1-R5 score',()=>{
 const retired=retiredBreadthPublicDomain();
 assert.equal(retired.status,'UNAVAILABLE');
 assert.equal(retired.score,null);
 assert.equal(retired.state,RETIRED);
 assert.deepEqual(retired.trend,[]);
 assert.deepEqual(retired.indicators,[]);
 assert.equal(JSON.stringify(retired).includes('MarketParquet Free Sample'),false);
});
test('the precise 11 READY / 1 rights-retired payload is permitted with no reweight',()=>{
 const body=makePartial();
 assert.equal(body.overall.status,'PARTIAL');
 assert.equal(body.overall.score,null);
 assert.equal(body.dataQuality.coverageWeight,92);
 assert.equal(body.dataQuality.reweighted,false);
 assert.equal(body.domains.find(d=>d.id==='inflation').score,0);
 assert.equal(isRetiredBreadthPartialMarket(body),true);
 assert.doesNotThrow(()=>assertCompleteMarket(body));
 assert.equal(maskRetiredMarketPublicSnapshot(body),body);
});
test('the complete 12-domain publication contract and its score history remain enforced',()=>{
 const old={
  status:'SUCCESS',overall:{status:'READY',score:0,trend:[{label:'2026-11-18',value:0}]},
  domains:DOMAIN_WEIGHTS.map(d=>({id:d.id,status:'READY',score:0})),
 };
 assert.doesNotThrow(()=>assertCompleteMarket(old));
 const noTrend=structuredClone(old);noTrend.overall.trend=[];
 assert.throws(()=>assertCompleteMarket(noTrend),/MARKET_REQUIRED_TREND_MISSING/);
});
test('retired-breadth exception never admits a second missing, stale or unready domain',()=>{
 const failures=[
  body=>body.domains.find(d=>d.id==='fundFlows').status='PARTIAL',
  body=>body.domains.find(d=>d.id==='rates').score=null,
  body=>body.domains.find(d=>d.id==='breadth').score=0,
  body=>body.domains.find(d=>d.id==='breadth').status='READY',
  body=>body.domains.find(d=>d.id==='breadth').state=null,
  body=>body.domains.find(d=>d.id==='breadth').indicators.push({value:5}),
  body=>body.domains.push({...body.domains[0]}),
  body=>body.domains.find(d=>d.id==='rates').weight+=8,
  body=>body.overall.status='READY',
  body=>body.overall.score=50,
  body=>body.overall.state=null,
  body=>body.overall.trend.push({label:'2026-11-18',value:50}),
  body=>body.dataQuality.reweighted=true,
  body=>body.dataQuality.coverageWeight=100,
  body=>body.dataQuality.missingDomains=[],
  body=>body.dataQuality.readyDomains=12,
  body=>body.modelVersion='UNAPPROVED',
  body=>body.domains.find(d=>d.id==='rates').indicators=[{source:'MarketParquet Free Sample',score:85}],
  body=>body.domains.find(d=>d.id==='breadth').source='MARKETPARQUET_FREE_SAMPLE',
 ];
 for(const mutate of failures){
  const bad=structuredClone(makePartial());mutate(bad);
  assert.equal(isRetiredBreadthPartialMarket(bad),false);
  assert.throws(()=>assertCompleteMarket(bad),/MARKET_REQUIRED_SCORE_MISSING/);
 }
});
test('both approved worker and PC calculation inject the tombstone; visitor GET remains stored-only',()=>{
 const worker=fs.readFileSync(new URL('../worker/market-operational-refresh.mjs',import.meta.url),'utf8');
 const pc=fs.readFileSync(new URL('../scripts/pc-writer/market.mjs',import.meta.url),'utf8');
 const scored=fs.readFileSync(new URL('../worker/market-score-r1.mjs',import.meta.url),'utf8');
 const http=fs.readFileSync(new URL('../app/api/market-score/route.ts',import.meta.url),'utf8');
 for(const code of [worker,pc]){
  assert.match(code,/collectBreadthDomain:retiredBreadthPublicDomain/);
  assert.doesNotMatch(code,/collectBreadthDomain:readBreadthB1R5StoredPublicDomainR1/);
 }
 assert.match(scored,/rightsRetiredBreadth/);
 assert.match(scored,/state:MARKETPARQUET_REMOVED_CODE/);
 assert.match(http,/storedMarketResponse/);
 assert.doesNotMatch(http,/collectBreadth|waitUntil/);
});
