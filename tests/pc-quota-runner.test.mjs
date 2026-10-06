import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {providerForUrl,policyForProvider} from '../scripts/pc-writer/quota-policy.mjs';
import {QuotaLedger} from '../scripts/pc-writer/quota-ledger.mjs';

function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-quota-'));}

test('provider policy maps official hosts without exposing query values',()=>{
 assert.equal(providerForUrl('https://api.stlouisfed.org/fred/series/observations?api_key=secret'),'FRED');
 assert.equal(providerForUrl('https://api.bls.gov/publicAPI/v2/timeseries/data/'),'BLS');
 assert.equal(providerForUrl('https://production.dataviz.cnn.io/index/fearandgreed/graphdata'),'CNN');
 assert.equal(providerForUrl('https://example.invalid/data'),null);
 assert.equal(policyForProvider('BLS').perDay,500);
});

test('observe mode records requests and reports cooldown without blocking',()=>{
 const base=temp();const ledger=new QuotaLedger(base,{mode:'observe'});
 ledger.beforeRequest('FRED',1_000);
 const second=ledger.beforeRequest('FRED',1_100);
 assert.equal(second.allowed,true);
 assert.equal(second.warning.blocked,true);
 assert.equal(second.warning.reason,'QUOTA_COOLDOWN');
 assert.equal(ledger.summary().guarded,0);
 assert.equal(ledger.summary().warnings,1);
 const saved=JSON.parse(fs.readFileSync(path.join(base,'quota-ledger.json'),'utf8'));
 assert.equal(saved.providers.FRED.requestTimes.length,2);
 assert.equal(JSON.stringify(saved).includes('secret'),false);
});

test('enforce mode blocks a request inside the minimum interval',()=>{
 const base=temp();const ledger=new QuotaLedger(base,{mode:'enforce'});
 ledger.beforeRequest('FRED',1_000);
 assert.throws(()=>ledger.beforeRequest('FRED',1_100),error=>error.code==='PROVIDER_QUOTA_GUARD');
 assert.equal(ledger.summary().guarded,1);
});

test('daily provider limit is enforced from the request ledger',()=>{
 const base=temp();const ledger=new QuotaLedger(base,{mode:'enforce'});
 for(let i=0;i<500;i++)ledger.beforeRequest('BLS',i*250);
 assert.throws(()=>ledger.beforeRequest('BLS',500*250),error=>error.code==='PROVIDER_QUOTA_GUARD');
});
