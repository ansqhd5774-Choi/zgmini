/** Read-only Windows Core/IEX cadence gate. Prints no secrets or raw prices. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {US_BREADTH_PROVISIONAL_KEY,validUsIexProvisional} from '../../lib/market-breadth/us-provisional-r1.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const sha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);

function readJson(file){
 try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}
}
function readCommand(command,args,options){
 try{return execFileSync(command,args,{...options,encoding:'utf8'});}
 catch(error){
  // Some constrained diagnostic shells return an EPERM wrapper even though
  // the read-only command finished (exit 0 with captured output).
  if(error?.status===0&&typeof error.stdout==='string')return error.stdout;
  throw error;
 }
}

export function summarizeUsBreadthCoreEvidence({config,taskXml,taskError,head,dirty,
  quota,cycle,collection,writer,ledger,sidecar,early,remote,remoteError}={}){
 const output=validUsIexProvisional(sidecar?.output)?sidecar.output:null;
 const action=typeof taskXml==='string'?taskXml.match(/<Actions\b[\s\S]*?<Exec\b[\s\S]*?<Command>([^<]*)<\/Command>[\s\S]*?<Arguments>([^<]*)<\/Arguments>/i):null;
 const task={query:taskXml?'XML_READ':'XML_UNAVAILABLE',error:taskError??null,
  triggerPT5M:taskXml?/\<Interval\>PT5M\<\/Interval\>/i.test(taskXml):null,
  ignoreNew:taskXml?/\<MultipleInstancesPolicy\>IgnoreNew\<\/MultipleInstancesPolicy\>/i.test(taskXml):null,
  actionPresent:!!action,
  // The actual VBS -> dispatcher -> Core chain requires separate read-only tracing.
  actionChainVerified:false};
 const started=Date.parse(quota?.at??''),ended=Date.parse(cycle?.at??'');
 const lastCycleStale=Number.isFinite(started)&&Number.isFinite(ended)&&ended<started;
 const elapsedMs=Number.isFinite(started)&&Number.isFinite(ended)&&ended>=started?ended-started:null;
 const slotEnd=output?.slotEndUtc??null;
 // The early report's `at` is only its START, not D1 publication time.
 const earlyCompletedAt=iso(early?.completedAt)?early.completedAt:null;
 const attemptFinishedLagMs=slotEnd&&earlyCompletedAt?
  Date.parse(earlyCompletedAt)-Date.parse(slotEnd):null;
 const remoteRecord=remote?.body;
 const remoteValid=validUsIexProvisional(remoteRecord);
 const remoteSameSlot=remoteValid&&remoteRecord.slotEndUtc===slotEnd;
 const remoteBodyExactMatch=remoteValid&&output!==null&&
  JSON.stringify(remoteRecord)===JSON.stringify(output);
 const remoteStoredAt=Number(remote?.stored_at);
 const remoteStoredAtValid=Number.isSafeInteger(remoteStoredAt)&&remoteStoredAt>0;
 const remoteStoredAtAfterSlot=remoteStoredAtValid&&slotEnd!==null&&
  remoteStoredAt>=Date.parse(slotEnd);
 const earlyForCurrentSlot=!!slotEnd&&early?.slotEndUtc===slotEnd;
 const earlyVerified=earlyForCurrentSlot&&early?.status==='VERIFIED'&&
  (early?.exit===undefined||early?.exit===0);
 return {status:'READ_ONLY_EVIDENCE_NOT_OPERATIONAL_APPROVAL',
  task,source:{configSha:sha(config?.source)?config.source:null,headSha:sha(head)?head:null,
   sourceMatches:sha(config?.source)&&sha(head)?config.source===head:null,
   dirtyCount:Number.isInteger(dirty)?dirty:null,
   enabled:config?.enabled===true,collectionTarget:config?.collectionTarget??null},
  core:{quotaAt:iso(quota?.at)?quota.at:null,quotaStatus:quota?.status??null,
   cycleAt:iso(cycle?.at)?cycle.at:null,cycleStatus:cycle?.status??null,
   collectionStatus:collection?.status??null,writerStatus:writer?.status??null,
   ledgerStatus:ledger?.status??null,lastCycleStale,elapsedMs,
   maySkip15MinSlots:elapsedMs!==null?elapsedMs>=15*60_000:null},
  provisional:{slotEndUtc:slotEnd,observedCount:output?.observedCount??null,
   missingCount:output?.missingCount??null,collectionStatus:output?.collectionStatus??null,
   collectorStatus:cycle?.usProvisional?.status??null,
   earlyStatus:early?.status??null,earlyForCurrentSlot,earlyVerified,
   earlyCompletedAt,attemptFinishedLagMs},
  d1:{queried:remote!==undefined||remoteError!==undefined,
   error:remoteError??null,valid:remote===undefined?null:remoteValid,
   sameSlot:remote===undefined?null:remoteSameSlot,
   bodyExactMatch:remote===undefined?null:remoteBodyExactMatch,
   storedAtAfterSlot:remote===undefined?null:remoteStoredAtAfterSlot,
   storedAt:remoteStoredAtValid?new Date(remoteStoredAt).toISOString():null},
  conclusion:'At least three consecutive natural NY 15-minute slots plus actual Task action chain and D1 readback are required.'};
}

export async function inspectUsBreadthCore({pcHome=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
  remoteReadback=false}={}){
 let taskXml=null,taskError=null,head=null,dirty=null;
 if(process.platform==='win32'){
  try{taskXml=readCommand('schtasks',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
    {windowsHide:true,timeout:20000});}
  catch{taskError='TASK_XML_QUERY_FAILED_NOT_DISABLED_PROOF';}
 }else taskError='WINDOWS_RUNTIME_NOT_AVAILABLE';
 try{head=readCommand('git',['rev-parse','HEAD'],{cwd:root,windowsHide:true}).trim();}
 catch{}
 try{dirty=readCommand('git',['status','--porcelain'],{cwd:root,windowsHide:true})
   .split(/\r?\n/).filter(Boolean).length;}
 catch{}
 const config=readJson(path.join(pcHome,'config.json'));
 let remote,remoteError;
 if(remoteReadback){
  try{
   const {client,credential}=await import('./d1.mjs');
   const api=client(config,()=>credential(root));
   const row=(await api.query(config.core,
    'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',
    [US_BREADTH_PROVISIONAL_KEY])).results?.[0];
   let body=null;try{body=JSON.parse(row?.body??'null');}catch{}
   remote={body,stored_at:row?.stored_at??null};
  }catch{remoteError='D1_READBACK_UNAVAILABLE';}
 }
 return summarizeUsBreadthCoreEvidence({config,taskXml,taskError,head,dirty,
  quota:readJson(path.join(pcHome,'quota-runner-last-run.json')),
  cycle:readJson(path.join(pcHome,'local-cycle-last-run.json')),
  collection:readJson(path.join(pcHome,'local-collection-last-run.json')),
  writer:readJson(path.join(pcHome,'local-writer-last-run.json')),
  ledger:readJson(path.join(pcHome,'local-publication-ledger.json')),
  sidecar:readJson(path.join(pcHome,'local-us-breadth-iex-provisional.json')),
  early:readJson(path.join(pcHome,'local-us-breadth-provisional-early-last-run.json')),
  remote,remoteError});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv.includes('--inspect')||process.argv.some(x=>x.startsWith('--')&&
   !['--inspect','--d1-readback'].includes(x)))throw Error('READ_ONLY_INSPECT_ARGUMENTS_REQUIRED');
 process.stdout.write(JSON.stringify(await inspectUsBreadthCore({
  remoteReadback:process.argv.includes('--d1-readback')}))+'\n');
}
