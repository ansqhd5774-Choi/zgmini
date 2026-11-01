import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gitBlobSha,patchR45Collector,runR45PcDetach,
 R45_OLD_COLLECTOR_BLOB,R45_NEW_COLLECTOR_BLOB} from '../scripts/pc-writer/market-calendar-r45-pc-detach.mjs';

const CURRENT=fileURLToPath(new URL('../scripts/pc-writer/collect-local.mjs',import.meta.url));
const approvedHead='154c5ac25120ecf8292b630ca9b1e30edad1ed75';
const worktreeId='d0a4b3cb8b95';
const importAnchor="import {collectReleaseCalendar} from './release-calendar.mjs';\n";
const extraImport="import {captureR45MarketParquetPair} from './market-calendar-r45-marketparquet-capture.mjs';\n";
const extraObserver=" let r45Capture={status:'NOT_OBSERVED'};\n"+
 " env.R45_MARKETPARQUET_SNAPSHOT_OBSERVER=async snapshot=>{\n"+
 "  try{r45Capture=captureR45MarketParquetPair({base,...snapshot});}\n"+
 "  catch{r45Capture={status:'R45_CAPTURE_FAILED_PRESERVE_B1'};}\n"+
 " };\n";
const extraReport='  report.marketCalendarR45={status:r45Capture.status,previous:r45Capture.previous?.status??null,\n'+
 '   current:r45Capture.current?.status??null,previousTickerCount:r45Capture.previous?.tickerCount??null,\n'+
 '   currentTickerCount:r45Capture.current?.tickerCount??null,providerCallsAdded:0,\n'+
 '   dbWrites:0,remoteWrites:0,published:false};\n';
const once=(src,anchor,extra)=>{
 assert.equal(src.split(anchor).length,2,'expected unique source anchor');
 return src.replace(anchor,anchor+extra);
};
function installedSource(){
 let s=fs.readFileSync(CURRENT,'utf8');
 assert.equal(gitBlobSha(Buffer.from(s)),R45_NEW_COLLECTOR_BLOB);
 s=once(s,importAnchor,extraImport);
 s=once(s,"ZGMINI_COMPUTE_TARGET:'pc'};\n",extraObserver);
 s=once(s,'providers,quota:quota.summary()};\n',extraReport);
 return s;
}
function setup(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r45-detach-'));
 const base=path.join(root,'private');fs.mkdirSync(base);
 const target=path.join(root,'scripts','pc-writer','collect-local.mjs');
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,installedSource());
 const config={source:approvedHead,enabled:true,collectionTarget:'pc'};
 fs.writeFileSync(path.join(base,'config.json'),JSON.stringify(config));
 const stub={base,allowNonWindows:true,taskXml:()=>'<Task/>',
  resolveCore:async()=>({status:'R51_SCHEDULED_CORE_ORIGIN_RESOLVED',root,rootWorktreeId:worktreeId}),
  gitCall:(_,args)=>{
   if(args[0]==='rev-parse'&&args[1]==='--show-toplevel')return root;
   if(args[0]==='rev-parse'&&args[1]==='HEAD')return approvedHead;
   if(args[0]==='status')return '';
   if(args[0]==='var')return 'tester <test@example.com>';
   throw Error('UNEXPECTED_GIT_COMMAND');
  }};
 return {root,base,target,stub};
}

test('R45 exact PC collector removes only three anchored segments, preserving other bytes',()=>{
 const old=installedSource();
 assert.equal(gitBlobSha(Buffer.from(old)),R45_OLD_COLLECTOR_BLOB);
 const current=fs.readFileSync(CURRENT,'utf8');
 assert.equal(patchR45Collector(old),current);
 assert.equal(patchR45Collector(old.replaceAll('\n','\r\n')),current.replaceAll('\n','\r\n'));
 assert.throws(()=>patchR45Collector(old+'\n'),/R45_DETACH_OLD_FILE_BLOB_CHANGED_STOP/);
 assert.throws(()=>patchR45Collector(old.replace('NOT_OBSERVED','READY')),
  /R45_DETACH_OLD_FILE_BLOB_CHANGED_STOP/);
});

test('R45 PC detach default preflight never writes source, lock, backup or config',async()=>{
 const t=setup();
 try{
  const old=fs.readFileSync(t.target);
  const config=fs.readFileSync(path.join(t.base,'config.json'));
  const result=await runR45PcDetach(t.stub);
  assert.equal(result.decision,'R45_DETACH_PREFLIGHT_READY_NO_CHANGES');
  assert.equal(result.changedFiles.length,0);
  assert.equal(result.backupCreated,false);
  assert.equal(result.providerCallsAdded,0);
  assert.equal(result.schedulerChanged,false);
  assert.deepEqual(fs.readFileSync(t.target),old);
  assert.deepEqual(fs.readFileSync(path.join(t.base,'config.json')),config);
  assert.equal(fs.existsSync(path.join(t.base,'local-cycle.lock')),false);
  assert.equal(fs.existsSync(path.join(t.base,'market-calendar-r45-detach-backups')),false);
 }finally{fs.rmSync(t.root,{recursive:true,force:true});}
});

