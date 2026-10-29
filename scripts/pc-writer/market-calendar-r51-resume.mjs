// R51 follow-up: one user launch, sequential bounded checkpoints, no DB/D1/UI writes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runPc} from './market-calendar-r51-price-coverage.mjs';

const EXPECTED_PLAN_SHA='4f6be1ba8f45007d25b7702b5eb6d5b3d193c60e7e13793876042a84e34c0138';
const EXPECTED_TICKERS=2394;
const EXPECTED_BATCHES=20;
const MAX_NEW_BATCHES=19;
const MAX_REQUESTS_PER_BATCH=12;
const MAX_TRANSIENT_RETRIES=2;
const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const isTransient=status=>['R51_PROVIDER_TIMEOUT','R51_PROVIDER_NETWORK_FAILURE','R51_PROVIDER_HTTP_500','R51_PROVIDER_HTTP_502','R51_PROVIDER_HTTP_503','R51_PROVIDER_HTTP_504'].includes(status);

function stageReport(outputDir,lines){
 const filename=`MARKET_CALENDAR_R51_RESUME_RESULT_${new Date().toISOString().replace(/[-:.]/g,'')}_${process.pid}.txt`;
 const dest=path.join(outputDir,filename),body=lines.join('\r\n')+'\r\n';
 fs.writeFileSync(dest,body,{flag:'wx'});
 if(fs.readFileSync(dest,'utf8')!==body)throw Error('R51_RESUME_REPORT_READBACK_STOP');
 const latest=path.join(outputDir,'MARKET_CALENDAR_R51_LATEST_RESULT.txt');
 const staged=`${latest}.part-${process.pid}`;
 fs.writeFileSync(staged,body,{flag:'wx'});
 if(fs.readFileSync(staged,'utf8')!==body)throw Error('R51_RESUME_REPORT_READBACK_STOP');
 fs.renameSync(staged,latest);
 return filename;
}
function currentBatch(pcHome){
 const base=path.join(pcHome,'market-calendar-r51-alpaca');
 if(fs.existsSync(path.join(base,'run.lock')))throw Error('R51_CONCURRENT_RUN_STOP');
 const source=JSON.parse(fs.readFileSync(path.join(base,'plan.json'),'utf8'));
 if(source.sha256!==EXPECTED_PLAN_SHA||hash(JSON.stringify(source.plan))!==EXPECTED_PLAN_SHA||source.plan?.tickers?.length!==EXPECTED_TICKERS)throw Error('R51_RESUME_PLAN_MISMATCH_STOP');
 const rowsDir=path.join(base,'rows');
 const existing=fs.existsSync(rowsDir)?fs.readdirSync(rowsDir).filter(n=>/^batch-\d{4}\.json$/.test(n)).sort():[];
 if(!existing.includes('batch-0000.json')||existing.some((n,i)=>n!==`batch-${String(i).padStart(4,'0')}.json`))throw Error('R51_RESUME_BATCH_GAP_STOP');
 return {base,rowsDir,before:existing.length};
}
function parseReport(filename,outputDir){
 const contents=fs.readFileSync(path.join(outputDir,filename),'utf8');
 const data=Object.fromEntries(contents.split(/\r?\n/).filter(s=>s.includes('=')).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.startsWith('AUDIT=')?s.slice(i+1):JSON.parse(s.slice(i+1))];}));
 if(data.AUDIT!=='MARKET_CALENDAR_R51_PRICE_COVERAGE')throw Error('R51_RESUME_REPORT_SCHEMA_STOP');
 return data;
}

