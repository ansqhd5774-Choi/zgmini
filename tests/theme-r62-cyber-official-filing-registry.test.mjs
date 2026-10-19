import test from 'node:test';
import assert from 'node:assert/strict';
import {auditR62FilingAvailability,R62_OFFICIAL_FILINGS,R62_CYBER_FUND_IDENTITY} from '../lib/market-score/theme-r62-cyber-official-filing-registry.mjs';

test('two US-listed ETFs have distinct SEC series/classes',()=>{
 assert.equal(R62_CYBER_FUND_IDENTITY.CIBR.series,'S000050385');
 assert.equal(R62_CYBER_FUND_IDENTITY.BUG.series,'S000066713');
 assert.notEqual(R62_CYBER_FUND_IDENTITY.CIBR.classId,R62_CYBER_FUND_IDENTITY.BUG.classId);
});
test('2026-10-16 snapshot sees dated public filings, never daily holdings',()=>{
 const r=auditR62FilingAvailability('2026-10-16');
 assert.equal(r.records,5); assert.equal(r.officialIdentifiersVerified,2);
 assert.equal(r.latestAvailableByTicker.CIBR.reportDate,'2026-06-30');
 assert.equal(r.latestAvailableByTicker.BUG.reportDate,'2026-05-31');
 assert.equal(r.holdingsRowsParsed,0); assert.equal(r.publicFiveAxisScoreReady,false);
 assert.equal(r.missingStockSeriesResolved,0);
});
test('filing made public after historical decision date is not backfilled into past',()=>{
 const r=auditR62FilingAvailability('2026-07-31');
 assert.equal(r.latestAvailableByTicker.CIBR.reportDate,'2026-03-31');
 assert.equal(r.latestAvailableByTicker.BUG.reportDate,'2025-11-30');
});
test('date prior to all known filed records returns null',()=>{
 const r=auditR62FilingAvailability('2025-12-31');
 assert.equal(r.latestAvailableByTicker.CIBR,null); assert.equal(r.latestAvailableByTicker.BUG,null);
});
test('invalid source identities and inconsistent SEC URLs are rejected',()=>{
 const a=R62_OFFICIAL_FILINGS.map(x=>({...x}));a[0].ticker='BUG';
 assert.throws(()=>auditR62FilingAvailability('2026-10-16',a),/SEC_URL_MISMATCH/);
 const b=R62_OFFICIAL_FILINGS.map(x=>({...x}));b[0].accession=b[1].accession;
 assert.throws(()=>auditR62FilingAvailability('2026-10-16',b),/SEC_URL_MISMATCH|DUPLICATE_ACCESSION/);
});
test('report date alone is not publication and illegal date order rejected',()=>{
 const a=R62_OFFICIAL_FILINGS.map(x=>({...x}));a[0].filedDate='2025-10-01';
 assert.throws(()=>auditR62FilingAvailability('2026-10-16',a),/FILED_BEFORE_REPORT/);
});
