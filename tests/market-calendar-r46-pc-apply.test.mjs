import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {R46_PATCH_PATHS,R46_ALL_PATHS,R46_SIDECAR,patchR46Source} from '../scripts/pc-writer/market-calendar-r46-pc-patch.mjs';
import {runR46PcApply} from '../scripts/pc-writer/market-calendar-r46-pc-apply.mjs';
import {verifyR46PrivateDays} from '../scripts/pc-writer/market-calendar-r46-pc-verify.mjs';
import {captureR45MarketParquetPair} from '../scripts/pc-writer/market-calendar-r45-marketparquet-capture.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=fs.existsSync(path.resolve(here,'..','package.json'))?path.resolve(here,'..'):here;
const sidecarPath=fs.existsSync(path.join(repoRoot,R46_SIDECAR))?
 path.join(repoRoot,R46_SIDECAR):path.join(here,'market-calendar-r45-marketparquet-capture.mjs');
const localNames=['breadth-b1-r6-marketparquet-provider.mjs','breadth-b1-r3-collector.mjs','collect-local.mjs'];
const approved=R46_PATCH_PATHS.map((relative,i)=>{
 const repo=path.join(repoRoot,relative);
 return fs.readFileSync(fs.existsSync(repo)?repo:path.join(here,localNames[i]),'utf8');
});

function removeOnce(source,exact){
 const i=source.indexOf(exact);assert.notEqual(i,-1,'approved R45 fixture fragment absent');
 assert.equal(source.indexOf(exact,i+1),-1,'approved fragment duplicated');
 return source.slice(0,i)+source.slice(i+exact.length);
}
function baseline(relative,modified){
 let value=modified;
 if(relative===R46_PATCH_PATHS[0]){
  value=removeOnce(value,'  B1_R3_MIN_COVERAGE,\n');
  value=removeOnce(value,'  snapshotObserver=null,\n');
  value=removeOnce(value,'  // An optional PC-private R45 observer reuses the two already downloaded files.\n'+
   '  // Its failure cannot change B1 source coverage, scoring, or fallbacks.\n'+
   '  if(typeof snapshotObserver==="function"&&built.coverage>=B1_R3_MIN_COVERAGE){\n'+
   '    try{await snapshotObserver({tradeDate,previousDate,currentRows,previousRows});}\n'+
   '    catch{/* Sidecar capture is strictly best effort. */}\n'+
   '  }\n');
 }else if(relative===R46_PATCH_PATHS[1]){
  value=removeOnce(value,'  snapshotObserver=env?.R45_MARKETPARQUET_SNAPSHOT_OBSERVER??null,\n');
  value=value.replace(
   '      const primary=await recoveryFetcher({symbols:universe.symbols,asOfDate,fetchImpl,snapshotObserver});\n',
   '      const primary=await recoveryFetcher({symbols:universe.symbols,asOfDate,fetchImpl});\n');
 }else{
  value=removeOnce(value,"import {captureR45MarketParquetPair} from './market-calendar-r45-marketparquet-capture.mjs';\n");
  value=removeOnce(value," let r45Capture={status:'NOT_OBSERVED'};\n"+
   " env.R45_MARKETPARQUET_SNAPSHOT_OBSERVER=async snapshot=>{\n"+
   "  try{r45Capture=captureR45MarketParquetPair({base,...snapshot});}\n"+
   "  catch{r45Capture={status:'R45_CAPTURE_FAILED_PRESERVE_B1'};}\n"+
   " };\n");
  value=removeOnce(value,'  report.marketCalendarR45={status:r45Capture.status,previous:r45Capture.previous?.status??null,\n'+
   '   current:r45Capture.current?.status??null,previousTickerCount:r45Capture.previous?.tickerCount??null,\n'+
   '   currentTickerCount:r45Capture.current?.tickerCount??null,providerCallsAdded:0,\n'+
   '   dbWrites:0,remoteWrites:0,published:false};\n');
 }
 return value;
}
const cleanBases=R46_PATCH_PATHS.map((p,i)=>baseline(p,approved[i]));
const digest=value=>createHash('sha256').update(value).digest('hex');
const g=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();

