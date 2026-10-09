import test from 'node:test';
import assert from 'node:assert/strict';
import {priceWindowQuarantined} from '../lib/market-score/asset-r10-price-quarantine.mjs';
test('spin-off cannot silently enter a continuous MA window',()=>{
 assert.equal(priceWindowQuarantined('DD',['2025-10-31','2025-11-03']),true);
 assert.equal(priceWindowQuarantined('DD',['2025-11-03','2026-10-05']),false);
 assert.equal(priceWindowQuarantined('DD',['2025-01-01','2025-10-31']),false);
 assert.equal(priceWindowQuarantined('CTVA',['2026-09-30','2026-10-01']),true);
});
test('HON remains quarantined and unrelated stocks are preserved',()=>{
 assert.equal(priceWindowQuarantined('HON',['2026-07-01','2026-10-05']),true);
 assert.equal(priceWindowQuarantined('AAPL',['2025-01-01','2026-10-05']),false);
});
