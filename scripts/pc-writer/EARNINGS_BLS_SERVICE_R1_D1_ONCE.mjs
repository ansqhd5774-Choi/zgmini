// Manual-only WPSFD42 extension publisher: independent D1 checkpoint, never the core five-row key.
// --dry-run is strictly local/read-only. --apply requires an explicit confirmation and source gates.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {buildServiceSourcePreview} from './EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs';
import {inspectD1Source,validateD1DualSource} from './EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs';
import {earningsCompanionFreshness,earningsCompanionWriter,
  validateEarningsCompanionPayload,EARNINGS_C_SERVICE_SNAPSHOT_KEY}
  from '../../worker/earnings-companion-c-r4.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const stageRoot=path.resolve(HERE,'../..');
const operationalRoot=process.env.ZGMINI_EARNINGS_C_OPERATIONAL_ROOT;
const base=path.resolve(process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer');
const now=new Date().toISOString();
const stamp=now.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z').replace('T','-');
const args=process.argv.slice(2);
const apply=args.includes('--apply');
const lines=['EARNINGS_BLS_SERVICE_R1_D1_ONCE',`UTC=${now}`,
  `MODE=${apply?'APPLY_EXPLICIT':'READ_ONLY_PREFLIGHT'}`,
  `SNAPSHOT_KEY=${EARNINGS_C_SERVICE_SNAPSHOT_KEY}`,
  'BASE_SNAPSHOT_KEY_WRITES=0','SCORE_WRITES=0'];
let db;
let exitCode=0;
try {
  if(args.some(arg=>!['--dry-run','--apply','--confirm-earnings-c-service-d1-write'].includes(arg))
    ||args.includes('--apply')&&args.includes('--dry-run'))
    throw Error('EARNINGS_C_SERVICE_INVALID_ARGUMENT');
  if(apply&&!args.includes('--confirm-earnings-c-service-d1-write'))
    throw Error('EARNINGS_C_SERVICE_APPLY_CONFIRMATION_REQUIRED');
  if(!operationalRoot||!fs.existsSync(operationalRoot))
    throw Error('EARNINGS_C_APPROVED_OPERATIONAL_ROOT_REQUIRED');
  const config=JSON.parse(fs.readFileSync(path.join(base,'config.json'),'utf8'));
  const publisher=inspectD1Source(stageRoot,{publisher:true});
  const operational=inspectD1Source(operationalRoot);
  const approved=validateD1DualSource({config,publisher,operational});
  // Never authorize an untracked local script merely because the other publisher files are clean.
  execFileSync('git',['-C',stageRoot,'ls-files','--error-unmatch','--',
    'scripts/pc-writer/EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs',
    'scripts/pc-writer/EARNINGS_BLS_SERVICE_R1_D1_PREFLIGHT.cmd',
    'scripts/pc-writer/EARNINGS_BLS_SERVICE_R1_D1_APPLY.cmd'],
  {encoding:'utf8',windowsHide:true,timeout:15000,stdio:['ignore','pipe','pipe']});
  lines.push('PUBLISHER_BRANCH=main',`PUBLISHER_SHA=${approved.publisherSha}`,
    `OPERATIONAL_SHA=${approved.approvedOperationalSha}`,
    'CONFIG_SOURCE_MATCH=YES','SOURCE_GATES=PASS','CONFIG_WRITES=0');

  const dbPath=path.join(base,'storage','core.sqlite');
  if(!fs.existsSync(dbPath))throw Error('PC_SQLITE_FILE_MISSING');
  db=new DatabaseSync(dbPath,{readOnly:true,timeout:4000});
  db.exec('PRAGMA query_only=ON');
  const {payload,diagnostics}=buildServiceSourcePreview(db,{generatedAt:now});
  db.close();db=null;
  validateEarningsCompanionPayload(payload);
  if(payload.coverage.configured!==2||payload.rows.length!==2
    ||payload.rows.some(row=>row.seriesId!=='WPSFD42'))
    throw Error('EARNINGS_C_SERVICE_UNEXPECTED_ROWS');
  const fresh=payload.rows.filter(row=>row.status==='READY'
    &&earningsCompanionFreshness(row).status==='FRESH').length;
  lines.push(`SOURCE_VERSION=${payload.sourceVersion}`,
    `SOURCE_STORED_AT=${payload.sourceStoredAt}`,
    `WPSFD42_VERIFIED_SNAPSHOTS=${diagnostics.snapshotsChecked}`,
    `ROW_COUNT=${payload.rows.length}`,`FRESH_READY_ROWS=${fresh}`);
  if(fresh===0)throw Error('EARNINGS_C_SERVICE_NO_FRESH_ROWS');

  if(!apply){
    lines.push('D1_QUERIES=0','D1_WRITES=0',
      'RESULT=PASS_EARNINGS_C_SERVICE_D1_PREFLIGHT_ONLY');
  }else{
    const {client,credential}=await import('./d1.mjs');
    const remote=client(config,()=>credential(operationalRoot));
    const result=await earningsCompanionWriter(remote.adapter(config.core,{allowWrites:true}),
      {snapshotKey:EARNINGS_C_SERVICE_SNAPSHOT_KEY}).write(payload,{storedAt:Date.now()});
    if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(result.status)
      ||result.key!==EARNINGS_C_SERVICE_SNAPSHOT_KEY)
      throw Error('EARNINGS_C_SERVICE_READBACK_NOT_VERIFIED');
    lines.push(`D1_RESULT=${result.status}`,
      `D1_READBACK=${result.status==='READBACK_VERIFIED'?'VERIFIED':'PREVIOUS_IDENTICAL'}`,
      `RESULT=${result.status==='READBACK_VERIFIED'
        ?'PASS_EARNINGS_C_SERVICE_D1_READBACK':'PASS_EARNINGS_C_SERVICE_ALREADY_STORED'}`);
  }
}catch(error){
  const code=String(error?.message??'');
  lines.push(`ERROR=${/^[A-Z0-9_]{1,85}$/.test(code)?code:'EARNINGS_C_SERVICE_D1_FAILED'}`,
    'RESULT=FAIL_EARNINGS_C_SERVICE_D1');
  exitCode=1;
}finally{
  try{db?.close();}catch{}
  lines.push('PC_SQLITE_WRITES=0','EXISTING_C_CHECKPOINT_WRITES=0',
    'SCHEDULER_CHANGED=NO','WORKER_DEPLOYED=NO');
  try{
    const file=path.join(HERE,`EARNINGS_BLS_SERVICE_R1_D1_RESULT_${stamp}.txt`);
    fs.writeFileSync(file,lines.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});
    console.log(`LOG=${file}`);
  }catch{
    console.error('ERROR=EARNINGS_C_SERVICE_RESULT_TXT_WRITE_FAILED');
    exitCode=1;
  }
  console.log(lines.filter(line=>/^(MODE|RESULT|ERROR|FRESH_READY_ROWS|D1_RESULT)=/.test(line))
    .join('\n'));
  process.exitCode=exitCode;
}