export async function resume({pcHome=PC_HOME,outputDir,runner=runPc,inspect=currentBatch,maxNewBatches=MAX_NEW_BATCHES,wait=ms=>new Promise(r=>setTimeout(r,ms)),onProgress=()=>{}}={}){
 if(!outputDir||!fs.existsSync(outputDir)||!Number.isInteger(maxNewBatches)||maxNewBatches<1||maxNewBatches>MAX_NEW_BATCHES)throw Error('R51_RESUME_ARGUMENT_STOP');
 const audit=['AUDIT=MARKET_CALENDAR_R51_CHECKPOINT_RESUME','RECOVERY_VERSION=R51_RETRY_R5','ORIGINAL_SOURCE_SHA=70920bad758797d9487e1702cdb39e56f317f8ee','PROTECTED=SQLITE,D1,STARS,SCHEDULER,DEPLOY','PLAN_SHA='+EXPECTED_PLAN_SHA];
 let completed=0,previousBatch=0,status='R51_RESUME_STOP',error='',ownedLock,lockFd,lockOwned=false;
 try{
  const state=inspect(pcHome);
  if(state.before>EXPECTED_BATCHES)throw Error('R51_RESUME_BATCH_COUNT_INVALID');
  if(state.base){
   ownedLock=path.join(state.base,'resume-recovery.lock');
   try{lockFd=fs.openSync(ownedLock,'wx');lockOwned=true;}catch{throw Error('R51_RESUME_ALREADY_RUNNING_STOP');}
   fs.writeSync(lockFd,`${process.pid}\n`);fs.closeSync(lockFd);lockFd=undefined;
  }
  previousBatch=state.before;
  audit.push('PREVIOUS_BATCH_FILES='+state.before);
  onProgress(`기존 저장 ${previousBatch}/${EXPECTED_BATCHES}배치 확인`);
  // All attempts for a batch share a twelve-request budget. Stored raw pages
  // are reused by the collector; no successful checkpoint is overwritten.
  for(let n=0;n<maxNewBatches;n++){
   let requests=0,retries=0,stored=false;
   while(true){
    onProgress(`${previousBatch+1}/${EXPECTED_BATCHES}배치 수집 중 (시도 ${retries+1}/${MAX_TRANSIENT_RETRIES+1})`);
    const result=await runner({mode:'collect',pcHome,outputDir,maxRequests:MAX_REQUESTS_PER_BATCH-requests});
    const step=`STEP_${n+1}_ATTEMPT_${retries+1}`;
    audit.push(`${step}_STATUS=${result.status}`,`${step}_RESULT=${result.file}`);
    if(result.status==='R51_ALL_BATCHES_STORED'){status='R51_RESUME_COMPLETE';break;}
    const data=parseReport(result.file,outputDir);
    const used=data.providerRequests;
    if(!Number.isInteger(used)||used<0||used>MAX_REQUESTS_PER_BATCH-requests||data.dbWrites!==0||data.d1Writes!==0||data.productionStarsChanged!==false)throw Error('R51_RESUME_REQUEST_BUDGET_STOP');
    requests+=used;
    audit.push(`${step}_REQUESTS=${used}`);
    if(result.status==='R51_BATCH_STORED'){
     if(data.status!=='R51_BATCH_STORED'||data.batchNumber!==previousBatch+1||data.totalBatches!==EXPECTED_BATCHES||data.plannedInBatch>120||data.batchReadbackVerified!==true)throw Error('R51_RESUME_BATCH_READBACK_STOP');
     previousBatch=data.batchNumber;completed++;stored=true;
     onProgress(`${previousBatch}/${EXPECTED_BATCHES}배치 저장 완료 (이번 배치 요청 ${requests}/12회)`);
     break;
    }
    if(data.status!==result.status)throw Error('R51_RESUME_REPORT_STATUS_MISMATCH');
    if(!isTransient(result.status)||retries>=MAX_TRANSIENT_RETRIES||requests>=MAX_REQUESTS_PER_BATCH){error=result.status;break;}
    retries++;
    onProgress(`${result.status} — 저장된 원자료 유지, ${retries*3}초 후 제한적 재시도`);
    await wait(retries*3000);
   }
   if(error||status==='R51_RESUME_COMPLETE')break;
   if(!stored)throw Error('R51_RESUME_UNEXPECTED_STOP');
   if(previousBatch===EXPECTED_BATCHES){status='R51_RESUME_COMPLETE';break;}
  }
  if(!error&&status!=='R51_RESUME_COMPLETE')status='R51_RESUME_CHUNK_COMPLETE';
 }catch(e){error=/^R51_[A-Z0-9_]+$/.test(e?.message)?e.message:'R51_RESUME_LOCAL_FAILURE';}
 finally{try{if(lockFd!==undefined)fs.closeSync(lockFd);}catch{}if(lockOwned){try{fs.unlinkSync(ownedLock);}catch{}}}
 audit.push('STATUS='+status,'NEW_BATCHES='+completed,'LATEST_BATCH='+previousBatch,'TOTAL_BATCHES='+EXPECTED_BATCHES,'STOP_REASON='+(error||'NONE'),'DB_WRITES=0','D1_WRITES=0','PUBLIC_STARS_CHANGED=false');
 const report=stageReport(outputDir,audit);
 onProgress(`결과 ${status}; 저장 ${previousBatch}/${EXPECTED_BATCHES}; 중단 사유 ${error||'없음'}`);
 return {status,report,error};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dir=process.argv[2]?path.resolve(process.argv[2]):path.dirname(fileURLToPath(import.meta.url));
 const result=await resume({outputDir:dir,onProgress:line=>process.stdout.write(`[R51] ${line}\n`)});
 process.stdout.write(`STATUS=${result.status}\nRESULT=${result.report}\n`);
 if(result.error||result.status!=='R51_RESUME_COMPLETE')process.exitCode=2;
}
