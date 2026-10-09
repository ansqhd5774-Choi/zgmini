import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readAssetR10Projection} from '../scripts/pc-writer/asset-r10-projection.mjs';
import {ASSET_BUBBLE_R10_WEIGHTS} from '../lib/diagnostic-layer/asset-bubble-r10-candidate.mjs';
test('research reports cannot replace the production projection',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r10-projection-'));
 try{
  fs.writeFileSync(path.join(dir,'local-asset-bubble-r10-six-factor-stored-verification.json'),JSON.stringify({score:22,status:'READY'}));
  assert.equal(readAssetR10Projection(dir).status,'PENDING');
  fs.writeFileSync(path.join(dir,'local-asset-bubble-r10-release-payload.json'),JSON.stringify({score:22,status:'READY'}));
  assert.equal(readAssetR10Projection(dir).status,'BLOCKED');
  assert.equal(readAssetR10Projection(dir).payload,null);
 }finally{fs.rmSync(dir,{recursive:true});}
});
test('a verified release is retained with a payload-specific checkpoint',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r10-projection-'));
 try{
  const payload={methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',status:'READY',score:0,indicators:Object.keys(ASSET_BUBBLE_R10_WEIGHTS).map(id=>({id,status:'READY',score:0})),sourceVersion:'fixture',sourceStoredAt:1,rightsStatus:'CLEARED_FOR_DERIVED_PUBLICATION',lookAheadSafe:true,productionEligible:true};
  fs.writeFileSync(path.join(dir,'local-asset-bubble-r10-release-payload.json'),JSON.stringify(payload));
  const result=readAssetR10Projection(dir);
  assert.equal(result.status,'READY');assert.equal(result.payload.score,0);
  assert.match(result.checkpoint.sourceVersion,/^fixture:r10:/);
 }finally{fs.rmSync(dir,{recursive:true});}
});