test('R46 three minimal patch hunks reproduce approved R45 source exactly',()=>{
 R46_PATCH_PATHS.forEach((p,i)=>{
  assert.equal(patchR46Source(p,cleanBases[i]),approved[i]);
  assert.equal(patchR46Source(p,cleanBases[i].replaceAll('\n','\r\n')),
   approved[i].replaceAll('\n','\r\n'));
  assert.throws(()=>patchR46Source(p,approved[i]),/R46_ALREADY_MODIFIED_OR_PARTIAL_STOP/);
  const altered=i===0?cleanBases[i].replace('B1_R3_MARKETPARQUET_SOURCE_CONTRACT,',
   'B1_R3_OTHER_SOURCE_CONTRACT,'):i===1?
   cleanBases[i].replace('recoveryFetcher=fetchMarketParquetLatestPairs,',
    'recoveryFetcher=customFetcher,'):
   cleanBases[i].replace("import {collectReleaseCalendar} from './release-calendar.mjs';",
    "import {collectAnotherCalendar} from './release-calendar.mjs';");
  assert.throws(()=>patchR46Source(p,altered),/R46_ANCHOR_CHANGED_STOP/);
  assert.ok(patchR46Source(p,cleanBases[i]+'\n// unrelated approved worktree note\n')
   .endsWith('// unrelated approved worktree note\n'));
 });
});

function fixture(){
 const top=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r46-'));
 const root=path.join(top,'pc-project');
 const base=path.join(top,'pc-home');
 fs.mkdirSync(root);fs.mkdirSync(base);
 for(let i=0;i<3;i++){
  const target=path.join(root,...R46_PATCH_PATHS[i].split('/'));
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,cleanBases[i]);
 }
 g(root,'init','-q');g(root,'config','user.name','R46 Test');g(root,'config','user.email','r46@example.invalid');
 g(root,'add','--',...R46_PATCH_PATHS);g(root,'commit','-q','-m','fixture approved PC source');
 const head=g(root,'rev-parse','HEAD');
 fs.writeFileSync(path.join(base,'config.json'),JSON.stringify({source:head,enabled:true,
  collectionTarget:'pc',otherSettingsPreserved:true}));
 const expectedWorktreeId=digest(path.normalize(root).replaceAll('\\','/').toLowerCase()).slice(0,12);
 const options={base,candidatePath:sidecarPath,getTaskXml:()=>'',getRoot:()=>root,
  expectedWorktreeId,allowNonWindows:true};
 return {top,root,base,head,options};
}

