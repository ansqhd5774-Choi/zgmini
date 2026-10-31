/** One-shot US breadth collection. No schedule, source, or DB-schema changes. */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {prepareUsBreadth,publishUsBreadth} from './scripts/pc-writer/market-breadth-us-r1.mjs';

const source=path.dirname(fileURLToPath(import.meta.url));
const reportPath=path.join(source,'US_BREADTH_PC_R5_MANUAL_RESULT.txt');
const home=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
const root='E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const result={at:new Date().toISOString(),mode:'MANUAL_ON_DEMAND',market:'US_ONLY',
  scheduleChanged:false,existingPcSourceChanged:false};
const set=(key,value)=>{result[key]=value;};
const safeCode=value=>/^[A-Z0-9_]+$/.test(String(value??''))?value:'UNCLASSIFIED';
const readJSON=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const git=args=>execFileSync('git',['-C',root,...args],{encoding:'utf8',windowsHide:true,timeout:10000}).trim();

function adapter(db){
  return {prepare(sql){
    const stmt=db.prepare(sql);
    const bound=(values=[])=>({
      bind(...args){return bound(args);},
      async all(){return {results:stmt.all(...values)};},
      async first(){return stmt.get(...values)??null;},
    });
    return bound();
  }};
}

async function run(){
  if(process.platform!=='win32'||Number(process.versions.node.split('.')[0])<24)
    throw Error('WINDOWS_NODE_24_REQUIRED');
  if(!process.execPath.toLowerCase().startsWith('e:\\zgmini\\runtime\\'))
    throw Error('APPROVED_NODE_NOT_SELECTED');
  const config=readJSON(path.join(home,'config.json'));
  if(config?.enabled!==true||config?.collectionTarget!=='pc'||!config?.core)
    throw Error('PC_CONFIG_NOT_APPROVED');
  if(!fs.existsSync(root))throw Error('APPROVED_PC_SOURCE_MISSING');
  const head=git(['rev-parse','HEAD']);
  set('pcSourceSha',head);
  if(head!==config.source)throw Error('APPROVED_PC_SOURCE_MISMATCH');
  execFileSync('git',['-C',root,'diff','--quiet','HEAD','--','worker','lib','scripts/pc-writer'],{
    windowsHide:true,timeout:10000,
  });
  const collect=path.join(root,'scripts','pc-writer','collect-local.mjs');
  if(!fs.existsSync(collect)||!fs.readFileSync(collect,'utf8').includes('--job='))
    throw Error('APPROVED_COLLECTOR_UNAVAILABLE');
  const d1file=path.join(root,'scripts','pc-writer','d1.mjs');
  if(!fs.existsSync(d1file))throw Error('APPROVED_D1_CLIENT_MISSING');

  // Deliberately no NY-hour gate. The approved collector and per-day source
  // audit below must still pass before any remote publication can occur.
  const started=Date.now();
  const collection=spawnSync(process.execPath,[collect,'--job=breadth'],{
    cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:20*60*1000,
  });
  set('collectorExit',collection.status===null?'UNAVAILABLE':collection.status);
  if(collection.status!==0)
    throw Error(collection.error?.code==='ETIMEDOUT'?'COLLECTOR_TIMEOUT':'COLLECTOR_EXIT_FAILED');
  const childReport=String(collection.stdout??'').split(/\r?\n/).reverse().map(line=>{
    try{return line.startsWith('{')?JSON.parse(line):null;}catch{return null;}
  }).find(row=>row?.job==='breadth'&&typeof row?.status==='string');
  const latest=childReport??readJSON(path.join(home,'local-collection-last-run.json'));
  const at=Date.parse(latest?.at??'');
  set('collectorJob',safeCode(latest?.job));
  set('collectorStatus',safeCode(latest?.status));
  if(latest?.job!=='breadth'||(!childReport&&(!Number.isFinite(at)||at<started-2000)))
    throw Error('COLLECTOR_RUN_NOT_VERIFIED');
  if(latest.status!=='COMPLETE'){
    set('status','WAIT_COLLECTOR');
    return;
  }

  let db,prepared;
  try{
    db=new DatabaseSync(path.join(home,'storage','core.sqlite'),{readOnly:true});
    prepared=await prepareUsBreadth(adapter(db));
  }finally{try{db?.close();}catch{}}
  set('expectedDate',prepared.expectedDate??prepared.body?.observationDate??null);
  set('calculationStatus',safeCode(prepared.status));
  if(!prepared.prepared){
    set('status','WAIT_VERIFIED_SOURCE');
    return;
  }
  set('observationDate',prepared.body.observationDate);
  set('eligibleCount',prepared.body.eligibleCount);
  set('up',prepared.body.counts.rising);
  set('flat',prepared.body.counts.unchanged);
  set('down',prepared.body.counts.falling);

  const module=await import(pathToFileURL(d1file).href);
  if(typeof module?.client!=='function'||typeof module?.credential!=='function')
    throw Error('D1_COMPATIBILITY_UNAVAILABLE');
  const remote=module.client(config,()=>module.credential(root));
  const published=await publishUsBreadth(remote,config.core,prepared,{now:Date.now()});
  set('publicationStatus',safeCode(published.status));
  set('status',['VERIFIED','ALREADY_VERIFIED'].includes(published.status)
    ?'PUBLISHED_OR_ALREADY_VERIFIED':'PUBLICATION_NOT_READY');
}

try{await run();}
catch(error){set('status','FAILED');set('reason',safeCode(error?.message));process.exitCode=1;}
finally{
  const lines=['REPORT=US_BREADTH_PC_R5_MANUAL','MARKET=US_ONLY',
    ...Object.entries(result).map(([key,value])=>`${key}=${String(value??'NULL').replace(/[\r\n]/g,' ').slice(0,150)}`)];
  try{fs.writeFileSync(reportPath,lines.join('\r\n')+'\r\n','utf8');}
  catch{process.exitCode=2;}
  console.log(`MANUAL_STATUS=${result.status??'UNKNOWN'}`);
  console.log(`RESULT_FILE=${reportPath}`);
}
