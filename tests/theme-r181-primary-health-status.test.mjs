import test from 'node:test';
import assert from 'node:assert/strict';
import {expandedCollectionEntries} from '../scripts/pc-writer/expanded-collection-health.mjs';

const at='2026-11-16T05:29:30.439Z';
const tickers=['SPY','BOTZ','ROBO','SKYY','CLOU','DRIV','NLR','URA','ITA','SHLD','FINX','ARKF','CIBR','BUG'];
const coverage=Object.fromEntries(tickers.map(t=>[t,{bars:701,latest15NY:'2026-11-13'}]));
const primary=overrides=>({at,status:'LOCAL_PRIMARY_STORED',providerCalls:14,coverage,...overrides});
const slot=p=>expandedCollectionEntries({primary:p}).find(x=>x.id==='job:themePrimary');

test('R181 locally stored plus full 14-ticker coverage and attempted fetch is success',()=>{
 const row=slot(primary());
 assert.equal(row.outcome,'success');
 assert.equal(row.checkedAt,Date.parse(at));
 assert.equal(row.storedAt,Date.parse(at));
});
test('new status without complete 14-ticker evidence remains unknown',()=>{
 for(const p of [
  primary({coverage:Object.fromEntries(Object.entries(coverage).slice(0,13))}),
  primary({coverage:{...coverage,SPY:{bars:0,latest15NY:'2026-11-13'}}}),
  primary({coverage:{...coverage,SPY:{bars:701,latest15NY:null}}}),
  primary({coverage:null}),
  primary({providerCalls:0}),
  primary({at:'not-a-timestamp'}),
 ]){
  const row=slot(p);
  assert.notEqual(row.outcome,'success');
  if(p.at!=='not-a-timestamp')assert.equal(row.storedAt,null);
 }
});
test('never mistake status text alone or failed ledger for actual successful collection',()=>{
 assert.equal(slot({status:'LOCAL_PRIMARY_STORED'}).outcome,'unknown');
 assert.equal(slot(primary({status:'SOURCE_FAILED'})).outcome,'failure');
 assert.equal(slot(primary({status:'R181_HTTP_ERROR'})).outcome,'failure');
});
test('existing GMH success stays intact and retired secondary lane is removed',()=>{
 for(const status of ['PRIMARY_RAW_STORED','NO_NEW_COMPLETE_PRIMARY_DATE']){
  assert.equal(slot(primary({status})).outcome,'success');
 }
 const rows=expandedCollectionEntries({primary:primary()});
 assert.equal(rows.length,5);
 assert.equal(rows.find(x=>x.id==='job:themeSecondary'),undefined);
});
