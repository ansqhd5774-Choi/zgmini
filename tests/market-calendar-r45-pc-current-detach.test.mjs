import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {removeCurrentR45Observer,runCurrentR45Detach} from '../scripts/pc-writer/market-calendar-r45-pc-current-detach.mjs';

const sha=s=>createHash('sha1').update(Buffer.from(`blob ${Buffer.byteLength(s)}\0`)).update(s).digest('hex');
const head='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const next='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const targetPath='scripts/pc-writer/collect-local.mjs';
const current=fileURLToPath(new URL('../scripts/pc-writer/collect-local.mjs',import.meta.url));
const lines=s=>s.replaceAll('\r\n','\n');
function insert(src,anchor,extra){
 assert.equal(src.split(anchor).length,2);
 return src.replace(anchor,anchor+extra);
}
function installed(){
 let s=fs.readFileSync(current,'utf8');
 s=insert(s,"import {collectReleaseCalendar} from './release-calendar.mjs';\n",
  "import {captureR45MarketParquetPair} from './market-calendar-r45-marketparquet-capture.mjs';\n");
 s=insert(s,"ZGMINI_COMPUTE_TARGET:'pc'};\n",
  " let r45Capture={status:'NOT_OBSERVED'};\n"+
  " env.R45_MARKETPARQUET_SNAPSHOT_OBSERVER=async snapshot=>{\n"+
  "  try{r45Capture=captureR45MarketParquetPair({base,...snapshot});}\n"+
  "  catch{r45Capture={status:'R45_CAPTURE_FAILED_PRESERVE_B1'};}\n"+
  " };\n");
 s=insert(s,'providers,quota:quota.summary()};\n',
  '  report.marketCalendarR45={status:r45Capture.status,previous:r45Capture.previous?.status??null,\n'+
  '   current:r45Capture.current?.status??null,previousTickerCount:r45Capture.previous?.tickerCount??null,\n'+
  '   currentTickerCount:r45Capture.current?.tickerCount??null,providerCallsAdded:0,\n'+
  '   dbWrites:0,remoteWrites:0,published:false};\n');
 // Represent unrelated PC-only modifications after R56. These must survive.
 return (s+'// R7 UNRELATED PC WRITER PRESERVED\n').replaceAll('\n','\r\n');
}
function setup(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r45-current-'));
 const base=path.join(root,'private');fs.mkdirSync(base);
 const target=path.join(root,...targetPath.split('/'));
 fs.mkdirSync(path.dirname(target),{recursive:true});
 const original=installed(),canonical=sha(lines(original));
 fs.writeFileSync(target,original);
 fs.writeFileSync(path.join(base,'config.json'),JSON.stringify({source:head,enabled:true,
  collectionTarget:'pc',privateKey:'NOT_FOR_REPORT'}));
 const shapes=['11111111','22222222','33333333'];
 const chain=()=>({status:'CORE_CHAIN_CANDIDATE_TRACED_REVIEW_REQUIRED',root,
  rootWorktreeId:'123456789abc',entryName:'local-cycle.mjs',referencedCandidateUsed:true,
  candidateRunOrdinal:2,coreChain:shapes.map(sha256=>({sha256}))});
 let gitHead=head,commits=0;
 const gitCall=(_,args)=>{
  if(args[0]==='rev-parse'){
   if(args[1]==='--show-toplevel')return root;
   if(args[1]==='HEAD')return gitHead;
   if(args[1]==='HEAD^')return head;
   if(args[1]===`HEAD:${targetPath}`)return sha(lines(fs.readFileSync(target,'utf8')));
  }
  if(args[0]==='hash-object')return sha(lines(fs.readFileSync(target,'utf8')));
  if(args[0]==='status')return '';
  if(args[0]==='var')return 'test <test@example.com>';
  if(args[0]==='add')return '';
  if(args[0]==='commit'){gitHead=next;commits++;return 'OK';}
  if(args[0]==='diff')return targetPath;
  throw Error('UNEXPECTED_GIT_OPERATION');
 };
 const options={base,allowNonWindows:true,taskXml:()=>'<Task/>',trace:chain,gitCall,
  testGate:{head,rawBlob:sha(original),worktreeId:'123456789abc',vbs:shapes}};
 return {root,base,target,original,canonical,options,commits:()=>commits};
}

