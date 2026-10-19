import test from 'node:test';
import assert from 'node:assert/strict';
import {buildR77Crosswalk,R77_R57_STORED_TICKERS} from '../lib/market-score/theme-r77-bug-cibr-isin-symbol-crosswalk.mjs';

function fixture(){
 const a=[...Array(32).keys()];
 const b=[...Array(29).keys(),...Array(13).keys()].map((n,i)=>i<29?n:n+32);
 const u=[...Array(17).keys(),29,30,...Array(10).keys()].map((n,i)=>i<19?n:n+100);
 const s=n=>n<16?R77_R57_STORED_TICKERS[n]:'NAME'+n;
 const make=(ticker,d,ids,tickers=true)=>({
  meta:{ticker,reportDate:d,firstPublicDate:d==='2025-11-30'?'2026-01-29':d==='2025-12-31'?'2026-02-25':d==='2026-03-31'?'2026-05-21':'2026-08-21',
   sha256Verified:true,uniqueIsinEquities:ids.length,validIsinEquityPositions:ids.length,
   duplicateIsinEquityPositions:0,invalidIsinEquityFields:0,ambiguousTickerPerIsin:0},
  privateIds:{isins:new Set(ids.map(x=>'US'+String(x).padStart(10,'0'))),
   byIsin:new Map(ids.map(x=>['US'+String(x).padStart(10,'0'),tickers?s(x):null]))}});
 return [make('CIBR','2025-12-31',a),make('CIBR','2026-03-31',b),make('CIBR','2026-06-30',b),make('BUG','2025-11-30',u,false)];
}
test('reconciles actual R76 counts without assuming a same-day constituent set',()=>{
 const x=buildR77Crosswalk(fixture());
 assert.equal(x.bugIsinsSharedWithCibrJune2026,17);
 assert.equal(x.bugIsinsSharedWithAnyPriorCibrSnapshot,19);
 assert.equal(x.bugIsinsUnmappedInPriorCibr,10);
});
test('a stored R57 ticker remains a research candidate, not an approved BUG price series',()=>{
 const x=buildR77Crosswalk(fixture());
 assert.equal(x.bugIsinsWithR57StoredTickerFromJune,16);
 assert.equal(x.bugIsinsWithR57StoredTickerFromAnySnapshot,16);
 assert.equal(x.r57MarketHistoryReRead,false);
 assert.equal(x.priceVolumeSeriesRecovered,0);
 assert.equal(x.bugEquityPricesDateAligned,0);
});
test('individual ISINs or ticker/holding records are not output',()=>{
 const str=JSON.stringify(buildR77Crosswalk(fixture()));
 assert.ok(!str.includes('US0000000000')&&!str.includes('FTNT')&&!str.includes('NAME17'));
 assert.equal(JSON.parse(str).safety.rawHoldingsOutput,false);
});
test('all score, daily PIT, corporate action, volume revision, publication claims fail closed',()=>{
 const x=buildR77Crosswalk(fixture());
 assert.equal(x.dailyETFConstituentPITVerified,false);
 assert.equal(x.bugOfficial2026_10_16MembershipVerified,false);
 assert.equal(x.corporateActionVerified,false);
 assert.equal(x.volumeRevisionsApproved,0);
 assert.equal(x.fiveAxisScoresComputed,0);
 assert.equal(x.commercialPublicationAuthorized,false);
});
test('ambiguous ticker versions of the same ISIN require review',()=>{
 const f=fixture();f[0].privateIds.byIsin.set('US0000000000','DIFFERENT');
 const x=buildR77Crosswalk(f);
 assert.equal(x.crossSnapshotTickerConflicts,1);
 assert.equal(x.bugIsinsWithConsistentPriorCibrTicker,18);
});
test('source integrity and source identity drift are rejected',()=>{
 const f=fixture();f[0].meta.sha256Verified=false;
 assert.throws(()=>buildR77Crosswalk(f),/SOURCE_HASH_OR_DATE_NOT_VERIFIED/);
 const g=fixture();g[2].meta.reportDate='2026-03-31';
 assert.throws(()=>buildR77Crosswalk(g),/UNEXPECTED_OR_DUPLICATE_REPORT/);
});
test('source overlap cannot be fabricated or down-scoped',()=>{
 const f=fixture();f[3].privateIds.isins.delete('US0000000000');f[3].privateIds.isins.add('US9999999999');
 f[3].privateIds.byIsin.delete('US0000000000');f[3].privateIds.byIsin.set('US9999999999',null);
 assert.throws(()=>buildR77Crosswalk(f),/R76_BUG_CIBR_OVERLAP_DRIFT/);
});
test('request for another observation date and false R57 set rejected',()=>{
 assert.throws(()=>buildR77Crosswalk(fixture(),{asof:'2026-10-19'}),/ASOF_NOT_APPROVED/);
 assert.throws(()=>buildR77Crosswalk(fixture(),{r57Tickers:['FTNT']}),/R57_TICKER_COUNT_DRIFT/);
});
