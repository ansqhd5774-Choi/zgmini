import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runConfiguredAutoPublish} from '../scripts/pc-writer/theme-config-auto-publish.mjs';

const now=Date.parse('2026-10-29T04:00:00Z');
function root(t){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'zg-config-pub-sched-'));
 t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 return home;
}
const entries=(...ids)=>ids.map(id=>({definition:{id}}));
function approval(root,...ids){
 const dir=path.join(root,'theme-config','public-approvals');
 fs.mkdirSync(dir,{recursive:true});
 for(const id of ids)fs.writeFileSync(path.join(dir,id+'.json'),'{}');
}
const passed=()=>({status:'PREFLIGHT_PASS_NO_REMOTE_ACCESS'});

test('empty registrations preserve scheduler and never touch D1',async t=>{
 const home=root(t);let queries=0;
 const result=await runConfiguredAutoPublish({dataRoot:home,now,registrations:[],
  queryFactory:()=>{queries++;}});
 assert.equal(result.status,'NO_REGISTERED_THEMES');
 assert.equal(result.d1Writes,0);assert.equal(queries,0);
 assert.deepEqual(fs.readdirSync(home),[]);
});
test('no approval record makes no credential or source requests',async t=>{
 const home=root(t);let reads=0,credentials=0;
 const result=await runConfiguredAutoPublish({dataRoot:home,now,registrations:entries('first'),
  preflight:()=>{reads++;},queryFactory:()=>{credentials++;}});
 assert.equal(result.status,'NO_OPERATOR_APPROVALS');
 assert.equal(reads,0);assert.equal(credentials,0);assert.equal(result.d1Queries,0);
});
test('preflight is required before opening the shared PC D1 adapter',async t=>{
 const home=root(t);approval(home,'first');let opened=0;
 const result=await runConfiguredAutoPublish({dataRoot:home,now,registrations:entries('first'),
  preflight:()=>({status:'PREFLIGHT_BLOCKED',reason:'PUBLIC_APPROVAL_SCOPE'}),
  queryFactory:()=>{opened++;}});
 assert.equal(result.status,'PUBLICATION_PARTIAL_REVIEW_REQUIRED');
 assert.equal(result.results[0].reason,'PUBLIC_APPROVAL_SCOPE');
 assert.equal(opened,0);assert.equal(result.d1Writes,0);
});
test('one approved theme uses existing key, CAS stamp and exact writer once',async t=>{
 const home=root(t);approval(home,'first');const calls=[];
 const result=await runConfiguredAutoPublish({dataRoot:home,now,registrations:entries('first'),
  preflight:passed,
  queryFactory:()=>async(sql,params)=>{calls.push({sql,params});return {results:[{stored_at:1234}]};},
  publish:async({id,expectedStoredAt,query})=>{
   assert.equal(id,'first');assert.equal(expectedStoredAt,1234);
   await query('SELECT body,stored_at FROM public_feed_snapshots_v1', ['theme-configured:first'],{write:false});
   return {status:'WRITTEN_AND_READBACK_VERIFIED',written:1,
    observationDate:'2026-10-28',storedAt:now};
  }});
 assert.equal(result.status,'PUBLICATION_SCHEDULE_COMPLETED');
 assert.equal(result.d1Writes,1);assert.equal(result.d1Queries,2);
 assert.equal(calls[0].params[0],'theme-configured:first');
});
test('one blocked theme does not prevent publishing another approved theme',async t=>{
 const home=root(t);approval(home,'first','second');const called=[];
 const result=await runConfiguredAutoPublish({dataRoot:home,now,
  registrations:entries('first','second'),preflight:passed,
  queryFactory:()=>async()=>({results:[]}),
  publish:async({id})=>{
   called.push(id);
   if(id==='first')throw Object.assign(Error('failed'),{code:'D1_WRITE_OUTCOME_UNKNOWN'});
   return {status:'UNCHANGED',written:0,observationDate:'2026-10-28',storedAt:now};
  }});
 assert.deepEqual(called,['first','second']);
 assert.equal(result.status,'PUBLICATION_PARTIAL_REVIEW_REQUIRED');
 assert.equal(result.results[0].reason,'D1_WRITE_OUTCOME_UNKNOWN');
 assert.equal(result.results[1].status,'UNCHANGED');
 assert.equal(result.d1Writes,0);
});
test('auth failure is cached, no repeated login attempts for approved entries',async t=>{
 const home=root(t);approval(home,'first','second');let auth=0;
 const result=await runConfiguredAutoPublish({dataRoot:home,now,
  registrations:entries('first','second'),preflight:passed,tokenFn:()=>null,
  queryFactory:()=>{auth++;throw Object.assign(Error('offline'),{code:'PC_CLOUDFLARE_AUTH_UNAVAILABLE'});}});
 assert.equal(auth,1);assert.equal(result.eligible,2);
 assert.equal(result.d1Queries,0);
 assert.deepEqual(result.results.map(x=>x.reason),[
  'PC_CLOUDFLARE_AUTH_UNAVAILABLE','PC_CLOUDFLARE_AUTH_UNAVAILABLE']);
});

test('undeployed R32 reader blocks only R32 writes before credentials; capability probe is shared',async t=>{
 const home=root(t);approval(home,'first','second');let probes=0,auth=0;
 const result=await runConfiguredAutoPublish({dataRoot:home,now,
  registrations:entries('first','second').map(r=>({definition:{...r.definition,schema:'ZGMINI_THEME_CONFIG_V2',profile:'R32'}})),preflight:passed,
  readCapabilities:async()=>{probes++;return {supportedMethodologies:[]};},queryFactory:()=>{auth++;}});
 assert.equal(probes,1);assert.equal(auth,0);assert.equal(result.d1Writes,0);
 assert.ok(result.results.every(r=>r.reason==='CONFIG_PUBLIC_R32_READER_NOT_DEPLOYED'));
});
