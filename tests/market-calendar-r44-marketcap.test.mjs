import test from 'node:test';import assert from 'node:assert/strict';
import {marketCapImportanceUsd,inspectEarningsDisplay,inspectMarketCapCoverage} from '../lib/market-calendar-r44-marketcap.mjs';
import {analyzeEarningsStorageBody} from '../scripts/pc-writer/market-calendar-r44-marketcap-readonly.mjs';
const days=Array.from({length:14},(_,i)=>new Date(Date.parse('2026-10-29T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const row=t=>'<article class="mc-row mc-vendor-row" data-search="'+t.toLowerCase()+' '+t.toLowerCase()+' inc"><div class=mc-importance aria-label="중요도 1">★</div></article>';
const sample={status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',rawVendorJsonExposed:false,publicJsonFeed:false,redistribution:false,
 recordCount:4,checkedAt:'2026-10-29T00:00:00Z',coveredDays:days,
 byDay:Object.fromEntries(days.map((d,i)=>[d,i===0?[row('ABBV'),row('AAPL'),row('GOOG')]:i===1?[row('ABBV')]:[]]))};
const verified=(ticker,marketCapUsd,issuerId=ticker)=>({ticker,marketCapUsd,issuerId,currency:'USD',source:'VERIFIED_FIXTURE',validated:true,issuerLevel:true,observationDate:'2026-10-28'});
test('R44 strict 200B/20B USD thresholds and unknown handling',()=>{
 assert.equal(marketCapImportanceUsd(200e9),3);assert.equal(marketCapImportanceUsd(200e9-1),2);
 assert.equal(marketCapImportanceUsd(20e9),2);assert.equal(marketCapImportanceUsd(20e9-1),1);
 for(const n of [null,undefined,NaN,0,-1,'200000000000',Infinity])assert.equal(marketCapImportanceUsd(n),null);
});
test('R44 different count for events and unique tickers, ABBV three stars',()=>{
 const a=inspectEarningsDisplay(sample);assert.equal(a.eventCount,4);assert.equal(a.uniqueTickerCount,3);
 const r=inspectMarketCapCoverage(sample,[verified('ABBV',300e9)]);
 assert.deepEqual([r.eventCount,r.uniqueTickerCount,r.coveredCount,r.missingCount],[4,3,1,2]);
 assert.deepEqual(r.missingSymbols,['AAPL','GOOG']);assert.equal(r.gradeByTicker.ABBV.importance,3);
 assert.equal(r.gradeByTicker.AAPL,null);
});
test('R44 refuses invalid and conflicting market capitalization',()=>{
 const r=inspectMarketCapCoverage(sample,[verified('ABBV',300e9),verified('ABBV',100e9),
 {...verified('AAPL',400e9),validated:false},{...verified('GOOG',1e9),currency:'EUR'}]);
 assert.equal(r.coveredCount,0);assert.deepEqual(r.conflictingSymbols,['ABBV']);
});
test('R44 all verified classes receive deterministic importance',()=>{
 const r=inspectMarketCapCoverage(sample,[verified('ABBV',300e9),verified('AAPL',100e9),verified('GOOG',10e9)]);
 assert.equal(r.status,'READY_FOR_CONTRACT_REVIEW');assert.deepEqual([r.gradeByTicker.ABBV.importance,r.gradeByTicker.AAPL.importance,r.gradeByTicker.GOOG.importance],[3,2,1]);
});
test('R44 read-only output does not infer market cap coverage from display HTML',()=>{
 const r=analyzeEarningsStorageBody(JSON.stringify(sample));
 assert.equal(r.status,'R44_READONLY_RETRIEVED');assert.equal(r.eventCount,4);assert.equal(r.uniqueTickers,3);
 assert.equal(r.marketCapCoverage,null);assert.equal(r.providerRequests,0);assert.equal(r.dbWrites,0);assert.equal(r.d1Writes,0);
});
test('R44 invalid storage fails closed',()=>{
 assert.throws(()=>inspectEarningsDisplay({...sample,recordCount:3}),/COUNT_MISMATCH/);
 assert.equal(analyzeEarningsStorageBody('invalid').status,'R44_DISPLAY_JSON_INVALID');
});
