// R72: narrowly recover ONE exact HTTP 502 checkpoint left by the approved
// existing R35 collector, preserve a rollback copy, and rerun existing R48.
// Never delete a raw page, change the roster, publish D1 or modify tasks.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {r71Preflight,runR71PrivateRecovery} from './theme-nine-r71-private-recovery-once.mjs';

const HOME='E:/ZGmini/data/themes/legacy-nine-r35-delta';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Object.assign(new Error('R72_'+code),{code:'R72_'+code});};
const statePattern=/^delta-[a-f0-9]{20}\.json$/;
const rawPattern=/^raw\/[A-Z][A-Z0-9.]{0,11}_[a-f0-9]{64}\.jsonl$/;

export function inspectR72Checkpoint({home=HOME,now=new Date(),allowNoFailure=false}={}){
  if(!fs.existsSync(home))fail('DELTA_HOME_ABSENT');
  const homeReal=fs.realpathSync(home);
  if(fs.existsSync(path.join(homeReal,'state','delta.lock')))
    fail('ACTIVE_COLLECTION_LOCK_PRESENT');
  const manifestFile=path.join(homeReal,'raw-manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  if(manifest.version!==1||manifest.project!=='legacy-nine-r35-delta'||
     manifest.source!=='https://getmarkethistory.com'||
     manifest.licenseStatus!=='PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED'||
     !/^[a-f0-9]{64}$/.test(manifest.rosterSha256)||
     !Array.isArray(manifest.files))fail('MANIFEST_CONTRACT');
  const indexed=new Map();
  for(const entry of manifest.files){
    if(!rawPattern.test(entry.path)||entry.path!==`raw/${entry.symbol}_${entry.sha256}.jsonl`||
      indexed.has(entry.path)||entry.priceMode!=='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE')
      fail('RAW_MANIFEST_IDENTITY');
    const sourcePath=path.join(homeReal,...entry.path.split('/'));
    if(!fs.existsSync(sourcePath)||!fs.statSync(sourcePath).isFile())
      fail('RAW_MANIFEST_SHA');
    const real=fs.realpathSync(sourcePath),rel=path.relative(homeReal,real);
    if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel)||
       sha(fs.readFileSync(sourcePath))!==entry.sha256)
      fail('RAW_MANIFEST_SHA');
    indexed.set(entry.path,entry);
  }
  const directory=path.join(homeReal,'state');
  const candidates=fs.readdirSync(directory).filter(x=>statePattern.test(x));
  const failed=[];
  for(const name of candidates){
    const statePath=path.join(directory,name);
    const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
    if(state.project!=='legacy-nine-r35-delta'||state.version!==1||
       state.rosterSha256!==manifest.rosterSha256||
       !/^20\d{2}-\d{2}-\d{2}$/.test(state.start)||
       !/^20\d{2}-\d{2}-\d{2}$/.test(state.end)||
       Object.keys(state.symbols??{}).length!==64||!state.symbols.SPY)
      fail('CHECKPOINT_CONTRACT');
    for(const [symbol,checkpoint] of Object.entries(state.symbols)){
      if(!Array.isArray(checkpoint.files)||typeof checkpoint.complete!=='boolean')
        fail('CHECKPOINT_SYMBOL_CONTRACT');
      for(const page of checkpoint.files){
        if(indexed.get(page.path)?.sha256!==page.sha256||
           indexed.get(page.path)?.symbol!==symbol)fail('CHECKPOINT_PAGE_REFERENCE');
      }
    }
    if(state.failedAt||state.failure)failed.push({name,statePath,state});
  }
  if(allowNoFailure&&failed.length===0)return {noFailed:true,
    manifestPagesVerified:indexed.size,allRawPagesShaVerified:true};
  if(failed.length!==1)fail('EXPECTED_ONE_FAILED_CHECKPOINT');
  const selected=failed[0];
  if(selected.state.failure!=='STOP_HTTP_502'||
     !/20\d{2}-\d{2}-\d{2}T/.test(selected.state.failedAt??''))
    fail('FAILURE_NOT_EXACT_HTTP_502');
  const ageMinutes=Math.floor((now.getTime()-Date.parse(selected.state.failedAt))/60000);
  if(!Number.isFinite(ageMinutes)||ageMinutes<0||ageMinutes>24*60)
    fail('FAILURE_AGE_INVALID');
  return {targetName:selected.name,start:selected.state.start,end:selected.state.end,
    failedAt:selected.state.failedAt,ageMinutes,
    sourceFailure:selected.state.failure,manifestPagesVerified:indexed.size,
    completedSymbols:Object.values(selected.state.symbols).filter(s=>s.complete).length,
    allRawPagesShaVerified:true,
    statePath:selected.statePath,state:selected.state};
}

