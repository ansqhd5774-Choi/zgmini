import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkWriterLinkage} from '../scripts/check-candidate-writer-linkage-r3.mjs';
test('compiled linkage resolves aliased static functions and rejects missing exports',()=>{
 const root=mkdtempSync(join(tmpdir(),'writer-linkage-'));
 try{
  writeFileSync(join(root,'candidate-writer-r1-a.js'),'const load=()=>import("./candidate-writer-runtime-r1-b.js");');
  writeFileSync(join(root,'candidate-writer-runtime-r1-b.js'),'import {a as refreshKoreaRev7,b as runMarketOperationalRefresh} from "./shared.js"; function runPublicFeeds(){} export {refreshKoreaRev7,runMarketOperationalRefresh,runPublicFeeds};');
  writeFileSync(join(root,'shared.js'),'async function korea(){} async function market(){} export {korea as a,market as b};');
  assert.equal(checkWriterLinkage(root).targets,3);
  writeFileSync(join(root,'shared.js'),'async function korea(){} async function market(){} export default {};');
  assert.throws(()=>checkWriterLinkage(root),/callable unresolved/);
 }finally{rmSync(root,{recursive:true,force:true})}
});
test('old dynamic entry lookup cannot pass the bridge gate',()=>{
 const root=mkdtempSync(join(tmpdir(),'writer-linkage-'));
 try{writeFileSync(join(root,'candidate-writer-r1-a.js'),'const load=()=>import("./index.js");');writeFileSync(join(root,'index.js'),'export default {};');assert.throws(()=>checkWriterLinkage(root),/bridge missing/)}finally{rmSync(root,{recursive:true,force:true})}
});