test('R46 PC fixture: preflight stays read-only and guarded install commits only four files',()=>{
 const f=fixture();
 try{
  const p=runR46PcApply(f.options);
  assert.equal(p.decision,'R46_PREFLIGHT_READY_NO_CHANGES');
  assert.deepEqual(p.changedFiles,[]);
  assert.equal(g(f.root,'rev-parse','HEAD'),f.head);
  assert.equal(fs.existsSync(path.join(f.root,...R46_SIDECAR.split('/'))),false);
  const r=runR46PcApply({...f.options,apply:true});
  assert.equal(r.decision,'R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION',JSON.stringify(r));
  assert.equal(r.backupCreated,true);
  assert.equal(r.providerCallsAdded,0);
  assert.equal(r.gitPushed,false);
  assert.equal(r.forcedCollection,false);
  assert.equal(g(f.root,'rev-parse','HEAD^'),f.head);
  assert.deepEqual(g(f.root,'diff','--name-only',f.head,'HEAD').split('\n').sort(),
   [...R46_ALL_PATHS].sort());
  R46_PATCH_PATHS.forEach((relative,i)=>assert.equal(
   fs.readFileSync(path.join(f.root,...relative.split('/')),'utf8'),approved[i]));
  assert.equal(fs.readFileSync(path.join(f.root,...R46_SIDECAR.split('/'))).length,
   fs.readFileSync(sidecarPath).length);
  const config=JSON.parse(fs.readFileSync(path.join(f.base,'config.json'),'utf8'));
  assert.equal(config.source,g(f.root,'rev-parse','HEAD'));
  assert.equal(config.otherSettingsPreserved,true);
  assert.equal(fs.existsSync(path.join(f.base,'local-cycle.lock')),false);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R46 PC fixture: source drift fails closed and existing source remains unchanged',()=>{
 const f=fixture();
 try{
  const target=path.join(f.root,...R46_PATCH_PATHS[2].split('/'));
  fs.appendFileSync(target,'\n// unapproved local modification\n');
  const result=runR46PcApply({...f.options,apply:true});
  assert.equal(result.decision,'R46_PROTECTED_WORKTREE_DIRTY_STOP');
  assert.equal(g(f.root,'rev-parse','HEAD'),f.head);
  assert.equal(fs.existsSync(path.join(f.root,...R46_SIDECAR.split('/'))),false);
  assert.equal(fs.existsSync(path.join(f.base,'local-cycle.lock')),false);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R46 PC fixture: an active Core lock prevents every source write',()=>{
 const f=fixture();
 try{
  const lock=path.join(f.base,'local-cycle.lock');
  fs.writeFileSync(lock,JSON.stringify({pid:123,at:123456}));
  const r=runR46PcApply({...f.options,apply:true});
  assert.equal(r.decision,'R46_CORE_LOCK_BUSY_STOP');
  assert.equal(fs.existsSync(lock),true);
  assert.equal(g(f.root,'rev-parse','HEAD'),f.head);
  assert.equal(fs.existsSync(path.join(f.root,...R46_SIDECAR.split('/'))),false);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R46 PC fixture: unexpected post-write status triggers scoped rollback',()=>{
 const f=fixture();
 try{
  const stub=(root,args)=>args[0]==='status'&&args.includes('--untracked-files=all')&&
   fs.existsSync(path.join(root,...R46_SIDECAR.split('/')))?
   ' M lib/market-score/breadth-b1-r3-collector.mjs':g(root,...args);
  const r=runR46PcApply({...f.options,apply:true,gitCall:stub});
  assert.equal(r.rolledBack,true,JSON.stringify(r));
  assert.equal(r.decision,'R46_UNEXPECTED_MODIFIED_FILES_STOP');
  assert.equal(g(f.root,'rev-parse','HEAD'),f.head);
  assert.equal(fs.existsSync(path.join(f.root,...R46_SIDECAR.split('/'))),false);
  R46_PATCH_PATHS.forEach((relative,i)=>assert.equal(
   fs.readFileSync(path.join(f.root,...relative.split('/')),'utf8'),cleanBases[i]));
  assert.equal(fs.existsSync(path.join(f.base,'local-cycle.lock')),false);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R46 private day verifier reads rows only for integrity and reports dates/counts',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r46-v-'));
 try{
  const rows=date=>Array.from({length:3000},(_,i)=>({date,symbol:`SYM${i}`,
   asset_type:'stock',close:20+i/100,volume:5000+i}));
  captureR45MarketParquetPair({base,tradeDate:'2026-10-30',previousDate:'2026-10-29',
   currentRows:rows('2026-10-30'),previousRows:rows('2026-10-29'),
   now:Date.parse('2026-10-31T10:00:00Z')});
  const result=verifyR46PrivateDays({base});
  assert.equal(result.status,'R46_PRIVATE_TWO_OR_MORE_DAYS_VERIFIED');
  assert.equal(result.privateDayCount,2);
  assert.equal(result.recentDays[0].tickerCount,3000);
  assert.equal(JSON.stringify(result).includes('SYM123'),false);
  assert.equal(result.networkCalls,0);
  assert.equal(result.filesystemMutations,0);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
