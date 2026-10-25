import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {validCreditInput,readLastValidCredit} from '../worker/credit-input-policy.mjs';
import {marketOperationalStore as candidateStore,readStoredMarketInputs} from '../worker/candidate-market-operational-store.mjs';
const valid={external:{dvpRepoRows:[{observationDate:'2026-10-22',value:1}],triPartyRepoRows:[{observationDate:'2026-10-21',value:2}],cmdiRows:[{observationDate:'2026-09-25',market:.2,hy:.1,ig:.3}]}};
const empty={external:{dvpRepoRows:[],triPartyRepoRows:[],cmdiRows:[]}};
const decode=s=>JSON.parse(s.startsWith('gzip:')?gunzipSync(Buffer.from(s.slice(5),'base64')).toString():s);
function database(rows){return {prepare(){return {bind(){return this},async all(){return {results:rows}},async first(){return null}}}}}
test('all three sources must contain dated finite observations; zero is valid',()=>{
 assert.equal(validCreditInput(valid),true);assert.equal(validCreditInput(empty),false);
 for(const key of Object.keys(valid.external))assert.equal(validCreditInput({external:{...valid.external,[key]:[]}}),false);
 assert.equal(validCreditInput({external:{...valid.external,cmdiRows:[{observationDate:'2026-09-25',market:0,hy:0,ig:0}]}}),true);
});
test('invalid newer acquisition cannot hide stored good credit or refresh its clock',async()=>{
 const rows=[{body:JSON.stringify(empty),stored_at:200},{body:'broken',stored_at:190},{body:'gzip:'+gzipSync(JSON.stringify(valid)).toString('base64'),stored_at:100}];
 const selected=await readLastValidCredit(database(rows),decode);
 assert.equal(selected.storedAt,100);assert.deepEqual(selected.body,valid);
 assert.equal(await readLastValidCredit(database(rows.slice(0,2)),decode),null);
});
test('SELECT-only reader enforces the original 36-hour TTL after choosing valid history',async()=>{
 const at=Date.parse('2026-10-24T22:50:00Z');
 const db=database([{body:JSON.stringify(empty),stored_at:at+3600000},{body:JSON.stringify(valid),stored_at:at}]);
 const credit=await candidateStore(db).readInput('credit');assert.equal(credit.storedAt,at);
 const store={readInput:key=>key==='credit'?Promise.resolve(credit):Promise.resolve(null)};
 assert.deepEqual((await readStoredMarketInputs(store,at+35*3600000)).external,valid.external);
 assert.deepEqual((await readStoredMarketInputs(store,at+36*3600000)).external,{});
});
