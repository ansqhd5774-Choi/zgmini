import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDeltaScreenerCsv,gradeCalendarTickersFromDelta} from '../lib/market-calendar-deltascreener-snapshot.mjs';
import {makeDeltaR44Public} from '../lib/market-calendar-deltascreener-public.mjs';
import {makeMarketCalendarTaxonomyPublic,validateMarketCalendarTaxonomy,taxonomyOptions}
 from '../lib/market-calendar-taxonomy-public.mjs';

const input='ticker,name,exchange,sector,industry,country,price,mktCap\n'+
 'NVDA,NVIDIA,NASDAQ,Technology,Semiconductors,US,100,100000000000\n'+
 'HD,Home Depot,NYSE,Consumer Cyclical,Home Improvement Retail,US,100,70000000000\n';
test('taxonomy publishes only labels for exactly the eligible stored cohort',()=>{
 const parsed=parseDeltaScreenerCsv(input);
 const r44=makeDeltaR44Public(gradeCalendarTickersFromDelta(parsed,['NVDA','HD','MISS']));
 const body=makeMarketCalendarTaxonomyPublic(parsed,r44);
 assert.equal(body.tickerCount,3);
 assert.equal(body.classifiedCount,2);
 assert.equal(body.rows.NVDA.sector,'Technology');
 assert.equal(body.rows.HD.industry,'Home Improvement Retail');
 assert.equal(body.rows.MISS,undefined);
 assert.ok(!JSON.stringify(body).includes('100000000000'));
 assert.ok(!JSON.stringify(body).includes('marketCap'));
 assert.ok(validateMarketCalendarTaxonomy(body));
 assert.deepEqual(taxonomyOptions(body).sectors,{
  'Consumer Cyclical':['Home Improvement Retail'],
  Technology:['Semiconductors']
 });
});
test('taxonomy fails closed on corrupted or unlicensed labels',()=>{
 const p=parseDeltaScreenerCsv(input);
 const r44=makeDeltaR44Public(gradeCalendarTickersFromDelta(p,['NVDA','HD']));
 const valid=makeMarketCalendarTaxonomyPublic(p,r44);
 assert.equal(validateMarketCalendarTaxonomy({...valid,creditUrl:'https://invalid.example'}),null);
 assert.equal(validateMarketCalendarTaxonomy({...valid,rows:{...valid.rows,NVDA:{sector:'<script>',industry:'Semiconductors'}}}),null);
 assert.equal(validateMarketCalendarTaxonomy({...valid,rows:{...valid.rows,'BAD!':{sector:'Tech',industry:'Hardware'}},classifiedCount:3}),null);
 assert.equal(validateMarketCalendarTaxonomy({...valid,rows:{...valid.rows,NVDA:{sector:'Technology',industry:'Semiconductors',marketCapUsd:100}}}),null);
});
