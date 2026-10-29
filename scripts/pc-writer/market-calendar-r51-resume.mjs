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
const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');

function stageReport(outputDir,lines){
 const filename=`MARKET_CALENDAR_R51_RESUME_RESULT_${new Date().toISOString().replace(/[-:.]/g,'')}_${process.pid}.txt`;
 const dest=path.join(outputDir,filename),body=lines.join('\r\n')+'\r\n';
 fs.writeFileSync(dest,body,{flag:'wx'});
 if(fs.readFileSync(dest,'utf8')!==body)throw Error('R51_RESUME_REPORT_READBACK_STOP');
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

export async function resume({pcHome=PC_HOME,outputDir,runner=runPc,inspect=currentBatch,maxNewBatches=MAX_NEW_BATCHES}={}){
 if(!outputDir||!fs.existsSync(outputDir)||!Number.isInteger(maxNewBatches)||maxNewBatches<1||maxNewBatches>MAX_NEW_BATCHES)throw Error('R51_RESUME_ARGUMENT_STOP');
 const audit=['AUDIT=MARKET_CALENDAR_R51_CHECKPOINT_RESUME','SOURCE_SHA=70920bad758797d9487e1702cdb39e56f317f8ee','PROTECTED=SQLITE,D1,STARS,SCHEDULER,DEPLOY','PLAN_SHA='+EXPECTED_PLAN_SHA];
 let completed=0,previousBatch=0,status='R51_RESUME_STOP',error='';
 try{
  const state=inspect(pcHome);
  if(state.before>EXPECTED_BATCHES)throw Error('R51_RESUME_BATCH_COUNT_INVALID');
  previousBatch=state.before;
  audit.push('PREVIOUS_BATCH_FILES='+state.before);
  // Every invocation of the existing collector is independently bounded to
  // 120 tickers / 12 requests, writes raw pages first and verifies readback.
  for(let n=0;n<maxNewBatches;n++){
   const result=await runner({mode:'collect',pcHome,outputDir});
   audit.push(`STEP_${n+1}_STATUS=${result.status}`,`STEP_${n+1}_RESULT=${result.file}`);
   if(result.status==='R51_ALL_BATCHES_STORED'){status='R51_RESUME_COMPLETE';break;}
   if(result.status!=='R51_BATCH_STORED'){error=result.status;break;}
   const data=parseReport(result.file,outputDir);
   if(data.status!=='R51_BATCH_STORED'||data.batchNumber!==previousBatch+1||data.totalBatches!==EXPECTED_BATCHES||data.plannedInBatch>120||data.providerRequests>12||data.dbWrites!==0||data.d1Writes!==0||data.productionStarsChanged!==false||data.batchReadbackVerified!==true)throw Error('R51_RESUME_BATCH_READBACK_STOP');
   previousBatch=data.batchNumber;completed++;
   if(previousBatch===EXPECTED_BATCHES){status='R51_RESUME_COMPLETE';break;}
  }
  if(!error&&status!=='R51_RESUME_COMPLETE')status='R51_RESUME_CHUNK_COMPLETE';
 }catch(e){error=/^R51_[A-Z0-9_]+$/.test(e?.message)?e.message:'R51_RESUME_LOCAL_FAILURE';}
 audit.push('STATUS='+status,'NEW_BATCHES='+completed,'LATEST_BATCH='+previousBatch,'TOTAL_BATCHES='+EXPECTED_BATCHES,'STOP_REASON='+(error||'NONE'),'DB_WRITES=0','D1_WRITES=0','PUBLIC_STARS_CHANGED=false');
 const report=stageReport(outputDir,audit);
 return {status,report,error};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dir=process.argv[2]?path.resolve(process.argv[2]):path.dirname(fileURLToPath(import.meta.url));
 const result=await resume({outputDir:dir});
 process.stdout.write(`STATUS=${result.status}\nRESULT=${result.report}\n`);
 if(result.error||result.status!=='R51_RESUME_COMPLETE')process.exitCode=2;
}
