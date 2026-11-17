// Retired free MarketParquet biotech provisional R8 path.
// The approved GMH-only biotech confirmed R7 runner is a separate entrypoint;
// this legacy optional path must never call it or start a D1 transaction.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MARKETPARQUET_REMOVED_CODE,throwMarketParquetRemoved}
 from '../../lib/marketparquet-retirement.mjs';

export async function runBiotechR8(){
 throwMarketParquetRemoved();
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args[0]!=='--once'||args.slice(1).some(s=>!['--collect','--publish'].includes(s))||
  new Set(args).size!==args.length){
  console.error('Usage: theme-biotech-auto-r8.mjs --once [--collect] [--publish]');
  process.exitCode=2;
 }else{
  console.error(JSON.stringify({status:'UNAVAILABLE',reason:MARKETPARQUET_REMOVED_CODE,
   retryable:false,providerCalls:0,sqliteWrites:0,d1Writes:0,schedulerWrites:0}));
  process.exitCode=1;
 }
}