export function recoverR72Checkpoint({home=HOME,now=new Date(),
  preflightFn=r71Preflight}={}){
  const ready=preflightFn({now});
  if(!ready.canRun)fail('PRIVATE_RUN_PREFLIGHT_NOT_READY');
  const inspected=inspectR72Checkpoint({home,now});
  const oldBytes=fs.readFileSync(inspected.statePath);
  // NEVER use .json here: R47 treats every delta-*.json as an active checkpoint.
  const backup=inspected.statePath+'.r72-backup-'+Date.now()+'.bak';
  fs.copyFileSync(inspected.statePath,backup,fs.constants.COPYFILE_EXCL);
  if(sha(fs.readFileSync(backup))!==sha(oldBytes))fail('BACKUP_READBACK');
  const next={...inspected.state};
  delete next.failedAt;
  delete next.failure;
  const tmp=inspected.statePath+'.r72-'+process.pid+'.tmp';
  fs.writeFileSync(tmp,JSON.stringify(next,null,2)+'\n',{flag:'wx'});
  try{fs.renameSync(tmp,inspected.statePath);}
  finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
  const readback=JSON.parse(fs.readFileSync(inspected.statePath,'utf8'));
  if(readback.failedAt||readback.failure||
    sha(Buffer.from(JSON.stringify(readback)))!==sha(Buffer.from(JSON.stringify(next))))
    fail('STATE_READBACK');
  return {status:'R72_502_CHECKPOINT_RECOVERED_WITH_BACKUP',
    target:inspected.targetName,backup: path.basename(backup),
    previousFailure:inspected.sourceFailure,
    manifestPagesVerified:inspected.manifestPagesVerified,
    completedSymbolsPreserved:inspected.completedSymbols,
    rawPagesChanged:0,manifestChanged:false,taskWrites:0,d1Writes:0};
}

function publicSafe(info){
  const {statePath,state,...safe}=info;return safe;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(!['--inspect','--recover-and-run'].includes(process.argv[2])||process.argv.length!==3)
      fail('USAGE');
    if(process.platform!=='win32')fail('WINDOWS_PC_REQUIRED');
    if(process.argv[2]==='--inspect'){
      const info=inspectR72Checkpoint();
      process.stdout.write(JSON.stringify({report:'THEME_NINE_R72_TRANSIENT_INSPECT',
        ...publicSafe(info),taskWrites:0,d1Writes:0},null,2)+'\n');
    }else{
      const repair=recoverR72Checkpoint();
      process.stdout.write(JSON.stringify(repair,null,2)+'\n');
      const run=runR71PrivateRecovery();
      process.stdout.write(JSON.stringify({report:'R72_RESUMED_EXISTING_R48',...run},null,2)+'\n');
      if(run.existingPrivateCommandExit!==0)process.exitCode=3;
    }
  }catch(error){
    process.stderr.write(JSON.stringify({status:'STOP_R72_NO_UNVERIFIED_RECOVERY',
      reason:error?.code??'UNEXPECTED',taskWrites:0,d1Writes:0})+'\n');
    process.exitCode=1;
  }
}
