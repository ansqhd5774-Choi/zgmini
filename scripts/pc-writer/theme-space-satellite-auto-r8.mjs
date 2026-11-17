// Retired MarketParquet R8 sidecar. GMH-only confirmed collectors, scores
// and historical local/D1 records remain unchanged.
// Do not import legacy EOD storage, collectors, or D1 clients.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MARKETPARQUET_REMOVED_CODE,throwMarketParquetRemoved}
 from '../../lib/marketparquet-retirement.mjs';

export async function runSpaceR8(){
 throwMarketParquetRemoved();
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(!(args.length===1&&args[0]==='--once')&&
    !(args.length===2&&args[0]==='--once'&&args[1]==='--publish')){
  console.error('Usage: theme-space-satellite-auto-r8.mjs --once [--publish]');
  process.exitCode=2;
 }else{
  console.error(JSON.stringify({status:'UNAVAILABLE',reason:MARKETPARQUET_REMOVED_CODE,
    retryable:false,providerCalls:0,sqliteWrites:0,d1Writes:0,schedulerWrites:0}));
  process.exitCode=1;
 }
}
