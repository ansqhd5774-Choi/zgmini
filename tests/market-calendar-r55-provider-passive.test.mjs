import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const providerInRepo=path.resolve(here,'../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs');
const providerInScratch=path.resolve(here,'../breadth-b1-r6-marketparquet-provider.mjs');
const sourceFile=fs.existsSync(providerInRepo)?providerInRepo:providerInScratch;

// Exercise the real provider module with a local parser substitute; it cannot
// make a provider request or require hyparquet to be installed for this test.
test('R55 PC-private observer is independent of S&P 500 match coverage and never blocks B1',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r55-'));
 try{
  const lib=path.join(dir,'lib','market-score');
  const modules=path.join(lib,'node_modules','hyparquet');
  fs.mkdirSync(modules,{recursive:true});
  fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({type:'module'}));
  fs.writeFileSync(path.join(modules,'package.json'),JSON.stringify({name:'hyparquet',type:'module',main:'index.js'}));
  fs.writeFileSync(path.join(modules,'index.js'),`
export async function parquetReadObjects({file}){
 const marker=new TextDecoder().decode(file);
 const date=marker==='PAR1CURR'?'2026-10-30':'2026-10-29';
 return Array.from({length:3000},(_,i)=>({date,symbol:'T'+i,asset_type:'stock',close:100,volume:10000}));
}`);
  fs.writeFileSync(path.join(lib,'breadth-b1-r3-contract.mjs'),`
export const B1_R3_MARKETPARQUET_BASE='https://example.invalid/market';
export const B1_R3_MARKETPARQUET_PROVIDER='fixture';
export const B1_R3_MARKETPARQUET_SOURCE='fixture';
export const B1_R3_MARKETPARQUET_FEED='fixture';
export const B1_R3_MARKETPARQUET_SOURCE_CONTRACT='fixture';
export const B1_R3_MIN_COVERAGE=.98;
`);
  fs.writeFileSync(path.join(lib,'breadth-b1-r3-calendar.mjs'),`
export const isMarketSession=()=>true;
`);
  fs.copyFileSync(sourceFile,path.join(lib,'breadth-b1-r6-marketparquet-provider.mjs'));
  const {fetchMarketParquetLatestPairs}=await import(pathToFileURL(path.join(lib,'breadth-b1-r6-marketparquet-provider.mjs')).href);
  const calls=[],observed=[];
  const fetchImpl=async url=>{
   calls.push(url);
   const current=url.endsWith('/latest.parquet');
   const bytes=new TextEncoder().encode(current?'PAR1CURR':'PAR1PREV');
   return {status:200,headers:{get:()=>null},url:current?'https://example.invalid/market/2026-10-30.parquet':url,
    arrayBuffer:async()=>bytes.buffer};
  };
  const args={symbols:Array.from({length:500},(_,i)=>'X'+i),asOfDate:'2026-10-30',fetchImpl};
  const result=await fetchMarketParquetLatestPairs({...args,
   snapshotObserver:async snapshot=>{observed.push(snapshot);}});
  assert.equal(result.coverage,0);
  assert.equal(result.providerRequests,2);
  assert.equal(calls.length,2);
  assert.equal(observed.length,1,'R45 sees 3,000 full-stock rows even if B1 matching is sparse');
  assert.equal(observed[0].currentRows.length,3000);
  assert.equal(observed[0].previousRows.length,3000);
  const preserved=await fetchMarketParquetLatestPairs({...args,
   snapshotObserver:async()=>{throw Error('R45_PRIVATE_FAILURE');}});
  assert.equal(preserved.coverage,0,'sidecar errors must not change the original B1 decision');
  assert.equal(preserved.providerRequests,2);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
