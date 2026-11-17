// Historical ten-theme R88 inspection helpers remain available for source
// replay, but the two-source post-cycle itself is retired. MarketParquet free
// derivatives cannot be redistributed; old consent flags never reauthorize it.
// No collector, token, D1 adapter or filesystem lock is imported or opened.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {R88_PUBLIC_ROSTER} from '../../worker/theme-nine-r88-provisional.mjs';
import {MARKETPARQUET_REMOVED_CODE,throwMarketParquetRemoved}
 from '../../lib/marketparquet-retirement.mjs';

export function verifyTenR88Public(feed,{confirmedDate,provisionalDate}={}){
 const names=[...R88_PUBLIC_ROSTER.map(t=>t.theme),'우주·위성','데이터센터·전력'];
 const point=feed?.provisional?.points?.find(p=>p.date===provisionalDate);
 return feed?.status==='READY'&&feed.r32ProvisionalStatus==='READY'&&
  feed.confirmedObservationDate===confirmedDate&&feed.themes?.length===10&&
  names.every(name=>{
   const t=feed.themes.find(t=>t.theme===name),score=point?.scores?.[name];
   return t?.history?.length===252&&t.history.at(-1)?.date===confirmedDate&&
    Number.isFinite(score)&&score>=0&&score<=100;
  });
}
export function r88ProvisionalLanes({provisionalDate,provisionalWait,steps}){
 return provisionalDate?steps:steps.map(([lane])=>[lane,async()=>({status:provisionalWait})]);
}
export async function runTenR88Lanes({steps}={}){
 // Independent errors are recorded per lane; optional failure must not
 // prevent the remaining approved themes from updating.
 const results=[];
 for(const [lane,run] of steps){
  try{results.push({lane,...await run()});}
  catch(error){results.push({lane,status:'BLOCKED',reason:error.code??error.message});}
 }
 return results;
}

// This old post-cycle MUST NOT run: confirmed GMH-only cycles remain separate.
export async function runTenR88Auto(){
 throwMarketParquetRemoved();
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 console.error(JSON.stringify({status:'UNAVAILABLE',reason:MARKETPARQUET_REMOVED_CODE,
  retryable:false,providerCalls:0,sqliteWrites:0,d1Writes:0,schedulerWrites:0}));
 process.exitCode=1;
}
