import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DIAGNOSTIC_FRED_SERIES} from '../lib/diagnostic-layer/input-registry.mjs';
import {macroCollectionReadiness,mergeSuccessfulMacroCredit} from '../worker/macro-result-contract-r61.mjs';
import {readStoredMarketInputs} from '../worker/market-operational-store.mjs';
const full=()=>({series:Object.fromEntries(Object.keys(DIAGNOSTIC_FRED_SERIES).map(id=>[id,[{observationDate:'2026-09-30',value:0}]])),providerSummary:{fred:{failed:[]}}});
test('zero, partial and explicit failures cannot replace last-good macro',()=>{
 assert.equal(macroCollectionReadiness({series:{}}).reason,'MACRO_NO_READY_SERIES');
 const input=full();delete input.series.PAYEMS;
 assert.deepEqual(macroCollectionReadiness(input).missing,['PAYEMS']);
 assert.equal(macroCollectionReadiness(input).complete,false);
 const failed=full();failed.providerSummary.fred.failed=[{seriesId:'PAYEMS',status:'HTTP_ERROR'}];
 assert.equal(macroCollectionReadiness(failed).complete,false);
});
test('credit-only update preserves last-good series with original timestamps and TTL',async()=>{
 const now=36*3600000+100,previous={body:{series:{PAYEMS:[{value:12}],NFCICREDIT:[{value:1}]},external:{original:true}},storedAt:0};
 const collected={status:'READY_CURRENT_VINTAGE',series:{NFCICREDIT:[{value:0}]}};
 const merged=mergeSuccessfulMacroCredit(previous,collected,now);
 assert.deepEqual(merged.series.PAYEMS,previous.body.series.PAYEMS);assert.equal(merged.seriesStoredAt.PAYEMS,0);
 assert.equal(merged.seriesStoredAt.NFCICREDIT,now);assert.deepEqual(merged.external,previous.body.external);
 const read=await readStoredMarketInputs({readInput:async key=>key==='macro'?{body:merged,storedAt:now}:null},now);
 assert(!Object.hasOwn(read.series,'PAYEMS'));assert.equal(read.series.NFCICREDIT[0].value,0);
 assert.throws(()=>mergeSuccessfulMacroCredit(previous,{...collected,status:'HTTP_ERROR'},now),/MACRO_CREDIT_NOT_READY/);
});
test('all required nonempty series preserve legitimate zero observations',()=>{
 assert.equal(macroCollectionReadiness(full()).complete,true);
 const input=full();input.series.PAYEMS=[];
 assert.equal(macroCollectionReadiness(input).complete,false);
});
