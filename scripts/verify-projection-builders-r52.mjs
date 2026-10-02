import fs from 'node:fs';import path from 'node:path';import {build} from 'esbuild';import {DatabaseSync} from 'node:sqlite';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {candidate2dbImportBoundary} from './candidate-2db-import-boundary.mjs';import {readOnlyDualEnv} from '../worker/candidate-2db-guard.mjs';
fs.mkdirSync('work/r52-fixtures',{recursive:true});
const sqlite=process.argv[2];if(!sqlite)throw Error('Authoritative SQLite path required');
const db=new DatabaseSync(sqlite,{readOnly:true}),trace=[];const native={prepare(sql){trace.push(sql);const make=(args=[])=>({bind(...a){return make(a)},async first(){return db.prepare(sql).get(...args)??null},async all(){return {results:db.prepare(sql).all(...args)}}});return make()},batch(){throw Error('LOCAL_WRITE_DISABLED')}};
globalThis.__R52_FIXTURE_ENV=readOnlyDualEnv({DB_CORE:native,DB_HISTORY:native});
const boundary=candidate2dbImportBoundary(process.cwd());
async function bundle(entry,label,{oldRoute=false}={}){
 const outfile=path.resolve('work/r52-fixtures/'+label+'.mjs');
 await build({entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',logLevel:'silent',plugins:[{name:'fixture',setup(b){
 b.onResolve({filter:/cloudflare:workers/},()=>({path:'fixture-env',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const env=globalThis.__R52_FIXTURE_ENV;'}));
 b.onLoad({filter:/candidate-env-2db\.ts$/},()=>({contents:'export const env=globalThis.__R52_FIXTURE_ENV;'}));
 b.onLoad({filter:/\.(?:mjs|ts|js)$/},async args=>{
 let code=fs.readFileSync(args.path,'utf8');
 if(oldRoute&&args.path.endsWith(path.join('worker','market-operational-store.mjs')))return {contents:'export function marketOperationalStore(){return {readScore:async()=>globalThis.__R52_INPUT.snapshot}};export async function readStoredMarketInputs(){return globalThis.__R52_INPUT.inputs};'};
 if(oldRoute&&args.path.endsWith(path.join('lib','market-score','sec-earnings-e1-r4-provider.mjs')))return {contents:'export async function readEarningsE1R4StoredScore(){return globalThis.__R52_INPUT.e1;}'};
 code=boundary.transform(code,args.path)?.code??code;
 return {contents:code,loader:args.path.endsWith('.ts')?'ts':'js'};
 });}}]});
 return import(pathToFileURL(outfile).href);
}
const source=await bundle('worker/projection-source-r52.mjs','source'),builders=await bundle('worker/projection-builders.ts','builders');
const NativeDate=Date,at=Date.parse('2026-10-02T18:00:00Z');globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[at]))}static now(){return at}};
const originalFetch=globalThis.fetch;let providers=0;globalThis.fetch=()=>{providers++;throw Error('PROVIDER_CALL_FORBIDDEN')};
const result=[];
try{
 for(const id of Object.keys(builders.builders)){
  const input=await source.loadProjectionSource(id,globalThis.__R52_FIXTURE_ENV,{now:at});globalThis.__R52_INPUT=input;
  const output=JSON.parse(JSON.stringify(await builders.builders[id](input)));let old;
  if(id==='koreaFearGreed'){
   const module=await import('../worker/korea-funds.mjs');const response=await module.createKoreaFundsHandler({clock:()=>new Date(at),loadProgress:()=>input.progress,loadRows:()=>input.rawRows})(new Request('https://fixture/api/indicators/korea-funds'),{});old=await response.json();
  }else{
   const slug={liquidityCrisis:'liquidity-crisis',creditRisk:'credit-risk',earningsRecession:'earnings-recession',assetBubble:'asset-bubble',debtRisk:'debt-risk',supplyShock:'supply-shock'}[id]??id;
   const original=await bundle('app/api/'+slug+'-detail/route.ts','old-'+id,{oldRoute:true});old=await (await original.GET(new Request('https://fixture/api/'+slug+'-detail'))).json();
  }
  assert.deepEqual(output,old,id+' builder differs from original route');
  result.push({id,exact:true,bytes:Buffer.byteLength(JSON.stringify(output)),hash:createHash('sha256').update(JSON.stringify(output)).digest('hex')});
  console.log(id+' exact PASS');
 }
 assert.equal(providers,0);assert(trace.every(sql=>/^SELECT\b/i.test(sql.trim())));
 fs.writeFileSync('docs/migration/d1-r52/BUILDER_PARITY.json',JSON.stringify({at:new NativeDate().toISOString(),fixtureClock:new NativeDate(at).toISOString(),method:'Authoritative SQLite + unchanged original route execution vs extracted pure builder; identical captured inputs, fixed clock, all fields retained.',result,providerCalls:providers,sqlCount:trace.length,sqlTrace:trace},null,2));
}finally{globalThis.fetch=originalFetch;globalThis.Date=NativeDate;db.close();}
