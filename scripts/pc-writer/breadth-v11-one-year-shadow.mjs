/**
 * PC usage: E:\ZGmini\runtime\node.exe scripts\pc-writer\breadth-v11-one-year-shadow.mjs
 * Read-only: no output file, provider calls, D1 connection or publication.
 * Writes one JSON summary to stdout. Does not replace production V9 or R10.
 */
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {marketWindow,runShadow} from './breadth-r10-v9-shadow/engine.mjs';
import {ANNUAL_SESSIONS,evaluateV11Annual} from './breadth-v11-one-year-evaluator.mjs';
export const V11_HISTORY_READ_SESSIONS=ANNUAL_SESSIONS+59; // unchanged V9 60-session lookback
export function runV11Annual({base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),now=new Date(),asOf=null}={}){
 const latest=runShadow({base,now,asOf,historySessions:V11_HISTORY_READ_SESSIONS,writeLocal:false});
 if(!latest||latest.security?.providerCalls!==0||latest.security?.dbWrites!==0||latest.quality?.noImputation!==true)
   throw Error('V11_READONLY_SOURCE_ASSURANCE_FAILED');
 if(latest.evaluation?.perDay?.length!==ANNUAL_SESSIONS)
   throw Error('V11_ANNUAL_SESSION_CARDINALITY_FAILED');
 const marketDates=marketWindow(latest.asOf,ANNUAL_SESSIONS);
 return evaluateV11Annual({marketDates,perDay:latest.evaluation.perDay,source:latest});
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 if(process.argv.slice(2).length)throw Error('V11_NO_WRITE_OR_PUBLISH_ARGUMENTS_ACCEPTED');
 try{console.log(JSON.stringify(runV11Annual()))}
 catch(error){console.error(JSON.stringify({task:'BREADTH_V11_252_SESSION_COMPARE',status:'AUTOMATION_BLOCKED_OR_EVALUATION_FAILED',code:String(error?.message??error)}));process.exitCode=1}
}
