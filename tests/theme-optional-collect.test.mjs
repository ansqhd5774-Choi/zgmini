import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {collectOptional} from '../scripts/pc-writer/theme-optional-collect.mjs';
import {inspectManifest} from '../scripts/pc-writer/theme-data-inventory.mjs';
test('bounded pages resume without redownloading committed pages and raw hashes are verifiable',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-collect-'));let calls=0;
 const fetchImpl=async url=>{calls++;assert.equal(url.origin,'https://getmarkethistory.com');const s=url.pathname.split('/').at(-2),page=url.searchParams.get('cursor')==='page2'?2:1;
  const body=JSON.stringify({symbol:s,timestamp:`2026-10-${20+page}T19:00:00Z`,close:100+page,is_gap:false})+'\n';return new Response(body,{headers:page===1?{'x-next-cursor':'page2'}:{}});};
 try{const opts={dataRoot:root,themeId:'biotech',start:'2026-10-20',end:'2026-10-23',fetchImpl};
  const first=await collectOptional(opts);assert.equal(first.providerCalls,4);assert.equal(first.status,'CHECKPOINT_READY_TO_RESUME');
  const second=await collectOptional(opts);assert.equal(second.providerCalls,2);assert.equal(second.status,'PRIVATE_RAW_COLLECTION_COMPLETE');
  const third=await collectOptional(opts);assert.equal(third.providerCalls,0);assert.equal(calls,6);
  assert.equal(inspectManifest(root,'themes/biotech/raw-manifest.json','biotech').status,'SHA_VERIFIED');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('provider failure persists a stop checkpoint and is never retried automatically',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-collect-fail-'));let calls=0;
 try{const opts={dataRoot:root,themeId:'ai-semiconductor',start:'2026-10-20',end:'2026-10-23',fetchImpl:async()=>{calls++;return new Response('',{status:429})}};
  assert.equal((await collectOptional(opts)).status,'STOP_HTTP_429');assert.equal((await collectOptional(opts)).status,'STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED');assert.equal(calls,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
