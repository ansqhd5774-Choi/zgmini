// Manual-only Census QFR D1 publisher: defaults to verified PC/local dry-run.
// The code must first be merged into an approved CLEAN main publisher checkout;
// a separate approved operational checkout must still match PC config.source.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {buildStoredQfrPreview} from './EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.mjs';
import {draftQfrPayload} from './EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_READONLY.mjs';
import {inspectD1Source,validateD1DualSource}
  from './EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs';
import {QFR_SNAPSHOT_KEY,QFR_SCHEMA,validateQfrCompanionPayload,
  qfrCompanionFreshness,qfrCompanionWriter}
  from '../../worker/earnings-companion-c-qfr-r1.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const STAGE=path.resolve(HERE,'../..');
const SHA=/^[a-f0-9]{64}$/;
const TRACKED=[
  'scripts/pc-writer/EARNINGS_CENSUS_QFR_R1_READONLY.mjs',
  'scripts/pc-writer/EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs',
  'scripts/pc-writer/EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.mjs',
  'scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_READONLY.mjs',
  'scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs',
  'scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_PREFLIGHT.cmd',
  'scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_APPLY.cmd',
  'scripts/pc-writer/EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs',
  'worker/earnings-companion-c-qfr-r1.mjs',
];

export function parseQfrD1Mode(args){
  if(args.length===0||(args.length===1&&args[0]==='--dry-run'))return {apply:false};
  if(args.length===2&&args[0]==='--apply'
    &&args[1]==='--confirm-census-qfr-d1-write')return {apply:true};
  throw Error('QFR_D1_EXPLICIT_CONFIRMATION_REQUIRED');
}

export function prepareQfrD1Payload(preview,{generatedAt=new Date().toISOString(),now=Date.now()}={}){
  const draft=draftQfrPayload(preview,{generatedAt});
  if(draft.proposedKey!==QFR_SNAPSHOT_KEY||draft.payload.schemaVersion!==QFR_SCHEMA
    ||!SHA.test(draft.payload.sourceSha256??'')||!SHA.test(draft.payload.sourceVersion??'')
    ||draft.checkpoint.sourceStoredAt!==preview.sourceStoredAt
    ||draft.checkpoint.sourceVersion!==preview.snapshotSha256
    ||draft.workerRegistered||draft.siteDeployed)throw Error('QFR_D1_DRAFT_CONTRACT_MISMATCH');
  const payload=validateQfrCompanionPayload(draft.payload,{now});
  if(qfrCompanionFreshness(payload.rows[0],{now}).status!=='FRESH')
    throw Error('QFR_D1_SOURCE_STALE');
  return {payload,projectionSha256:draft.previewSha256};
}

