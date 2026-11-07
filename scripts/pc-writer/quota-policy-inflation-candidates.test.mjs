import test from 'node:test';
import assert from 'node:assert/strict';
import {providerForUrl,policyForProvider} from './quota-policy.mjs';

test('Treasury FiscalData and Federal Reserve Board official hosts use common quota ledger',()=>{
 assert.equal(providerForUrl('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_4'),'TREASURY');
 assert.equal(providerForUrl('https://www.federalreserve.gov/releases/g17/Current/ipdisk/ip_sa.txt'),'FEDBOARD');
 assert.equal(providerForUrl('https://api.fiscaldata.treasury.gov.evil.example/data'),null);
 assert.equal(providerForUrl('https://fakefederalreserve.gov/data'),null);
 for(const key of ['TREASURY','FEDBOARD']){
  const rule=policyForProvider(key);
  assert.equal(rule.hard,false);
  assert.equal(rule.perDay,null);
  assert.ok(rule.minIntervalMs>=500);
 }
});

test('existing source host mappings remain unchanged',()=>{
 const expected={
  'https://api.bls.gov/publicAPI/v2/timeseries/data/':'BLS',
  'https://api.census.gov/data/timeseries/eits/m3':'CENSUS',
  'https://api.eia.gov/v2/petroleum/pri/gnd/data/':'EIA',
  'https://api.stlouisfed.org/fred/series/observations':'FRED',
  'https://markets.newyorkfed.org/api':'NYFED',
 };
 for(const [url,provider] of Object.entries(expected))assert.equal(providerForUrl(url),provider);
});
