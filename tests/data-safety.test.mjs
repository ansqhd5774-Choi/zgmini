import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';
import {groupedInputValid,hasObservations} from '../worker/collection-input-safety.mjs';
import {assertFeedInput,assertFeedOutput} from '../worker/public-feed-input-safety.mjs';
import {assertCompleteMarket} from '../scripts/pc-writer/market-publication-safety.mjs';
import {marketPlan,publishMarket} from '../scripts/pc-writer/publish.mjs';
import {updateDataAlert,alertCollectionReport} from '../scripts/pc-writer/local-data-alert.mjs';
const point={observationDate:'2026-10-23',value:0};
test('supply and fund flow require every input, retaining a genuine zero',()=>{
 for(const [job,keys] of Object.entries({supply:['gscpiRows','copperRows'],fundFlows:['registeredFundFlowRows']})){
  const body={external:Object.fromEntries(keys.map(k=>[k,[point]]))};
  assert.equal(groupedInputValid(job,body),true);
  for(const key of keys)for(const bad of [[],null,[{...point,value:null}],[{...point,value:'0'}]])
   assert.equal(groupedInputValid(job,{external:{...body.external,[key]:bad}}),false);
 }
 assert.equal(hasObservations([{observationDate:'2026-02-30',value:1}]),false);
});
test('incomplete publisher is rejected before remote access and before pending ledger overwrite',async()=>{
 const good={status:'SUCCESS',overall:{status:'READY',score:0,trend:[{label:'2026-10-23',value:0}]},domains:DOMAIN_WEIGHTS.map(d=>({id:d.id,status:'READY',score:0}))};
 assert.doesNotThrow(()=>assertCompleteMarket(good));assert.ok(marketPlan(good,100,'lease',99).length>0);
 for(const mutate of [b=>b.overall.trend=[],b=>b.overall.score=null,b=>b.domains[0].score=null,b=>b.domains[0].status='PARTIAL',b=>b.domains[0].id='unknown']){
  const body=structuredClone(good);mutate(body);
  assert.throws(()=>marketPlan(body,100,'lease',99));
  await assert.rejects(publishMarket({request:()=>assert.fail('remote write'),query:()=>assert.fail('remote read')},'db',body,100,'lease',99,'must-not-exist'),/MARKET_REQUIRED/);
 }
});
test('empty public feed input and partial output are blocked; diagnostics remain independent',()=>{
 for(const key of ['fear-greed','market-data','core-pce']){
  assert.throws(()=>assertFeedInput(key,{},Date.now()));
  assert.throws(()=>assertFeedOutput(key,{}));
 }
 assert.doesNotThrow(()=>assertFeedInput('core-pce-diagnostics',{providers:[]},Date.now()));
 assert.doesNotThrow(()=>assertFeedOutput('fear-greed',{score:0,history:[{score:0}]}));
});
test('warning deduplicates failures, persists Korean status and only clears the recovered item',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-alert-'));let windows=0;
 const notify=()=>{windows++;return {status:'TEST_NOTIFICATION'};};
 try{
  updateDataAlert(dir,{key:'credit',failed:true,now:100},notify);
  updateDataAlert(dir,{key:'credit',failed:true,now:200},notify);assert.equal(windows,1);
  alertCollectionReport(dir,{job:'rates',status:'COMPLETE'},notify);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'data-alert-state.json'))).active.credit.since,100);
  assert.match(fs.readFileSync(path.join(dir,'data-alert-status.txt'),'utf8'),/채권·신용/);
  alertCollectionReport(dir,{job:'credit',status:'COMPLETE'},notify);
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(path.join(dir,'data-alert-state.json'))).active).length,0);
  updateDataAlert(dir,{key:'credit',failed:true,now:300},notify);assert.equal(windows,2);
  alertCollectionReport(dir,{feeds:[{key:'fear-greed',status:'FAILED'}]},notify);assert.equal(windows,3);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
