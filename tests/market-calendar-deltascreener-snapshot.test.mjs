import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDeltaScreenerCsv,gradeCalendarTickersFromDelta,
 DELTASCREENER_AS_OF,DELTASCREENER_UPLOAD_SHA256} from '../lib/market-calendar-deltascreener-snapshot.mjs';
const header='ticker,name,exchange,sector,industry,country,price,mktCap';
const csv=(rows)=>header+'\n'+rows.join('\n')+'\n';
test('dated upload source and SHA are pinned, not labeled live',()=>{
 assert.equal(DELTASCREENER_AS_OF,'2026-11-03');
 assert.match(DELTASCREENER_UPLOAD_SHA256,/^[0-9a-f]{64}$/);
});
test('DAC R44 one star, NVDA three, medium company two; missing remains null',()=>{
 const a=parseDeltaScreenerCsv(csv([
 'DAC,Danaos Corporation,NYSE,Industrials,Marine Shipping,,100,2802626256',
 'NVDA,NVIDIA Corporation,NASDAQ,Technology,Semiconductors,US,200,4869646000000',
 'MIDD,Example,NYSE,Finance,Banks,US,30,25000000000',
 'OTCX,Off market,OTC,Finance,Banks,US,10,25000000000']));
 const x=gradeCalendarTickersFromDelta(a,['DAC','NVDA','MIDD','OTCX','ABSENT']);
 assert.equal(a.coverage.nonListedRows,1);
 assert.deepEqual(x.grades,{ABSENT:null,DAC:1,MIDD:2,NVDA:3,OTCX:null});
 assert.equal(x.coveredTickerCount,3);
 assert.equal(x.counts.missing,2);
});
test('duplicated ticker is not arbitrarily resolved; missing values excluded, not zero',()=>{
 const a=parseDeltaScreenerCsv(csv([
 'DUP,Example A,NYSE,Finance,Banks,US,20,10000000000',
 'DUP,Example B,NYSE,Finance,Banks,US,20,30000000000',
 'BAD,Example C,NYSE,Finance,Banks,US,10,',
 'NA,Valid ticker,NASDAQ,Technology,Software,US,10,80000000000']));
 assert.equal(a.coverage.duplicateTickerConflicts,1);
 assert.equal(a.coverage.invalidRows,1);
 assert.deepEqual(gradeCalendarTickersFromDelta(a,['DUP','BAD','NA']).grades,
  {BAD:null,DUP:null,NA:3});
});
test('linked share classes with divergent supplier market caps do not get false issuer grade',()=>{
 const a=parseDeltaScreenerCsv(csv([
 'GOOG,Alphabet Inc.,NASDAQ,Technology,Internet,US,200,3409323404043.0005',
 'GOOGL,Alphabet Inc.,NASDAQ,Technology,Internet,US,200,3401168208750']));
 const x=gradeCalendarTickersFromDelta(a,['GOOG','GOOGL']);
 assert.deepEqual(x.grades,{GOOG:null,GOOGL:null});
 assert.equal(x.counts.conflicting,2);
});
test('R44 50B cutoff grades exact boundary and preserves 20B lower tier',()=>{
 const source=parseDeltaScreenerCsv(csv([
  'A,One,NYSE,Tech,Apps,US,10,19999999999',
  'B,Two,NYSE,Tech,Apps,US,10,20000000000',
  'C,Two,NYSE,Tech,Apps,US,10,49999999999',
  'D,Three,NYSE,Tech,Apps,US,10,50000000000',
  'E,Three,NYSE,Tech,Apps,US,10,200000000000'
 ]));
 const g=gradeCalendarTickersFromDelta(source,['A','B','C','D','E','NOPE']);
 assert.deepEqual(g.grades,{A:1,B:2,C:2,D:3,E:3,NOPE:null});
 assert.deepEqual(g.counts,{one:1,two:2,three:2,missing:1,conflicting:0});
});
test('quoted commas roundtrip, malformed rows are not silently dropped',()=>{
 const a=parseDeltaScreenerCsv(csv(['ACME,"Acme, Inc.",NYSE,Technology,Software,US,10,15000000000']));
 assert.equal(a.profiles.size,1);
 assert.throws(()=>parseDeltaScreenerCsv(csv(['ACME,x,NYSE,Technology'])),/DELTA_CSV_ROW_WIDTH_INVALID/);
 assert.throws(()=>parseDeltaScreenerCsv('ticker,name\nABC,Example\n'),/DELTA_CSV_HEADER_INVALID/);
});
