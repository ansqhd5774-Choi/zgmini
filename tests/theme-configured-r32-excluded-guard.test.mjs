import assert from 'node:assert/strict';
import {validR32History} from '../worker/theme-configured-r32-contract.mjs';

const base={etfs:['AAA'],observationDate:'2026-11-13',score:50,history:[{
 date:'2026-11-13',score:50,mode:'CONFIRMED',contributingETFs:['AAA'],
 excluded:[],weightsPercent:{AAA:100},issuerAumAsOf:{AAA:'2026-11-12'}
}]};
assert.equal(validR32History(base),true);
for(const bad of [null,undefined,42,'AAA',[],{ticker:'AAA'}, {ticker:'AAA',reason:1}]){
 const record=structuredClone(base);
 record.history[0].excluded=[bad];
 assert.doesNotThrow(()=>validR32History(record));
 assert.equal(validR32History(record),false);
}
const valid=structuredClone(base);
valid.history[0].excluded=[{ticker:'AAA',reason:'NO_DATA'}];
assert.equal(validR32History(valid),true);
console.log('R32 excluded validation: PASS');
