import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DIAGNOSTIC_FRED_SERIES} from '../lib/diagnostic-layer/input-registry.mjs';
import {macroCollectionReadiness} from '../worker/macro-result-contract-r61.mjs';
const full=()=>({series:Object.fromEntries(Object.keys(DIAGNOSTIC_FRED_SERIES).map(id=>[id,[{value:0}]])),providerSummary:{fred:{failed:[]}}});
test('zero, partial and explicit failures cannot replace last-good macro',()=>{
 assert.equal(macroCollectionReadiness({series:{}}).reason,'MACRO_NO_READY_SERIES');
 const input=full();delete input.series.PAYEMS;
 assert.deepEqual(macroCollectionReadiness(input).missing,['PAYEMS']);
 assert.equal(macroCollectionReadiness(input).complete,false);
 const failed=full();failed.providerSummary.fred.failed=[{seriesId:'PAYEMS',status:'HTTP_ERROR'}];
 assert.equal(macroCollectionReadiness(failed).complete,false);
});
test('all required nonempty series preserve legitimate zero observations',()=>{
 assert.equal(macroCollectionReadiness(full()).complete,true);
 const input=full();input.series.PAYEMS=[];
 assert.equal(macroCollectionReadiness(input).complete,false);
});
