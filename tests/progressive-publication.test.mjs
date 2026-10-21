import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {progressivePublication,auxiliaryInputCheckpoint} from '../scripts/pc-writer/progressive-publication.mjs';
async function cycle({enabled=true,exit=0,before='a',after='a'}={}){
 const calls=[];let reads=0;
 const result=await progressivePublication({enabled,publish:async({early})=>{calls.push(early?'early':'final');return {status:early?exit:0};},collectAuxiliary:async()=>{calls.push('auxiliary');return {status:'DONE'};},checkpoint:()=>++reads===1?before:after});
 return {calls,result};
}
test('valid stored score publishes before auxiliary collection and unchanged inputs skip duplicate publication',async()=>{
 const {calls,result}=await cycle();assert.deepEqual(calls,['early','auxiliary']);assert.equal(result.progressive.finalSkipped,true);assert.equal(result.publication.status,0);
});
test('changed auxiliary inputs trigger a second publication after storage',async()=>{
 const {calls,result}=await cycle({after:'b'});assert.deepEqual(calls,['early','auxiliary','final']);assert.equal(result.progressive.finalSkipped,false);
});
test('unknown checkpoints never suppress the normal publisher',async()=>{
 for(const args of [{before:null},{after:null}])assert.deepEqual((await cycle(args)).calls,['early','auxiliary','final']);
});
test('early failure retains normal publication/recovery and disabled lanes preserve original ordering',async()=>{
 assert.deepEqual((await cycle({exit:1})).calls,['early','auxiliary','final']);
 assert.deepEqual((await cycle({enabled:false})).calls,['auxiliary','final']);
});
test('auxiliary exceptions and unreadable checkpoints preserve the normal publication path',async()=>{
 const calls=[];
 const result=await progressivePublication({enabled:true,publish:async({early})=>{calls.push(early?'early':'final');return {status:0};},checkpoint:()=>{throw Error('SQLITE_BUSY');},collectAuxiliary:()=>{throw Error('AUXILIARY_FAILED');}});
 assert.deepEqual(calls,['early','final']);assert.equal(result.progressive.auxiliaryStatus,'FAILED_PREVIOUS_INPUTS_PRESERVED');assert.equal(result.progressive.finalSkipped,false);
});
test('checkpoint reads actual stored outputs and supply inputs without DB initialization or writes',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zg-progressive-'));fs.mkdirSync(path.join(base,'storage'));
 assert.equal(auxiliaryInputCheckpoint(base),null);assert.equal(fs.existsSync(path.join(base,'storage','core.sqlite')),false);
 const db=new DatabaseSync(path.join(base,'storage','core.sqlite'));
 db.exec('CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT,stored_at INTEGER)');
 db.prepare('INSERT INTO public_feed_snapshots_v1 VALUES(?,?,?,?,?)').run('output','sector','current','{}',1);db.close();
 const a=auxiliaryInputCheckpoint(base);assert.equal(typeof a,'string');assert.equal(auxiliaryInputCheckpoint(base),a);
 const write=new DatabaseSync(path.join(base,'storage','core.sqlite'));write.exec('UPDATE public_feed_snapshots_v1 SET stored_at=2');write.close();
 assert.notEqual(auxiliaryInputCheckpoint(base),a);
 const b=auxiliaryInputCheckpoint(base);fs.mkdirSync(path.join(base,'supply-r10'));fs.writeFileSync(path.join(base,'supply-r10','inputs.json'),'{}');assert.notEqual(auxiliaryInputCheckpoint(base),b);
 const c=auxiliaryInputCheckpoint(base);fs.mkdirSync(path.join(base,'asset-r10-alpaca'));fs.writeFileSync(path.join(base,'asset-r10-alpaca','incremental-checkpoint.json'),'{"through":"2026-10-20"}');assert.notEqual(auxiliaryInputCheckpoint(base),c);
});
