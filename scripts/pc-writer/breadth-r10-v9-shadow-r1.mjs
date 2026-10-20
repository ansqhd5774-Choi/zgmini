/** Research-only lane: no provider requests, no DB or D1 writes. */
import fs from 'node:fs';
import {runShadow} from './breadth-r10-v9-shadow/engine.mjs';
import {METHOD} from './breadth-r10-v9-shadow/formula.mjs';

export function parseArguments(args=[]){
 const get=name=>{const i=args.indexOf('--'+name);return i>=0?args[i+1]:null};
 return {base:get('base')??undefined,asOf:get('as-of'),writeLocal:args.includes('--write-local'),report:get('report')};
}
export function runCli(args=process.argv.slice(2),now=new Date()){
 const opt=parseArguments(args);
 const report=runShadow({base:opt.base,asOf:opt.asOf,writeLocal:opt.writeLocal,now});
 if(opt.report)fs.writeFileSync(opt.report,JSON.stringify(report,null,2)+'\n');
 return {status:report.status,asOf:report.asOf,display:report.display,latestStored:report.latestStored,recorded:opt.writeLocal,method:METHOD};
}
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(runCli()));}
 catch(error){console.log(JSON.stringify({status:'FAILED',reason:String(error?.message??error)}));process.exitCode=1;}
}
