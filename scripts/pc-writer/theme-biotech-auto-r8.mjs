import {throwMarketParquetRemoved} from '../../lib/marketparquet-retirement.mjs';
// The same single biotech scheduler first runs the already approved R7
// confirmed lane, then optionally appends a verified secondary provisional
// score. No seven-theme collect/calculate/publish file is invoked or edited.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startBiotechR7} from './theme-biotech-auto-r7.mjs';
import {biotechVersionedD1} from './theme-biotech-versioned-d1-r7.mjs';
import {biotechApprovedSevenTokenR8} from './theme-biotech-seven-auth-r8.mjs';
import {biotechProvisionalD1R8} from './theme-biotech-provisional-d1-r8.mjs';
import {BIOTECH_PROVISIONAL_KEY,buildBiotechProvisionalFromStorageR8} from './theme-biotech-provisional-r8.mjs';
import {validBiotechProvisionalR1} from '../../worker/theme-biotech-provisional-r1.mjs';

export async function runBiotechR8(){return throwMarketParquetRemoved();}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args[0]!=='--once'||args.slice(1).some(s=>!['--collect','--publish'].includes(s))||
  new Set(args).size!==args.length){
  console.log('Usage: theme-biotech-auto-r8.mjs --once [--collect] [--publish]');process.exitCode=2;
 }else{
  const outcome=await runBiotechR8({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
   allowCollect:args.includes('--collect'),allowPublish:args.includes('--publish')});
  console.log(JSON.stringify(outcome));
  if(['R7_CONFIRMED_STAGE_STOPPED','R8_PROVISIONAL_STAGE_STOPPED',
   'R8_PROVISIONAL_PUBLIC_CONTRACT_REJECTED'].includes(outcome.status))process.exitCode=1;
 }
}
