import test from 'node:test';
import assert from 'node:assert/strict';
import {secRequestIdentity,SEC_LEGACY_USER_AGENT} from '../lib/market-score/sec-request-identity.mjs';

test('validated SEC contact is included only in outbound request identity',()=>{
 const r=secRequestIdentity(' ops@example.com ');
 assert.equal(r.contactDeclared,true);
 assert.equal(r.userAgent,'ZGMINI/1.0 ops@example.com');
});
test('missing or malformed SEC contact never becomes a fabricated email',()=>{
 for(const value of [null,'', 'not-an-email','a@invalid','a@b.com'+String.fromCharCode(13,10)+'X-Forged: bad'])
  assert.deepEqual(secRequestIdentity(value),{userAgent:SEC_LEGACY_USER_AGENT,contactDeclared:false});
});
test('SEC 10 per-second policy remains codified and mapped',async()=>{
 const {policyForProvider,providerForUrl}=await import('../scripts/pc-writer/quota-policy.mjs');
 assert.equal(providerForUrl('https://data.sec.gov/api/xbrl/frames/'),'SEC');
 assert.equal(policyForProvider('SEC').perSecond,10);
 assert.equal(policyForProvider('SEC').hard,true);
});
