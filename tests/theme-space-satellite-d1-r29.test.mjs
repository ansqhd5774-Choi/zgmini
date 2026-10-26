import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spaceSatelliteD1R29} from '../scripts/pc-writer/theme-space-satellite-d1-r29.mjs';
import {SPACE_SATELLITE_PUBLIC_KEY,SPACE_SATELLITE_PUBLIC_VERSION} from
 '../worker/theme-space-satellite-r1.mjs';

test('new theme D1 CAS writes only its own key and verifies exact readback',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-space-d1-'));
 try{
  fs.mkdirSync(path.join(root,'pc-writer'));
  fs.writeFileSync(path.join(root,'pc-writer','config.json'),JSON.stringify({
   account:'a'.repeat(32),core:'12345678-1234-1234-1234-123456789abc'}));
  let stored=null,queries=0;
  const fetchImpl=async(url,opts)=>{
   assert.match(url,/api\.cloudflare\.com\/client\/v4\/accounts\/a{32}\/d1\/database\//);
   assert.equal(opts.method,'POST');
   const [{sql,params}]=JSON.parse(opts.body).batch;
   queries++;
   let result;
   if(sql.startsWith('SELECT')){
    assert.equal(params[0],SPACE_SATELLITE_PUBLIC_KEY);
    result={success:true,results:stored?[{body:stored.body,stored_at:stored.at}]:[]};
   }else if(sql.startsWith('INSERT')){
    assert.equal(params[1],SPACE_SATELLITE_PUBLIC_KEY);
    stored={body:params[3],at:params[4]};
    result={success:true,meta:{changes:1}};
   }else throw Error('UNEXPECTED_SQL');
   return {ok:true,json:async()=>({success:true,result:[result]})};
  };
  const time=Date.parse('2026-10-26T08:00:00Z');
  const store=spaceSatelliteD1R29({dataRoot:root,tokenFn:()=> 'unit-test-only-secret',
   fetchImpl,clock:()=>time});
  const record={version:SPACE_SATELLITE_PUBLIC_VERSION,
   methodologyVersion:'ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_CURRENT_AUM',
   publicationAuthorized:true,observationDate:'2026-10-23',score:44.65,
   historicalWeightMode:'CURRENT_BASKET_FIXED_AUM_RETROSPECTIVE_NOT_HISTORICAL_AUM',
   history:[{date:'2026-10-22',score:44.4},{date:'2026-10-23',score:44.65}]};
  assert.equal(await store.read(SPACE_SATELLITE_PUBLIC_KEY),null);
  assert.deepEqual(await store.writeVersioned(SPACE_SATELLITE_PUBLIC_KEY,record,null),
   {status:'WRITTEN',changes:1,storedAt:time});
  assert.deepEqual((await store.read(SPACE_SATELLITE_PUBLIC_KEY)).body,record);
  assert.deepEqual(await store.writeVersioned(SPACE_SATELLITE_PUBLIC_KEY,
   record,time),{status:'UNCHANGED',changes:0});
  await assert.rejects(store.writeVersioned('theme-biotech-optional-r2',record,time),
   /SPACE_R29_D1_WRITE_KEY_DENIED/);
  await assert.rejects(store.writeVersioned(SPACE_SATELLITE_PUBLIC_KEY,
   {...record,observationDate:'2026-10-24',score:45.0,
    history:[{date:'2026-10-22',score:33},
     {date:'2026-10-24',score:45.0}]},time),/SPACE_R29_D1_PUBLISHED_HISTORY_DRIFT/);
  assert.equal(queries,7);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
