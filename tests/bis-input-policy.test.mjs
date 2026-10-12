import test from 'node:test';
import assert from 'node:assert/strict';
import {BIS_INPUT_TTL,validBisInput,readLastValidBis} from '../worker/bis-input-policy.mjs';
import {readStoredMarketInputsSelected} from '../worker/candidate-market-operational-store.mjs';
import {buildBisDebtRiskComponents} from '../lib/diagnostic-layer/bis-debt-components.mjs';
const parsed={series:[{metadata:{BORROWERS_CTY:'US',DSR_BORROWERS:'P'},rows:Array.from({length:20},(_,i)=>({observationDate:`${2000+i}-01-01`,value:i}))}]};
const good={external:{bisDsrParsed:parsed}};
test('missing TC does not erase independently valid DSR',()=>{
 const out=buildBisDebtRiskComponents(parsed,null);
 assert.ok(out.dsr.score.length>0);
 assert.equal(out.debtGdp.score.length,0);
});
test('invalid BIS cannot replace valid input',async()=>{
 assert.equal(validBisInput('bisDsr',{external:{bisDsrParsed:null}}),false);
 assert.equal(validBisInput('bisDsr',good),true);
 const db={prepare:()=>({bind:()=>({all:async()=>({results:[{body:JSON.stringify({external:{bisDsrParsed:null}}),stored_at:200},{body:JSON.stringify(good),stored_at:100}]})})})};
 assert.equal((await readLastValidBis(db,'bisDsr',JSON.parse)).storedAt,100);
});
test('eight day boundary does not renew successful collection timestamp',async()=>{
 const store={readInput:async()=>({body:good,storedAt:1000})};
 assert.ok((await readStoredMarketInputsSelected(store,['bisDsr'],1000+BIS_INPUT_TTL-1)).external.bisDsrParsed);
 assert.equal((await readStoredMarketInputsSelected(store,['bisDsr'],1000+BIS_INPUT_TTL)).external.bisDsrParsed,undefined);
});
