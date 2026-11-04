// Fixed B batch after the successful three-symbol PC-private November pilot.
// Future calendar symbols <=20, at most 17 NEW EarningsAPI GETs, D1 always OFF.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runNovemberProbePublish} from './market-calendar-nov30-er1-probe-publish.mjs';

export async function runNovemberBatch20Private(options={}){
 return runNovemberProbePublish({...options,
  candidateLimit:20,providerRequestLimit:17,
  outputTag:'nov30-er1-batch20',publish:false});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output||!path.isAbsolute(output)){
  process.stderr.write('NOV30_ER1_BATCH20_RESULT_PATH_REQUIRED\n');
  process.exitCode=2;
 }else{
  const result=await runNovemberBatch20Private();
  try{fs.writeFileSync(output,JSON.stringify(result)+'\n',{flag:'wx'})}
  catch{process.stderr.write('NOV30_ER1_BATCH20_RESULT_SAVE_STOP\n');process.exitCode=2}
  console.log('NOV30_ER1_BATCH20='+result.status+' CODE='+result.code+
   ' INPUT='+(result.selectedSymbols??0)+' SCOREABLE='+
   (result.scoreableIssuers??0)+' STAR3='+(result.star3Count??0));
  if(result.status!=='PASS')process.exitCode=1;
 }
}