test('R45 PC detach refuses unapproved source or live Core lock without touching files',async()=>{
 const t=setup();
 try{
  const before=fs.readFileSync(t.target);
  const wrong={...t.stub,gitCall:(root,args)=>args[0]==='rev-parse'&&args[1]==='HEAD'?
   'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa':t.stub.gitCall(root,args)};
  assert.equal((await runR45PcDetach(wrong)).decision,'R45_DETACH_CONFIG_SOURCE_CHANGED_STOP');
  const lockPath=path.join(t.base,'local-cycle.lock');
  const lock=JSON.stringify({pid:process.pid,at:Date.now()});fs.writeFileSync(lockPath,lock);
  const result=await runR45PcDetach({...t.stub,apply:true});
  assert.equal(result.decision,'R45_DETACH_CORE_LOCK_BUSY_STOP');
  assert.equal(fs.readFileSync(lockPath,'utf8'),lock);
  assert.deepEqual(fs.readFileSync(t.target),before);
  assert.equal(fs.existsSync(path.join(t.base,'market-calendar-r45-detach-backups')),false);
 }finally{fs.rmSync(t.root,{recursive:true,force:true});}
});

test('R45 PC detach identifies R51 launcher drift without exposing task contents or writing',async()=>{
 const t=setup();
 try{
  const before=fs.readFileSync(t.target);
  const result=await runR45PcDetach({...t.stub,
   resolveCore:async()=>({status:'R51_OUTER_WRAPPER_CHANGED',root:null,
    rootWorktreeId:null,outerHashMatched:false,coreVbsCount:0})});
  assert.equal(result.decision,'R45_DETACH_CORE_LAUNCHER_CHANGED_STOP');
  assert.equal(result.originStatus,'R51_OUTER_WRAPPER_CHANGED');
  assert.equal(result.originOuterHashMatched,false);
  assert.equal(result.originCoreVbsCount,0);
  assert.equal(result.configSourceMatchesApproved,true);
  assert.equal(result.changedFiles.length,0);
  assert.equal(result.backupCreated,false);
  assert.equal(fs.existsSync(path.join(t.base,'local-cycle.lock')),false);
  assert.deepEqual(fs.readFileSync(t.target),before);
  assert.doesNotMatch(JSON.stringify(result),new RegExp(t.root.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 }finally{fs.rmSync(t.root,{recursive:true,force:true});}
});

test('R45 PC detach applies exactly one local file with backup, commit and source readback',async()=>{
 const t=setup();
 try{
  const newHead='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  let head=approvedHead,commits=0;
  const gitCall=(root,args)=>{
   if(args[0]==='rev-parse'){
    if(args[1]==='--show-toplevel')return root;
    if(args[1]==='HEAD')return head;
    if(args[1]==='HEAD^')return approvedHead;
    if(args[1]==='HEAD:scripts/pc-writer/collect-local.mjs')return R45_NEW_COLLECTOR_BLOB;
   }
   if(args[0]==='status')return '';
   if(args[0]==='var')return 'tester <test@example.com>';
   if(args[0]==='add')return '';
   if(args[0]==='commit'){head=newHead;commits++;return 'committed';}
   if(args[0]==='diff')return 'scripts/pc-writer/collect-local.mjs';
   throw Error('UNEXPECTED_GIT_COMMAND '+args.join(' '));
  };
  const options={...t.stub,gitCall,apply:true};
  const done=await runR45PcDetach(options);
  assert.equal(done.decision,'R45_DETACH_INSTALLED_LOCAL_ONLY');
  assert.equal(commits,1);
  assert.deepEqual(done.changedFiles,['scripts/pc-writer/collect-local.mjs']);
  assert.equal(fs.readFileSync(t.target,'utf8'),fs.readFileSync(CURRENT,'utf8'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(t.base,'config.json'),'utf8')).source,newHead);
  assert.equal(fs.existsSync(path.join(t.base,'local-cycle.lock')),false);
  assert.equal(fs.existsSync(path.join(t.base,'market-calendar-r45-detach-backups',done.backupId,'collect-local.mjs')),true);
  const again=await runR45PcDetach(options);
  assert.equal(again.decision,'R45_DETACH_ALREADY_OFF_NO_CHANGES');
  assert.equal(commits,1);
 }finally{fs.rmSync(t.root,{recursive:true,force:true});}
});