test('current R45 patch removes only three exact segments and preserves all unrelated bytes',()=>{
 const source=installed();
 const expected=(fs.readFileSync(current,'utf8')+'// R7 UNRELATED PC WRITER PRESERVED\n')
  .replaceAll('\n','\r\n');
 assert.equal(removeCurrentR45Observer(source),expected);
 assert.throws(()=>removeCurrentR45Observer(source.replace('NOT_OBSERVED','OTHER')),
  /R45_CURRENT_ANCHOR_CHANGED_STOP/);
 assert.throws(()=>removeCurrentR45Observer(source+'\r\n// marketCalendarR45'),
  /R45_CURRENT_OTHER_OBSERVER_REFERENCE_STOP/);
});

test('read-only preflight verifies current PC SHA, EOL-aware canonical blob and anchors without writes',async()=>{
 const t=setup();
 try{
  const before=fs.readFileSync(t.target);
  const config=fs.readFileSync(path.join(t.base,'config.json'));
  const report=await runCurrentR45Detach(t.options);
  assert.equal(report.decision,'R45_CURRENT_PREFLIGHT_READY_NO_CHANGES');
  assert.equal(report.canonicalMatchesHead,true);
  assert.equal(report.lineEndings,'CRLF');
  assert.equal(report.changedFiles.length,0);
  assert.equal(report.backupCreated,false);
  assert.deepEqual(fs.readFileSync(t.target),before);
  assert.deepEqual(fs.readFileSync(path.join(t.base,'config.json')),config);
  assert.equal(fs.existsSync(path.join(t.base,'local-cycle.lock')),false);
  assert.equal(t.commits(),0);
  assert.doesNotMatch(JSON.stringify(report),/NOT_FOR_REPORT/);
 }finally{fs.rmSync(t.root,{recursive:true,force:true});}
});

test('current source mismatch and an existing Core lock each stop without changing PC',async()=>{
 const t=setup();
 try{
  const before=fs.readFileSync(t.target);
  assert.equal((await runCurrentR45Detach({...t.options,
   testGate:{...t.options.testGate,rawBlob:'c'.repeat(40)}})).decision,
   'R45_CURRENT_COLLECTOR_RAW_CHANGED_STOP');
  const lock=JSON.stringify({pid:process.pid,at:Date.now()});
  fs.writeFileSync(path.join(t.base,'local-cycle.lock'),lock);
  assert.equal((await runCurrentR45Detach({...t.options,apply:true})).decision,
   'R45_CURRENT_CORE_LOCK_NOT_FREE_STOP');
  assert.equal(fs.readFileSync(path.join(t.base,'local-cycle.lock'),'utf8'),lock);
  assert.deepEqual(fs.readFileSync(t.target),before);
  assert.equal(t.commits(),0);
 }finally{fs.rmSync(t.root,{recursive:true,force:true});}
});

test('explicit apply with fresh gates backs up, commits one file, and updates config locally',async()=>{
 const t=setup();
 try{
  const report=await runCurrentR45Detach({...t.options,apply:true});
  assert.equal(report.decision,'R45_CURRENT_INSTALLED_PC_LOCAL_ONLY');
  assert.equal(report.sourceCommitted,true);
  assert.deepEqual(report.changedFiles,[targetPath]);
  assert.equal(report.newSource,next);
  assert.equal(t.commits(),1);
  assert.equal(fs.readFileSync(t.target,'utf8'),removeCurrentR45Observer(t.original));
  assert.equal(JSON.parse(fs.readFileSync(path.join(t.base,'config.json'))).source,next);
  assert.equal(fs.existsSync(path.join(t.base,'local-cycle.lock')),false);
  assert.equal(fs.existsSync(path.join(t.base,'market-calendar-r45-detach-backups',
   report.backupId,'collect-local.mjs')),true);
 }finally{fs.rmSync(t.root,{recursive:true,force:true});}
});
