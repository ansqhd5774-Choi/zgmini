// Read-only local analysis. Optional --save writes only a separate research report.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {buildRateSentimentR1} from '../../lib/market-score/rate-sentiment-r1-research.mjs';
const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const database=path.join(base,'storage','core.sqlite');
const reportFile=path.join(base,'local-rate-sentiment-r1-research.json');
function readRateBatch(){
  if(!fs.existsSync(database))throw Error('RATE_SENTIMENT_DB_MISSING');
  const db=new DatabaseSync(database,{readOnly:true});
  try{
    const row=db.prepare("SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE 'rates:%' ORDER BY stored_at DESC LIMIT 1").get();
    if(!row)throw Error('RATE_SENTIMENT_STORED_RATES_MISSING');
    const json=row.body.startsWith('gzip:')?gunzipSync(Buffer.from(row.body.slice(5),'base64'),{maxOutputLength:32000000}).toString('utf8'):row.body;
    return {batch:JSON.parse(json),sourceStoredAt:row.stored_at};
  }finally{db.close()}
}
export function runRateSentimentResearch({asOfDate=new Date().toISOString().slice(0,10),saveReport=false}={}){
  const {batch,sourceStoredAt}=readRateBatch();
  const series=batch?.rateR2?.series;
  if(!series||!['DGS2','DGS3MO','DGS10'].every(k=>Array.isArray(series[k])))throw Error('RATE_SENTIMENT_SERIES_MISSING');
  const output={...buildRateSentimentR1({dgs2Rows:series.DGS2,dgs3moRows:series.DGS3MO,dgs10Rows:series.DGS10,asOfDate}),sourceStoredAt};
  if(saveReport){fs.writeFileSync(reportFile,JSON.stringify(output,null,2));}
  return {outputFile:saveReport?reportFile:null,...output};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(runRateSentimentResearch({saveReport:process.argv.includes('--save')}),null,2));}
  catch(e){console.log(JSON.stringify({status:'FAILED',error:/^[A-Z0-9_]+$/.test(e?.message??'')?e.message:'RATE_SENTIMENT_RESEARCH_FAILED'}));process.exitCode=1;}
}
