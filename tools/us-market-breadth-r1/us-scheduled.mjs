/** Independent US-only R1 sidecar. Uses the approved PC collector, never replaces it. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {prepareUsBreadth,publishUsBreadth} from './scripts/pc-writer/market-breadth-us-r1.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const home=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
const root='E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const resultFile=path.join(home,'us-market-breadth-r1-last-run.json');
const status={at:new Date().toISOString(),feature:'US_BREADTH_R1',source:'APPROVED_PC_SQLITE',providerRowsExported:0};
const safeCode=s=>/^[A-Z0-9_]+$/.test(String(s??''))?s:'UNCLASSIFIED';
const record=(key,value)=>{status[key]=value;};
const git=args=>execFileSync('git',['-C',root,...args],{encoding:'utf8',windowsHide:true,timeout:10000}).trim();
const readJSON=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const localAdapter=db=>({prepare(sql){
 const stmt=db.prepare(sql);
 const bound=(args=[])=>({
  async all(){return {results:stmt.all(...args)};},
  async first(){return stmt.get(...args)??null;},
  bind(...values){return bound(values);},
 });
 return bound();
}});

async function run(){
 if(Number(process.versions.node.split('.')[0])<24)throw Error('NODE_24_REQUIRED');
 if(process.platform!=='win32')throw Error('WINDOWS_PC_REQUIRED');
 const config=readJSON(path.join(home,'config.json'));
 if(config?.enabled!==true||config?.collectionTarget!=='pc'||!config?.core)throw Error('PC_CONFIG_NOT_APPROVED');
 if(!fs.existsSync(root))throw Error('APPROVED_ROOT_MISSING');
 const head=git(['rev-parse','HEAD']);
 if(head!==config.source)throw Error('APPROVED_SOURCE_MISMATCH');
 // Fail closed when source modules differ from the approved git source.
 execFileSync('git',['-C',root,'diff','--quiet','HEAD','--','worker','lib','scripts/pc-writer'],{windowsHide:true,timeout:10000});
 const collect=path.join(root,'scripts','pc-writer','collect-local.mjs');
 if(!fs.existsSync(collect))throw Error('COLLECTOR_ENTRY_MISSING');

 // At 21:00 Korea time this is 07:00/08:00 New York, after the nightly feed.
 const ny=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
 if(ny<6){record('status','WAIT_NY_MORNING');return;}

 const started=Date.now();
 const collection=spawnSync(process.execPath,[collect,'--job=breadth'],{
  cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:20*60*1000,
 });
 record('collectorExit',collection.status===null?'UNAVAILABLE':collection.status);
 if(collection.status!==0)throw Error(collection.error?.code==='ETIMEDOUT'?'COLLECTOR_TIMEOUT':'COLLECTOR_EXIT_FAILED');
 // Core can also finish between this child process and a shared report read.
 // Prefer the child process's own returned report, with the on-disk report only
 // as a fallback for approved older entrypoints.
 const childReport=String(collection.stdout??'').split(/\r?\n/).reverse().map(line=>{
  try{return line.startsWith('{')?JSON.parse(line):null;}catch{return null;}
 }).find(value=>value?.job==='breadth'&&typeof value?.status==='string');
 const latest=childReport??readJSON(path.join(home,'local-collection-last-run.json'));
 const when=Date.parse(latest?.at??'');
 record('collectorJob',safeCode(latest?.job));
 record('collectorStatus',safeCode(latest?.status));
 if(latest?.job!=='breadth'||(!childReport&&(!Number.isFinite(when)||when<started-2000)))throw Error('COLLECTOR_RUN_NOT_VERIFIED');
 if(latest?.status!=='COMPLETE'){
  record('status','WAIT_COLLECTOR');
  return;
 }

 let db;
 let prepared;
 try{
  db=new DatabaseSync(path.join(home,'storage','core.sqlite'),{readOnly:true});
  prepared=await prepareUsBreadth(localAdapter(db));
 }finally{try{db?.close();}catch{}}
 record('expectedDate',prepared.expectedDate??prepared.body?.observationDate??null);
 record('calculationStatus',safeCode(prepared.status));
 if(!prepared.prepared){record('status','WAIT_VERIFIED_SOURCE');return;}
 record('observationDate',prepared.body.observationDate);
 record('eligibleCount',prepared.body.eligibleCount);
 record('up',prepared.body.counts.rising);
 record('flat',prepared.body.counts.unchanged);
 record('down',prepared.body.counts.falling);

 // Reuse the exact active account, D1 database and authenticated client.
 const module=await import(pathToFileURL(path.join(root,'scripts','pc-writer','d1.mjs')).href);
 if(typeof module?.client!=='function'||typeof module?.credential!=='function')throw Error('D1_COMPATIBILITY_UNAVAILABLE');
 const remote=module.client(config,()=>module.credential(root));
 const published=await publishUsBreadth(remote,config.core,prepared,{now:Date.now()});
 record('publicationStatus',safeCode(published.status));
 record('status',['VERIFIED','ALREADY_VERIFIED'].includes(published.status)?'PUBLISHED_OR_ALREADY_VERIFIED':'PUBLICATION_NOT_READY');
}

try{await run();}
catch(error){record('status','FAILED');record('reason',safeCode(error?.message));process.exitCode=1;}
finally{
 try{fs.writeFileSync(resultFile,JSON.stringify(status,null,2)+'\n','utf8');}catch{process.exitCode=2;}
 console.log(`US_BREADTH_R1_STATUS=${status.status}`);
 console.log(`US_BREADTH_R1_REPORT=${resultFile}`);
}
