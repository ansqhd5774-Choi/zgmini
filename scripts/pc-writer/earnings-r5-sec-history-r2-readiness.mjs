import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildGuidanceTimeline,guidanceAsOf,readCfoProductionHistory} from './earnings-r5-production-forward.mjs';
import {E1_R5_SEC_HISTORY_BACKFILL_R2_VERSION,E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT} from './earnings-r5-sec-history-backfill-r2.mjs';

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const parseArgs=(argv=process.argv.slice(2))=>Object.fromEntries(argv.map(item=>item.match(/^--([^=]+)=(.*)$/)).filter(Boolean).map(m=>[m[1],m[2]]));

export function evaluateR2GuidanceReadiness({base=DEFAULT_BASE}={}){
  const secRoot=path.join(base,'manual-input','e1-r5','sec-guidance-r17'),checkpointFile=path.join(secRoot,'checkpoint.json'),r2File=path.join(secRoot,'historical-backfill-r2.json'),cfoFile=path.join(base,'manual-input','e1-r5','cfo-survey-r1','production-history-r1.json');
  for(const file of [checkpointFile,r2File,cfoFile])if(!fs.existsSync(file))throw Error(`INPUT_MISSING:${file}`);
  const checkpoint=readJson(checkpointFile),ledger=readJson(r2File),cfo=readCfoProductionHistory(readJson(cfoFile)),c=E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT;
  if(ledger?.version!==E1_R5_SEC_HISTORY_BACKFILL_R2_VERSION||ledger?.sourceCorpusVersion!==c.sourceCorpusVersion||ledger?.lookbackDays!==550||ledger?.priorPerIssuer!==4)throw Error('R2_LEDGER_CONTRACT_MISMATCH');
  const timeline=buildGuidanceTimeline({root:secRoot,checkpoint,ledger}),rows=[];
  for(const item of cfo.filter(row=>row.date>='2025-01-01')){const guidance=guidanceAsOf(timeline,item.date);rows.push({period:item.period,date:item.date,s12aRaw:guidance.s12aRaw,s13Raw:guidance.s13Raw,comparableCount:guidance.comparableCount,valid:finite(guidance.s12aRaw)&&finite(guidance.s13Raw)});}
  const validRows=rows.filter(row=>row.valid),potentialHistoricalReady=Math.max(0,validRows.length-1),status=potentialHistoricalReady>=1?'READY_FOR_E1_R5_TREND_PREFLIGHT':'INSUFFICIENT_GUIDANCE_HISTORY';
  return {status,ledgerVersion:ledger.version,ledgerCompleted:Object.keys(ledger.completed??{}).length,r1SeedCompleted:Number(ledger.seededFrom?.completedAccessions??0),timelineIssuers:timeline.size,rows,validRows,potentialHistoricalReady,networkCalls:0,dbWrites:0,d1Writes:0,productionActivation:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const cli=parseArgs(),result=evaluateR2GuidanceReadiness({base:cli.base?path.resolve(cli.base):undefined});console.log(JSON.stringify(result));if(result.status!=='READY_FOR_E1_R5_TREND_PREFLIGHT')process.exitCode=3;}catch(error){console.log(JSON.stringify({status:'FAILED',error:String(error?.message??error),networkCalls:0,dbWrites:0,d1Writes:0,productionActivation:false}));process.exitCode=1;}
}
