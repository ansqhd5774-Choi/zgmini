import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const installed=new URL('../scripts/pc-writer/market-calendar-r56-pc-apply.mjs',import.meta.url);
const local=new URL('../market-calendar-r56-pc-apply.mjs',import.meta.url);
const {patchR56Provider,runR56PcApply}=await import(fs.existsSync(fileURLToPath(installed))?installed.href:local.href);

const head='1afc5c7bb28c9d87acf03d85fe20ae3c45013fd3';
const afterHead='2222222222222222222222222222222222222222';
const relative='lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const providerInRepo=new URL('../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs',import.meta.url);
const providerInScratch=new URL('../breadth-b1-r6-marketparquet-provider.mjs',import.meta.url);
const updated=fs.readFileSync(fs.existsSync(fileURLToPath(providerInRepo))?
 providerInRepo:providerInScratch,'utf8');
const old=updated
 .replace('  B1_R3_MARKETPARQUET_SOURCE_CONTRACT,\n',
  '  B1_R3_MARKETPARQUET_SOURCE_CONTRACT,\n  B1_R3_MIN_COVERAGE,\n')
 .replace('  // R45 validates its own full-stock coverage independently of B1\'s S&P 500\n'+
  '  // matching threshold. A short B1 match must not discard already-fetched\n'+
  '  // full-stock rows; B1\'s coverage/fallback decision remains unchanged.\n'+
  '  // No additional request is made and any sidecar failure is non-blocking.\n'+
  '  if(typeof snapshotObserver==="function"){',
  '  // An optional PC-private R45 observer reuses the two already downloaded files.\n'+
  '  // Its failure cannot change B1 source coverage, scoring, or fallbacks.\n'+
  '  if(typeof snapshotObserver==="function"&&built.coverage>=B1_R3_MIN_COVERAGE){');

function fixture(providerSource=old){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r56-'));
 const base=path.join(dir,'data'),root=path.join(dir,'core');
 const target=path.join(root,...relative.split('/'));
 fs.mkdirSync(base,{recursive:true});fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,providerSource);fs.writeFileSync(path.join(base,'config.json'),JSON.stringify({
  source:head,enabled:true,collectionTarget:'pc',
 }));
 let current=head;
 const gitCall=(_root,args)=>{
  if(args[0]==='rev-parse'&&args[1]==='--show-toplevel')return root;
  if(args[0]==='rev-parse'&&args[1]==='HEAD')return current;
  if(args[0]==='rev-parse'&&args[1]==='HEAD^')return head;
  if(args[0]==='status')return '';
  if(args[0]==='var')return 'test identity';
  if(args[0]==='add')return '';
  if(args[0]==='commit'){current=afterHead;return 'test commit';}
  if(args[0]==='diff')return relative;
  throw Error('UNEXPECTED_GIT_COMMAND:'+args.join(' '));
 };
 const opts={base,allowNonWindows:true,taskXml:()=>'<Task/>',
  resolveOrigin:()=>({status:'R51_SCHEDULED_CORE_ORIGIN_RESOLVED',root,
   rootWorktreeId:'d0a4b3cb8b95'}),gitCall};
 return {dir,base,root,target,opts};
}
test('R56 exact one-file patch removes only redundant B1 matching gate',()=>{
 assert.equal(patchR56Provider(old),updated);
 assert.equal(hash(old),'db0fc1cd7e733ec651a9fdd75d8ff369771aea89180bebf7c5ede4664d11b3da');
 assert.equal(hash(updated),'66d26f0dda30a5d0ac85274c3e537e9e31ede7178b1edf799cad64f21c3335f7');
 assert.equal(patchR56Provider(old.replaceAll('\n','\r\n')),updated.replaceAll('\n','\r\n'));
 assert.throws(()=>patchR56Provider(updated),/R56_PATCH_ANCHOR_MISSING_OR_DUPLICATE_STOP/);
});
test('R56 preflight makes zero changes even if PC source is eligible',async()=>{
 const f=fixture();
 try{
  const out=await runR56PcApply(f.opts);
  assert.equal(out.decision,'R56_PREFLIGHT_READY_NO_CHANGES');
  assert.equal(out.backupCreated,false);
  assert.equal(fs.readFileSync(f.target,'utf8'),old);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.base,'config.json'),'utf8')).source,head);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('R56 guarded one-file apply changes source and config without collection',async()=>{
 const f=fixture();
 try{
  const out=await runR56PcApply({...f.opts,apply:true,waitMs:0});
  assert.equal(out.decision,'R56_PC_R45_PASSIVE_CAPTURE_INSTALLED');
  assert.deepEqual(out.changedFiles,[relative]);
  assert.equal(out.providerCallsAdded,0);
  assert.equal(out.forcedCollection,false);
  assert.equal(out.schedulerChanged,false);
  assert.equal(out.backupCreated,true);
  assert.equal(fs.readFileSync(f.target,'utf8'),updated);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.base,'config.json'),'utf8')).source,afterHead);
  assert.equal(fs.existsSync(path.join(f.base,'local-cycle.lock')),false);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('R56 preserves unrelated clean approved provider changes while patching only R45 anchors',async()=>{
 const variant='// Another approved provider diagnostic; preserve verbatim.\n'+old;
 assert.notEqual(hash(variant),hash(old));
 const f=fixture(variant);
 try{
  const out=await runR56PcApply({...f.opts,apply:true,waitMs:0});
  assert.equal(out.decision,'R56_PC_R45_PASSIVE_CAPTURE_INSTALLED');
  assert.equal(fs.readFileSync(f.target,'utf8'),patchR56Provider(variant));
  assert.equal(fs.existsSync(path.join(f.base,'local-cycle.lock')),false);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('R56 stops unchanged if the required R45 source anchors differ',async()=>{
 const variant=old.replace('&&built.coverage>=B1_R3_MIN_COVERAGE','&&unexpectedGate');
 const f=fixture(variant);
 try{
  const out=await runR56PcApply({...f.opts,apply:true,waitMs:0});
  assert.equal(out.decision,'R56_PATCH_ANCHOR_MISSING_OR_DUPLICATE_STOP');
  assert.equal(out.backupCreated,false);
  assert.equal(fs.readFileSync(f.target,'utf8'),variant);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.base,'config.json'),'utf8')).source,head);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('R56 preserves an active Core lock and refuses to modify PC files',async()=>{
 const f=fixture();
 try{
  const lock=path.join(f.base,'local-cycle.lock');
  const value=JSON.stringify({pid:process.pid,at:Date.now()});
  fs.writeFileSync(lock,value);
  const out=await runR56PcApply({...f.opts,apply:true,waitMs:0});
  assert.equal(out.decision,'R56_NATURAL_CORE_LOCK_WINDOW_EXPIRED_STOP');
  assert.equal(fs.readFileSync(lock,'utf8'),value);
  assert.equal(fs.readFileSync(f.target,'utf8'),old);
  assert.equal(out.backupCreated,false);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
