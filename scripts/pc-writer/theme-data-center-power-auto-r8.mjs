import {throwMarketParquetRemoved} from '../../lib/marketparquet-retirement.mjs';
// R8: real archived prices -> R188 -> DC-only provisional key. No scheduler changes.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DC_POWER_PUBLIC_KEY,DC_POWER_PUBLIC_VERSION} from
 '../../worker/theme-data-center-power-r1.mjs';
import {DC_POWER_PROVISIONAL_KEY,validDcPowerProvisionalR1} from
 '../../worker/theme-data-center-power-provisional-r1.mjs';
import {buildDcProvisionalFromStorageR8} from './theme-data-center-power-provisional-r8.mjs';
import {dcPowerProvisionalD1R8} from './theme-data-center-power-provisional-d1-r8.mjs';
import {spaceSatelliteApprovedSevenTokenR31} from './theme-space-satellite-auth-r31.mjs';

const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
export async function runDcPowerR8(){return throwMarketParquetRemoved();}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.join(' ')!=='--once'&&args.join(' ')!=='--once --publish'){
  console.error('Usage: theme-data-center-power-auto-r8.mjs --once [--publish]');
  process.exitCode=2;
 }else{
  const result=await runDcPowerR8({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
   allowPublish:args.includes('--publish')});
  console.log(JSON.stringify(result));
  if(!['PRIVATE_VERIFIED_NOT_PUBLISHED','D1_READBACK_VERIFIED_API_PENDING',
   'PUBLIC_API_VERIFIED','NO_NEW_VERIFIED_PROVISIONAL'].includes(result.status))process.exitCode=1;
 }
}
