// R59 standalone one-shot CLI. Reads existing PC R45 and user-reviewed lists;
// does not modify PC files, Core worktree, schedules, D1, or published grades.
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {buildR57R43Shadow} from './market-calendar-r57-r45-offline-r43.mjs';
import {runR58ShadowAudit} from './market-calendar-r58-r43-shadow-audit.mjs';

export const R59_METHOD='R59_R43_ONE_SHOT_PC_READONLY_REPORT_R1';
const noWrite=()=>({providerCalls:0,dbWrites:0,pcDataWrites:0,
 filesystemWrites:0,coreChanged:false,published:false,schedulerChanged:false});

export function runR59ReadOnly({
 base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
 now=Date.now(),
}={}){
 const shadow=buildR57R43Shadow({base,now});
 const {rankings,...r57Summary}=shadow;
 const r58=shadow.status==='READY_SHADOW'?
  runR58ShadowAudit({base,now,shadow}):
  {status:'BLOCKED',reason:'R58_R57_SHADOW_NOT_READY',shadowReason:shadow.reason};
 return {method:R59_METHOD,
  status:r58.status==='READY_AUDIT'?'READY_AUDIT':'WAITING_INPUTS',
  r57:r57Summary,r58,...noWrite()};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const provided=process.argv.slice(2).find(arg=>arg.startsWith('--base='));
 const base=provided?provided.slice(7):undefined;
 const result=runR59ReadOnly({base});
 console.log(JSON.stringify(result));
 // A missing private reference or 20-session input is expected, not a Core failure.
 if(result.status!=='READY_AUDIT')process.exitCode=2;
}