async function main(){
  const now=new Date().toISOString();
  const stamp=now.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
  const lines=['EARNINGS_CENSUS_QFR_R4_D1_ONCE',`UTC=${now}`,
    `SNAPSHOT_KEY=${QFR_SNAPSHOT_KEY}`,`SCHEMA=${QFR_SCHEMA}`,
    'SOURCE_HTTP_REQUESTS=0','PC_SQLITE_WRITES=0',
    'EXISTING_BLS_D1_KEY_WRITES=0','EXISTING_BEA_D1_KEY_WRITES=0',
    'E1_R4_SCORE_WRITES=0','SCHEDULER_CHANGED=NO','WORKER_DEPLOYED=NO',
    'PUBLIC_GET_VERIFIED=NO'];
  let db,exit=0;
  let apply=false;
  try{
    ({apply}=parseQfrD1Mode(process.argv.slice(2)));
    lines.push(`MODE=${apply?'APPLY_EXPLICIT':'READ_ONLY_PREFLIGHT'}`);
    const operationalRoot=process.env.ZGMINI_EARNINGS_C_OPERATIONAL_ROOT;
    if(!operationalRoot||!fs.existsSync(operationalRoot))
      throw Error('QFR_D1_APPROVED_OPERATIONAL_ROOT_REQUIRED');
    const base=path.resolve(process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer');
    const config=JSON.parse(fs.readFileSync(path.join(base,'config.json'),'utf8'));
    const publisher=inspectD1Source(STAGE,{publisher:true});
    const operational=inspectD1Source(operationalRoot);
    const approved=validateD1DualSource({config,publisher,operational});
    // Main publisher validation above is necessary, but new QFR files must ALSO be tracked.
    execFileSync('git',['-C',STAGE,'ls-files','--error-unmatch','--',...TRACKED],{
      encoding:'utf8',windowsHide:true,timeout:15_000,stdio:['ignore','pipe','pipe'],
    });
    lines.push('SOURCE_GATES=PASS','PUBLISHER_BRANCH=main',
      `PUBLISHER_SHA=${approved.publisherSha}`,
      `OPERATIONAL_SHA=${approved.approvedOperationalSha}`,'CONFIG_SOURCE_MATCH=YES',
      'CONFIG_WRITES=0');
    const dbPath=path.join(base,'storage','core.sqlite');
    if(!fs.existsSync(dbPath))throw Error('QFR_D1_SQLITE_MISSING');
    db=new DatabaseSync(dbPath,{readOnly:true,timeout:4000});
    db.exec('PRAGMA query_only=ON');
    const preview=buildStoredQfrPreview(db);
    db.close();db=null;
    const {payload,projectionSha256}=prepareQfrD1Payload(preview,{generatedAt:now,now:Date.now()});
    lines.push(`RAW_ZIP_SHA256=${payload.sourceSha256}`,
      `SOURCE_VERSION=${payload.sourceVersion}`,
      `SOURCE_STORED_AT=${payload.sourceStoredAt}`,
      `PROJECTION_SHA256=${projectionSha256}`,
      `STORED_SNAPSHOTS_VERIFIED=${preview.storedSnapshotsChecked}`,
      `OBSERVED_THROUGH=${payload.observedThrough}`,
      `ROW_COUNT=${payload.rows.length}`,
      `MANUFACTURING_AFTER_TAX_MARGIN_PCT=${payload.rows[0].value}`,
      'SOURCE_FRESHNESS=FRESH');
    if(!apply){
      lines.push('D1_QUERIES=0','D1_WRITES=0',
        'RESULT=PASS_QFR_D1_PREFLIGHT_NO_REMOTE_ACCESS');
    }else{
      const {client,credential}=await import('./d1.mjs');
      const remote=client(config,()=>credential(operationalRoot));
      const result=await qfrCompanionWriter(remote.adapter(config.core,{allowWrites:true}))
        .write(payload,{storedAt:Date.now()});
      if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(result.status)
        ||result.key!==QFR_SNAPSHOT_KEY
        ||result.sourceVersion!==payload.sourceVersion
        ||result.sourceStoredAt!==payload.sourceStoredAt)
        throw Error('QFR_D1_READBACK_NOT_VERIFIED');
      lines.push(`D1_RESULT=${result.status}`,
        `D1_READBACK=${result.status==='READBACK_VERIFIED'?'EXACT':'PREVIOUS_IDENTICAL'}`,
        `RESULT=${result.status==='READBACK_VERIFIED'
          ?'PASS_QFR_D1_EXACT_READBACK':'PASS_QFR_D1_ALREADY_STORED'}`);
    }
  }catch(error){
    const message=String(error?.message??'');
    lines.push(`ERROR=${/^[A-Z0-9_]{1,100}$/.test(message)?message:'QFR_D1_PUBLISHER_FAILED'}`,
      'RESULT=FAIL_QFR_D1_NO_VERIFIED_PUBLICATION');
    exit=1;
  }finally{
    try{db?.close();}catch{}
    const file=path.join(HERE,`EARNINGS_CENSUS_QFR_R4_D1_RESULT_${stamp}.txt`);
    try{
      fs.writeFileSync(file,lines.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});
      console.log(`TXT_CREATED=${path.basename(file)}`);
    }catch{console.error('ERROR=QFR_D1_TXT_WRITE_FAILED');exit=1;}
    console.log(lines.filter(line=>/^(MODE|SOURCE_GATES|ERROR|D1_RESULT|RESULT)=/.test(line)).join('\n'));
    process.exitCode=exit;
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
