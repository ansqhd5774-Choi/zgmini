import {throwMarketParquetRemoved} from '../../lib/marketparquet-retirement.mjs';
// R8 Space/Satellite: approved stored-only computation -> new D1 provisional key.
// Existing R32 confirmed key, ten-theme public key and all scheduler tasks remain untouched.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SPACE_SATELLITE_R2_PUBLIC_KEY} from '../../worker/theme-space-satellite-r2.mjs';
import {SPACE_PROVISIONAL_KEY,validSpaceProvisionalR1} from
 '../../worker/theme-space-satellite-provisional-r1.mjs';
import {buildSpaceProvisionalFromStorageR8} from './theme-space-satellite-provisional-r8.mjs';
import {spaceProvisionalD1R8} from './theme-space-satellite-provisional-d1-r8.mjs';
import {spaceSatelliteApprovedSevenTokenR31} from './theme-space-satellite-auth-r31.mjs';

const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
export async function runSpaceR8(){return throwMarketParquetRemoved();}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if((args.join(' ')!=='--once')&&(args.join(' ')!=='--once --publish')){
  console.error('Usage: theme-space-satellite-auto-r8.mjs --once [--publish]');
  process.exitCode=2;
 }else{
  const output=await runSpaceR8({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
   allowPublish:args.includes('--publish')});
  console.log(JSON.stringify(output));
  if(!['PRIVATE_VERIFIED_NOT_PUBLISHED','D1_READBACK_VERIFIED_API_PENDING',
   'PUBLIC_API_VERIFIED','NO_NEW_VERIFIED_PROVISIONAL','UNCHANGED'].includes(output.status))
   process.exitCode=1;
 }
}
