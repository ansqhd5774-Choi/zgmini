// R4 phase 2: manually gated companion-C D1 publisher.
// DRY_RUN by default. Never register in the existing PC scheduler or score chain.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {buildPreview} from './EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs';
import {
  validateEarningsCompanionPayload,earningsCompanionWriter,
  earningsCompanionFreshness,EARNINGS_C_ROUTE,
} from '../../worker/earnings-companion-c-r4.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const candidateBases=process.env.ZGMINI_PC_HOME?[process.env.ZGMINI_PC_HOME]
  :['E:\\ZGmini\\data\\pc-writer',path.join(os.homedir(),'.zgmini','pc-writer')];
const base=path.resolve(candidateBases.find(p=>fs.existsSync(path.join(p,'storage','core.sqlite')))
  ??candidateBases[0]);
const args=process.argv.slice(2);
const dryRun=args.includes('--dry-run')||!args.includes('--apply');
const confirm=args.includes('--confirm-earnings-c-d1-write');
const now=new Date().toISOString();
const stamp=now.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z').replace('T','-');
const logName=`EARNINGS_R4_C_D1_MANUAL_RESULT_${stamp}.txt`;
const logDirectories=[...new Set([
  process.env.ZGMINI_EARNINGS_C_LOG_DIR,
  path.join(os.homedir(),'Desktop'),root,
].filter(Boolean))];
const lines=['EARNINGS_COMPANION_R4_C_D1_MANUAL_V1',`UTC=${now}`,
  `MODE=${dryRun?'DRY_RUN':'APPLY_EXPLICIT'}`,`ROUTE=${EARNINGS_C_ROUTE}`];
let db;
try{
  if(args.some(arg=>!['--apply','--dry-run','--confirm-earnings-c-d1-write'].includes(arg)))
    throw Error('EARNINGS_C_INVALID_ARGUMENT');
  if(args.includes('--dry-run')&&args.includes('--apply'))
    throw Error('EARNINGS_C_CONFLICTING_MODE');
  if(!fs.existsSync(path.join(base,'storage','core.sqlite')))
    throw Error('PC_SQLITE_FILE_MISSING');
  db=new DatabaseSync(path.join(base,'storage','core.sqlite'),{readOnly:true,timeout:4000});
  db.exec('PRAGMA query_only=ON');
  // Must redo the R3D hash/cohort validation; do not trust editable preview JSON.
  const {payload,diagnostics}=buildPreview(db,{generatedAt:now});
  db.close();db=null;
  validateEarningsCompanionPayload(payload);
  lines.push(`R3D_REVALIDATION=${diagnostics.r3dStatus}`,
    `SOURCE_VERSION=${payload.sourceVersion}`,
    `SOURCE_STORED_AT=${payload.sourceStoredAt}`,
    `ROW_COUNT=${payload.rows.length}`,
    `READY_ROWS=${payload.coverage.ready}`,
    `FRESH_ROWS=${payload.rows.filter(r=>r.status==='READY'&&earningsCompanionFreshness(r).status==='FRESH').length}`);
  if(payload.rows.every(r=>r.status!=='READY'||earningsCompanionFreshness(r).status==='STALE'))
    throw Error('EARNINGS_C_NO_FRESH_ROWS');
  if(dryRun){
    lines.push('D1_QUERIES=0','D1_WRITES=0','RESULT=PASS_R4_C_D1_LOCAL_PREFLIGHT_ONLY');
  }else{
    // A human must opt in to the exact new key; existing score writer stays untouched.
    if(!confirm)throw Error('EARNINGS_C_APPLY_CONFIRMATION_REQUIRED');
    const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
    if(branch!=='main')throw Error('EARNINGS_C_APPLY_MAIN_ONLY');
    const source=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
    const config=JSON.parse(fs.readFileSync(path.join(base,'config.json'),'utf8'));
    if(config.collectionTarget!=='pc'||config.enabled!==true||config.source!==source)
      throw Error('EARNINGS_C_PC_SOURCE_NOT_APPROVED');
    execFileSync('git',['diff','--quiet','HEAD','--','worker','scripts/pc-writer'],
      {cwd:root,windowsHide:true,stdio:'pipe'});
    // Dynamic import: portable dry-run has no D1/auth dependencies whatsoever.
    const {client,credential}=await import('./d1.mjs');
    const remote=client(config,()=>credential(root));
    const result=await earningsCompanionWriter(remote.adapter(config.core,{allowWrites:true}))
      .write(payload,{storedAt:Date.now()});
    lines.push(`D1_RESULT=${result.status}`,
      `D1_READBACK=${result.status==='READBACK_VERIFIED'?'VERIFIED':'PREVIOUS_IDENTICAL'}`,
      `D1_SNAPSHOT_KEY=${result.key}`,
      `RESULT=${result.status==='READBACK_VERIFIED'?'PASS_R4_C_D1_READBACK':'PASS_R4_C_ALREADY_STORED'}`);
  }
}catch(error){
  const message=String(error?.message??'');
  lines.push(`ERROR=${/^[A-Z0-9_]{1,85}$/.test(message)?message:'EARNINGS_C_PREFLIGHT_OR_WRITE_FAILED'}`,
    'RESULT=R4_C_D1_MANUAL_FAILED');
  process.exitCode=1;
}finally{
  try{db?.close();}catch{}
  lines.push('BLS_PROVIDER_REQUESTS=0','PC_SQLITE_WRITES=0',
    'EXISTING_SCORE_WRITES=0','SCHEDULER_CHANGED=NO','WORKER_DEPLOYED=NO');
  let saved=false;
  for(const dir of logDirectories){
    try{
      const logPath=path.join(dir,logName);
      fs.writeFileSync(logPath,lines.join('\r\n')+'\r\n',{flag:'wx',encoding:'utf8'});
      console.log(`LOG=${logPath}`);
      saved=true;break;
    }catch{}
  }
  if(!saved){console.error('EARNINGS_C_TXT_LOG_WRITE_FAILED');process.exitCode=1;}
  console.log(lines.filter(x=>/^(MODE|RESULT|ERROR|D1_RESULT|ROW_COUNT|FRESH_ROWS)=/.test(x)).join('\n'));
}
