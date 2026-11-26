import test from 'node:test';
import assert from 'node:assert/strict';
import {readSelectedMarketBatchProvenance} from '../lib/score-history/market-batch-provenance-read-r1.mjs';

const selected={storedAt:1794000000000,body:{series:{DGS10:[{date:'2026-11-09',value:4.1}]}}};
const row={batch_key:'macro:2026-11-09',stored_at:selected.storedAt,body:JSON.stringify(selected.body)};
const withRows=(candidateRows=[row])=>{
 const calls=[];
 const db={prepare(sql){calls.push({sql});return {bind(value){calls.push({bind:value});return {async all(){calls.push({read:true});return {results:candidateRows};}};}};}};
 return {db,calls};
};
const attest=(db,overrides={})=>readSelectedMarketBatchProvenance({db,key:'macro',selected,decode:JSON.parse,...overrides});

test('reads only the existing ten-candidate table and returns no raw body',async()=>{
 const {db,calls}=withRows(),evidence=await attest(db);
 assert.match(calls[0].sql,/^SELECT batch_key,body,stored_at FROM market_input_batches_v1 /);
 assert.match(calls[0].sql,/ORDER BY stored_at DESC LIMIT 10$/);
 assert.deepEqual(calls.slice(1),[{bind:'macro:%'},{read:true}]);
 assert.equal(evidence.batchKey,row.batch_key);
 assert.equal(JSON.stringify(evidence).includes('DGS10'),false);
});
test('never silently selects a new input when the supplied selection is missing',async()=>{
 const {db,calls}=withRows();
 await assert.rejects(attest(db,{selected:null}),/SELECTED_INPUT_EVIDENCE_REQUIRED/);
 assert.equal(calls.length,0);
});
test('an unsupported source is rejected before touching the DB',async()=>{
 const {db,calls}=withRows();
 await assert.rejects(attest(db,{key:'unknown'}),/SOURCE_KEY_UNSUPPORTED/);
 assert.equal(calls.length,0);
});
test('the selected row no longer in the latest ten fails closed',async()=>{
 const {db}=withRows([{...row,stored_at:selected.storedAt+1}]);
 await assert.rejects(attest(db),/PROVENANCE_UNPROVEN/);
});
test('duplicate matching candidates fail closed',async()=>{
 const {db}=withRows([row,{...row,batch_key:'macro:duplicate'}]);
 await assert.rejects(attest(db),/PROVENANCE_AMBIGUOUS/);
});
test('a caller-provided decoder also works for encoded source rows',async()=>{
 const {db}=withRows([{...row,body:'encoded:'+row.body}]);
 const evidence=await attest(db,{decode:body=>JSON.parse(body.slice(8))});
 assert.equal(evidence.batchKey,row.batch_key);
});
test('invalid read-only DB contracts fail without inventing provenance',async()=>{
 await assert.rejects(attest({}),/PROVENANCE_READER_INVALID/);
 await assert.rejects(attest({prepare:()=>({bind:()=>({all:async()=>({results:null})})})}),/PROVENANCE_ROWS_INVALID/);
});
test('query errors remain explicit and no retry or DB write occurs',async()=>{
 let queries=0;
 const db={prepare(sql){queries++;assert.match(sql,/^SELECT /);return {bind:()=>({all:async()=>{throw Error('SQLITE_BUSY');}})};}};
 await assert.rejects(attest(db),/SQLITE_BUSY/);
 assert.equal(queries,1);
});
