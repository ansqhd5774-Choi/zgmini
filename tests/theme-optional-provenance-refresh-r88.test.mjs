import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {dcPowerVersionedD1} from '../scripts/pc-writer/theme-data-center-power-d1-r3.mjs';
import {spaceSatelliteD1R29} from '../scripts/pc-writer/theme-space-satellite-d1-r29.mjs';
import {DC_POWER_PUBLIC_KEY,DC_POWER_PUBLIC_VERSION} from '../worker/theme-data-center-power-r1.mjs';
import {SPACE_SATELLITE_R2_PUBLIC_KEY,SPACE_SATELLITE_R2_PUBLIC_VERSION} from '../worker/theme-space-satellite-r2.mjs';
async function setup(t,space){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r88-provenance-'));
 t.after(()=>{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(root,{recursive:true,force:true});});
 fs.mkdirSync(path.join(root,'pc-writer'));fs.writeFileSync(path.join(root,'pc-writer','config.json'),JSON.stringify({account:'a'.repeat(32),core:'00000000-0000-0000-0000-000000000000'}));
 const key=space?SPACE_SATELLITE_R2_PUBLIC_KEY:DC_POWER_PUBLIC_KEY;
 const record={version:space?SPACE_SATELLITE_R2_PUBLIC_VERSION:DC_POWER_PUBLIC_VERSION,publicationAuthorized:true,
  methodologyVersion:'UNCHANGED_APPROVED_METHOD',historicalWeightMode:'UNCHANGED',etfs:space?['UFO','NASA','WARP','ROKT']:['DTCR','GRID'],
  rightsBasis:'UNCHANGED',observationDate:'2026-10-28',score:50,history:[{date:'2026-10-27',score:49},{date:'2026-10-28',score:50}],sourceVersion:'old-manifest',candidateFileSha256:'1'.repeat(64)};
 let row={body:JSON.stringify(record),stored_at:100},writes=0;
 const fetchImpl=async(url,opts)=>{
  const [{sql,params}]=JSON.parse(opts.body).batch;let result;
  if(sql.startsWith('SELECT')){assert.deepEqual(params,[key]);result={results:[structuredClone(row)]};}
  else{assert.ok(sql.startsWith('UPDATE'));assert.equal(params[2],key);assert.equal(params[3],row.stored_at);writes++;row={body:params[0],stored_at:params[1]};result={meta:{changes:1}};}
  return {ok:true,json:async()=>({success:true,result:[{success:true,...result}]})};
 };
 const args={dataRoot:root,tokenFn:()=> 'unit-test-placeholder',clock:()=>200,fetchImpl};
 const db=space?await spaceSatelliteD1R29({...args,publicKey:key,publicVersion:SPACE_SATELLITE_R2_PUBLIC_VERSION}):dcPowerVersionedD1(args);
 return {db,key,record,get writes(){return writes;},get row(){return row;}};
}
for(const space of [false,true]){
 test((space?'space':'DC')+' updates changed provenance with identical scores, then stays idempotent',async t=>{
  const store=await setup(t,space),next={...store.record,sourceVersion:'new-verified-manifest',candidateFileSha256:'2'.repeat(64)};
  assert.equal((await store.db.writeVersioned(store.key,next,100)).changes,1);
  assert.deepEqual(JSON.parse(store.row.body).history,store.record.history);
  assert.equal((await store.db.writeVersioned(store.key,next,200)).changes,0);assert.equal(store.writes,1);
 });
 test((space?'space':'DC')+' still rejects a historical score revision before any write',async t=>{
  const store=await setup(t,space),next=structuredClone(store.record);next.sourceVersion='new';next.history[0].score=48;
  await assert.rejects(store.db.writeVersioned(store.key,next,100),/HISTORY_DRIFT/);assert.equal(store.writes,0);
 });
}
