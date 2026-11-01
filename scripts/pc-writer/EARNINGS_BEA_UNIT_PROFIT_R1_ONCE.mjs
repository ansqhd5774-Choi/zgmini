// Explicit PC-only, one-shot source capture + verified D1 publication.
// --dry-run fetches/checks only; --apply requires an additional confirmation flag.
// No scheduler, existing PC SQLite, score formula or config is changed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildBeaUnitProfitSource,UNIT_PROFIT_CSV} from '../../lib/market-score/earnings-bea-unit-profit-source-r1.mjs';
import {validateBeaUnitProfit,beaUnitFreshness,beaUnitWriter,BEA_UNIT_SNAPSHOT_KEY}
 from '../../worker/earnings-bea-unit-profit-r1.mjs';
import {inspectD1Source,validateD1DualSource} from './EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const pcBase=path.resolve(process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer');
const operationalRoot=process.env.ZGMINI_EARNINGS_C_OPERATIONAL_ROOT;
const now=new Date().toISOString();
const stamp=now.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z').replace('T','-');
const args=process.argv.slice(2);
const apply=args.includes('--apply');
const lines=['EARNINGS_BEA_UNIT_PROFIT_R1_ONCE',`UTC=${now}`,
 `MODE=${apply?'EXPLICIT_APPLY':'READ_ONLY_PREFLIGHT'}`,
 `SOURCE_SERIES=A463RD3Q052SBEA`,`SNAPSHOT_KEY=${BEA_UNIT_SNAPSHOT_KEY}`];
let failure=false;
try{
 if(args.some(arg=>!['--dry-run','--apply','--confirm-bea-unit-d1-write'].includes(arg))
  ||apply&&args.includes('--dry-run'))throw Error('BEA_UNIT_INVALID_ARGUMENT');
 if(apply&&!args.includes('--confirm-bea-unit-d1-write'))
  throw Error('BEA_UNIT_EXPLICIT_CONFIRMATION_REQUIRED');
 if(!fs.existsSync(pcBase))throw Error('BEA_UNIT_APPROVED_PC_ROOT_MISSING');
 let config,approved;
 if(apply){
  if(!operationalRoot||!fs.existsSync(operationalRoot))
   throw Error('BEA_UNIT_APPROVED_OPERATIONAL_ROOT_REQUIRED');
  config=JSON.parse(fs.readFileSync(path.join(pcBase,'config.json'),'utf8'));
  approved=validateD1DualSource({config,
   publisher:inspectD1Source(root,{publisher:true}),
   operational:inspectD1Source(operationalRoot)});
  lines.push(`PUBLISHER_SHA=${approved.publisherSha}`,
   `OPERATIONAL_SHA=${approved.approvedOperationalSha}`,'SOURCE_GATES=PASS');
 }
 const response=await fetch(UNIT_PROFIT_CSV,{headers:{accept:'text/csv'},signal:AbortSignal.timeout(25000)});
 if(!response.ok||!response.body)throw Error('BEA_UNIT_SOURCE_HTTP_FAILED');
 const contentLength=Number(response.headers.get('content-length')??0);
 if(contentLength>100_000)throw Error('BEA_UNIT_SOURCE_TOO_LARGE');
 const raw=await response.text();
 if(raw.length>100_000)throw Error('BEA_UNIT_SOURCE_TOO_LARGE');
 const sha=createHash('sha256').update(raw,'utf8').digest('hex');
 let saved=raw;
 if(apply){
  const rawDir=path.join(pcBase,'raw','earnings-bea-unit-profit-r1');
  fs.mkdirSync(rawDir,{recursive:true});
  const rawFile=path.join(rawDir,`${stamp}_${sha.slice(0,12)}.csv`);
  fs.writeFileSync(rawFile,raw,{encoding:'utf8',flag:'wx'});
  saved=fs.readFileSync(rawFile,'utf8');
  if(createHash('sha256').update(saved,'utf8').digest('hex')!==sha)
   throw Error('BEA_UNIT_PERSISTED_SOURCE_HASH_MISMATCH');
  lines.push(`RAW_SOURCE_SAVED=${rawFile}`);
 }
 const sourceStoredAt=Date.now();
 const payload=buildBeaUnitProfitSource(saved,{sourceVersion:sha,sourceStoredAt});
 validateBeaUnitProfit(payload,{now:sourceStoredAt});
 const freshness=beaUnitFreshness(payload,{now:sourceStoredAt});
 lines.push(`SOURCE_SHA256=${sha}`,
  `SOURCE_STORED_AT=${sourceStoredAt}`,
  `OBSERVED_END=${payload.indicator.observationPeriodEnd}`,
  `PREVIOUS_VALUE=${payload.indicator.previousValue}`,
  `CURRENT_VALUE=${payload.indicator.value}`,
  `CHANGE=${payload.indicator.change}`,
  `HISTORY_POINTS=${payload.indicator.history.length}`,
  `FRESHNESS=${freshness.status}`);
 if(freshness.status!=='FRESH')throw Error('BEA_UNIT_OBSERVATION_STALE');
 if(!apply){
  lines.push('D1_QUERIES=0','D1_WRITES=0','RAW_LOCAL_WRITES=0',
   'RESULT=PASS_BEA_UNIT_PREFLIGHT_ONLY');
 }else{
  const {client,credential}=await import('./d1.mjs');
  const remote=client(config,()=>credential(operationalRoot));
  const status=await beaUnitWriter(remote.adapter(config.core,{allowWrites:true}))
   .write(payload,{storedAt:Date.now()});
  if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(status.status))
   throw Error('BEA_UNIT_D1_READBACK_UNVERIFIED');
  lines.push(`D1_RESULT=${status.status}`,
   `D1_READBACK=${status.status==='READBACK_VERIFIED'?'VERIFIED':'PREVIOUS_IDENTICAL'}`,
   `RESULT=PASS_BEA_UNIT_${status.status}`);
 }
}catch(error){
 const code=String(error?.message??'');
 lines.push(`ERROR=${/^[A-Z0-9_]{1,100}$/.test(code)?code:'BEA_UNIT_OPERATION_FAILED'}`,
  'RESULT=BEA_UNIT_FAILED');
 failure=true;
}finally{
 lines.push('EXISTING_SCORE_WRITES=0','PC_SQLITE_WRITES=0',
  'PC_SCHEDULER_CHANGES=0','CLOUDFLARE_CRON_CHANGES=0');
 const candidates=[process.env.ZGMINI_EARNINGS_C_LOG_DIR,path.join(os.homedir(),'Desktop'),root].filter(Boolean);
 let logged=false;
 for(const dir of [...new Set(candidates)]){
  try{
   const logPath=path.join(dir,`EARNINGS_BEA_UNIT_PROFIT_R1_RESULT_${stamp}.txt`);
   fs.writeFileSync(logPath,lines.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});
   console.log(`LOG=${logPath}`);logged=true;break;
  }catch{}
 }
 if(!logged){console.error('ERROR=BEA_UNIT_RESULT_LOG_FAILED');failure=true;}
 console.log(lines.filter(line=>/^(MODE|RESULT|ERROR|CURRENT_VALUE|D1_RESULT|FRESHNESS)=/.test(line)).join('\n'));
 if(failure)process.exitCode=1;
}
