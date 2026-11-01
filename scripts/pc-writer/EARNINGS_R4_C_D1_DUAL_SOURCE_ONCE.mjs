// Manual-only companion-C publisher. Not registered with any PC scheduler.
// The approved collector checkout and config.source are never mutated.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {buildPreview} from './EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs';
import {client,credential} from './d1.mjs';
import {validateEarningsCompanionPayload,earningsCompanionFreshness,
  earningsCompanionWriter,EARNINGS_C_SNAPSHOT_KEY} from '../../worker/earnings-companion-c-r4.mjs';
import {inspectD1Source,validateD1DualSource} from './EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs';

const stageRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const operationalRoot=process.env.ZGMINI_EARNINGS_C_OPERATIONAL_ROOT;
const base=path.resolve(process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer');
const now=new Date().toISOString();
const stamp=now.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z').replace('T','-');
const args=process.argv.slice(2);
const isApply=args.includes('--apply');
const lines=['EARNINGS_R4_C_D1_DUAL_SOURCE_ONCE',`UTC=${now}`,
  `MODE=${isApply?'APPLY_EXPLICIT':'READ_ONLY_PREFLIGHT'}`,
  `APPROVED_KEY=${EARNINGS_C_SNAPSHOT_KEY}`];
let db;
let resultCode=0;
try{
  if(args.some(arg=>!['--apply','--dry-run','--confirm-earnings-c-d1-write'].includes(arg))
    ||args.includes('--apply')&&args.includes('--dry-run'))
    throw Error('EARNINGS_C_INVALID_ARGUMENT');
  if(isApply&&!args.includes('--confirm-earnings-c-d1-write'))
    throw Error('EARNINGS_C_APPLY_CONFIRMATION_REQUIRED');
  if(!operationalRoot||!fs.existsSync(operationalRoot))
    throw Error('EARNINGS_C_APPROVED_OPERATIONAL_ROOT_REQUIRED');

  const config=JSON.parse(fs.readFileSync(path.join(base,'config.json'),'utf8'));
  const publisher=inspectD1Source(stageRoot,{publisher:true});
  const operational=inspectD1Source(operationalRoot);
  const approved=validateD1DualSource({config,publisher,operational});
  lines.push('PUBLISHER_BRANCH=main',
    `PUBLISHER_SHA=${approved.publisherSha}`,
    `OPERATIONAL_SHA=${approved.approvedOperationalSha}`,
    'PC_CONFIG_SOURCE_MATCH=YES','SOURCE_GATES=PASS',
    'PC_CONFIG_WRITES=0','GIT_SOURCE_UPDATES=0');

  const dbPath=path.join(base,'storage','core.sqlite');
  if(!fs.existsSync(dbPath))throw Error('PC_SQLITE_FILE_MISSING');
  db=new DatabaseSync(dbPath,{readOnly:true,timeout:4000});
  db.exec('PRAGMA query_only=ON');
  const {payload,diagnostics}=buildPreview(db,{generatedAt:now});
  db.close();db=null;
  validateEarningsCompanionPayload(payload);
  const fresh=payload.rows.filter(row=>row.status==='READY'
    &&earningsCompanionFreshness(row).status==='FRESH').length;
  lines.push(`R3D_REVALIDATION=${diagnostics.r3dStatus}`,
    `SOURCE_VERSION=${payload.sourceVersion}`,
    `SOURCE_STORED_AT=${payload.sourceStoredAt}`,
    `ROW_COUNT=${payload.rows.length}`,
    `FRESH_READY_ROWS=${fresh}`);
  if(fresh===0)throw Error('EARNINGS_C_NO_FRESH_ROWS');
  if(!isApply){
    lines.push('D1_QUERIES=0','D1_WRITES=0',
      'RESULT=PASS_R4_C_D1_DUAL_SOURCE_PREFLIGHT_ONLY');
  }else{
    // Resolve the existing credential from the operational checkout, not the stage.
    const remote=client(config,()=>credential(operationalRoot));
    const status=await earningsCompanionWriter(remote.adapter(config.core,{allowWrites:true}))
      .write(payload,{storedAt:Date.now()});
    if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(status.status)
      ||status.key!==EARNINGS_C_SNAPSHOT_KEY)
      throw Error('EARNINGS_C_D1_READBACK_NOT_VERIFIED');
    lines.push(`D1_RESULT=${status.status}`,
      `D1_READBACK=${status.status==='READBACK_VERIFIED'?'VERIFIED':'PREVIOUS_IDENTICAL'}`,
      `D1_SNAPSHOT_KEY=${status.key}`,
      `RESULT=${status.status==='READBACK_VERIFIED'?'PASS_R4_C_D1_READBACK':'PASS_R4_C_ALREADY_STORED'}`);
  }
}catch(error){
  const code=String(error?.message??'');
  lines.push(`ERROR=${/^[A-Z0-9_]{1,85}$/.test(code)?code:'EARNINGS_C_DUAL_SOURCE_FAILED'}`,
    'RESULT=R4_C_D1_DUAL_SOURCE_FAILED');
  resultCode=1;
}finally{
  try{db?.close();}catch{}
  lines.push('PC_SQLITE_WRITES=0','EXISTING_SCORE_WRITES=0',
    'SCHEDULER_CHANGED=NO','WORKER_DEPLOYED=NO');
  const locations=[process.env.ZGMINI_EARNINGS_C_LOG_DIR,
    path.join(os.homedir(),'Desktop'),stageRoot].filter(Boolean);
  let saved=false;
  for(const dir of [...new Set(locations)]){
    try{
      const dest=path.join(dir,`EARNINGS_R4_C_D1_DUAL_SOURCE_RESULT_${stamp}.txt`);
      fs.writeFileSync(dest,lines.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});
      console.log(`LOG=${dest}`);
      saved=true;break;
    }catch{}
  }
  if(!saved){console.error('ERROR=R4_C_DUAL_SOURCE_RESULT_TXT_WRITE_FAILED');resultCode=1;}
  console.log(lines.filter(line=>/^(MODE|RESULT|ERROR|D1_RESULT|FRESH_READY_ROWS)=/.test(line)).join('\n'));
  process.exitCode=resultCode;
}
