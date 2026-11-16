import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshSavedMarketCalendarTaxonomy} from '../scripts/pc-writer/market-calendar-taxonomy-output.mjs';
import {MARKET_CALENDAR_TAXONOMY_KEY} from '../lib/market-calendar-taxonomy-public.mjs';

test('missing pinned private source preserves all previous outputs and never calls provider',async()=>{
 let writes=0;
 const store={
  readInput:async()=>null,
  readOutput:async()=>null,
  writeOutput:async()=>{writes++;}
 };
 const state=await refreshSavedMarketCalendarTaxonomy({store,now:1794780000000});
 assert.deepEqual(state,{status:'SOURCE_NOT_VERIFIED',providerCalls:0});
 assert.equal(writes,0);
});
test('invalid read or missing R44 grades never leaks raw source',async()=>{
 const store={
  readInput:async()=>({body:{sha256:'INVALID',text:'sensitive'}}),
  readOutput:async()=>null,writeOutput:async()=>{throw Error('UNEXPECTED_WRITE');}
 };
 assert.equal((await refreshSavedMarketCalendarTaxonomy({store,now:1794780000000})).status,'SOURCE_NOT_VERIFIED');
 await assert.rejects(()=>refreshSavedMarketCalendarTaxonomy({store:null,now:1}),/TAXONOMY_WRITER_INPUT_INVALID/);
});
