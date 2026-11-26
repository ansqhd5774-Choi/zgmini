// November ER1 whole future calendar, with bounded, resumable PRIVATE collection.
// Reuse the approved raw history cache. No D1/Core/scheduler writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runNovemberProbePublish} from './market-calendar-nov30-er1-probe-publish.mjs';

export async function runNovemberFullPrivate(options={}){
 return runNovemberProbePublish({...options,
  candidateLimit:null,providerRequestLimit:17,
  outputTag:'nov30-er1-full',publish:false});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output||!path.isAbsolute(output)){
  process.stderr.write('NOV30_ER1_FULL_RESULT_PATH_REQUIRED\n');
  process.exitCode=2;
 }else{
  const result=await runNovemberFullPrivate();
  try{fs.writeFileSync(output,JSON.stringify(result)+'\n',{flag:'wx'})}
  catch{process.stderr.write('NOV30_ER1_FULL_RESULT_SAVE_STOP\n');process.exitCode=2}
  console.log('NOV30_ER1_FULL='+result.status+' CODE='+result.code+
   ' TARGET='+(result.selectedSymbols??0)+' REUSED='+
   (result.reusedActualSymbols??0)+' NEW='+(result.stagedActualSymbols??0)+
   ' MISSING='+(result.missingActualSymbols??0));
  if(result.status!=='PASS')process.exitCode=1;
 }
}
