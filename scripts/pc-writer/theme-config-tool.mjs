import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
import {readDefinition,readRegistered,registerDefinition,safeDirectory,ensure,digest,validDate,listRegistered} from './theme-config-registry.mjs';
import {collectConfigured} from './theme-optional-collect.mjs';
import {scoreRegistered} from './theme-config-score.mjs';
const root=()=>process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data';
const legacy=()=>JSON.parse(fs.readFileSync(new URL('../../config/theme-data-registry.json',import.meta.url)));
export {listRegistered};
export function planRegistered(dataRoot,id){
 const r=readRegistered(dataRoot,id),home=path.join(fs.realpathSync(dataRoot),'themes',r.internalId);
 let score=null;
 const manifest=path.join(home,'raw-manifest.json'),derived=path.join(home,'derived');
 if(fs.existsSync(manifest)&&fs.existsSync(derived)){
  const sourceVersion='GMH_MANIFEST_SHA256_'+digest(fs.readFileSync(manifest));
  for(const name of fs.readdirSync(derived).filter(n=>/^score-[a-f0-9]{64}\.json$/.test(n))){
   const file=path.join(derived,name);ensure(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink(),'CONFIG_DERIVED_REDIRECT');
   const bytes=fs.readFileSync(file);ensure(digest(bytes)===name.slice(6,-5),'CONFIG_DERIVED_SHA');
   const stored=JSON.parse(bytes);
   if(stored.definitionSha256===r.sha256&&stored.sourceVersion===sourceVersion&&stored.profile===r.definition.profile&&
    (!score||stored.observationDate>score.observationDate))score=stored;
  }
 }
 return {status:score?.status??(fs.existsSync(manifest)?'STORED_SCORE_NOT_READY':'REGISTERED_AWAITING_SOURCE'),id,label:r.definition.label,etfs:r.definition.etfs,
  profile:r.definition.profile,definitionSha256:r.sha256,score:score?.score??null,observationDate:score?.observationDate??null,
  publicConnection:'NOT_PROBED_READONLY_LOCAL',evidence:'STORED_METADATA_NOT_REPLAY',providerCalls:0,d1Writes:0,schedulerWrites:0};
}
export async function runConfiguredOnce({dataRoot,id,end=new Date().toISOString().slice(0,10),fetchImpl=fetch,maxRequests=4}={}){
 const r=readRegistered(dataRoot,id);ensure(validDate(end)&&end<=new Date().toISOString().slice(0,10)&&end>=r.definition.startDate,'CONFIG_END_DATE');
 const home=safeDirectory(dataRoot,'themes/'+r.internalId,{create:true});
 const dir=safeDirectory(home,'state',{create:true}),lock=path.join(dir,'configured-cycle.lock');
 const fd=fs.openSync(lock,'wx');fs.writeSync(fd,JSON.stringify({pid:process.pid,at:new Date().toISOString()}));fs.closeSync(fd);
 try{
  // Resume initial bounded history window until all ETF pages are committed.
  // Subsequent runs request a fresh overlapping window on each new UTC day;
  // same-day completion is reused instead of silently resetting checkpoints.
  const stateFile=path.join(dir,'configured-cycle.json');
  if(fs.existsSync(stateFile))ensure(!fs.lstatSync(stateFile).isSymbolicLink(),'CONFIG_STATE_REDIRECT');
  const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):null;
  if(state)ensure(state.definitionSha256===r.sha256&&validDate(state.start)&&validDate(state.end),'CONFIG_STATE_IDENTITY');
  if(state?.complete&&state.end===end){
   const stored=planRegistered(dataRoot,id);
   if(stored.status==='PRIVATE_SCORE_READY'||stored.status==='PRIVATE_HISTORY_PENDING')return {...stored,status:'WINDOW_ALREADY_COMMITTED_NEXT_DAY_RECHECK',providerCalls:0};
  }
  const replayOnly=state?.complete&&state.end===end;
  const start=replayOnly?state.start:state?.complete?new Date(Date.parse(state.end+'T00:00:00Z')-6*86400000).toISOString().slice(0,10):state?.start??r.definition.startDate;
  const through=state&&!state.complete?state.end:end;
  const collection=replayOnly?{status:'PRIVATE_RAW_COLLECTION_COMPLETE',providerCalls:0}:await collectConfigured({dataRoot,id,start,end:through,maxRequests,fetchImpl});
  const next={definitionSha256:r.sha256,start,end:through,complete:collection.status==='PRIVATE_RAW_COLLECTION_COMPLETE',lastStatus:collection.status};
  const tmp=stateFile+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(next,null,2)+'\n',{flag:'wx'});fs.renameSync(tmp,stateFile);
  if(!next.complete)return {status:collection.status,id,collection,publicConnection:'NOT_ENABLED',d1Writes:0};
  const score=scoreRegistered({dataRoot,registration:r}),out=safeDirectory(home,'derived',{create:true});
  const bytes=Buffer.from(JSON.stringify(score,null,2)+'\n'),sha=digest(bytes),file=path.join(out,'score-'+sha+'.json');
  if(!fs.existsSync(file))fs.writeFileSync(file,bytes,{flag:'wx'});
  ensure(!fs.lstatSync(file).isSymbolicLink()&&digest(fs.readFileSync(file))===sha,'CONFIG_DERIVED_READBACK');
  return {status:score.status,id,score:score.score,observationDate:score.observationDate,collection,artifactSha256:sha,publicConnection:'NOT_ENABLED',d1Writes:0,schedulerWrites:0};
 }finally{fs.unlinkSync(lock);}
}
export async function runConfiguredSchedule({dataRoot,now=new Date(),fetchImpl=fetch,resourcePolicy=null}={}){
 const resourceFile=path.join(dataRoot,'theme-config','resource-policy.json');
 if(!resourcePolicy&&fs.existsSync(resourceFile)){
  safeDirectory(dataRoot,'theme-config');ensure(!fs.lstatSync(resourceFile).isSymbolicLink(),'CONFIG_RESOURCE_POLICY_REDIRECT');resourcePolicy=JSON.parse(fs.readFileSync(resourceFile,'utf8'));
 }
 const dailyBudget=resourcePolicy?.dailyProviderRequests??4;
 ensure(Number.isSafeInteger(dailyBudget)&&dailyBudget>0,'CONFIG_DAILY_RESOURCE_POLICY');
 const entries=listRegistered(dataRoot);
 if(!entries.length)return {status:'NO_REGISTERED_THEMES',providerCalls:0,d1Writes:0,schedulerWrites:0};
 const dir=safeDirectory(dataRoot,'theme-config/state',{create:true}),lock=path.join(dir,'scheduled.lock');
 const fd=fs.openSync(lock,'wx');fs.writeSync(fd,JSON.stringify({pid:process.pid,at:now.toISOString()}));fs.closeSync(fd);
 try{
  const file=path.join(dir,'scheduled-budget.json'),day=now.toISOString().slice(0,10);
  if(fs.existsSync(file))ensure(!fs.lstatSync(file).isSymbolicLink(),'CONFIG_BUDGET_REDIRECT');
  const prior=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
  if(prior)ensure(validDate(prior.day)&&Number.isInteger(prior.calls)&&prior.calls>=0&&prior.calls<=4,'CONFIG_BUDGET_INVALID');
  const state={day,calls:prior?.day===day?prior.calls:0,nextId:prior?.nextId??entries[0].definition.id};
  const save=()=>{const tmp=file+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state)+'\n',{flag:'wx'});fs.renameSync(tmp,file);};
  const start=Math.max(0,entries.findIndex(r=>r.definition.id===state.nextId)),results=[];
  for(let i=0;i<entries.length&&state.calls<dailyBudget;i++){
   const index=(start+i)%entries.length,r=entries[index];
   state.nextId=entries[(index+1)%entries.length].definition.id;save();
   try{
    const limitedFetch=async(...args)=>{ensure(state.calls<dailyBudget,'CONFIG_DAILY_REQUEST_BUDGET');state.calls++;save();return fetchImpl(...args);};
    results.push(await runConfiguredOnce({dataRoot,id:r.definition.id,end:day,fetchImpl:limitedFetch,maxRequests:Math.min(4,dailyBudget-state.calls)}));
   }catch(e){results.push({id:r.definition.id,status:'STOP',reason:e.code??'CONFIG_SOURCE_OR_IO_ERROR'});}
  }
  const waiting=results.length<entries.length||results.some(r=>r.status.startsWith('WAIT')||r.status==='CHECKPOINT_READY_TO_RESUME');
  return {status:results.some(r=>r.status.startsWith('STOP'))?'PARTIAL_REVIEW_REQUIRED':waiting?'PRIVATE_SCHEDULE_WAITING_SOURCE_OR_BUDGET':'PRIVATE_SCHEDULE_COMPLETED',results,nextId:state.nextId,providerCallsToday:state.calls,requestLimitPerUtcDay:dailyBudget,d1Writes:0,schedulerWrites:0};
 }finally{fs.unlinkSync(lock);}
}
async function cli(){
 const [mode,arg,...extra]=process.argv.slice(2);ensure(!extra.length,'CONFIG_USAGE');
 if(mode==='--platform-inspect'){
  ensure(!arg,'CONFIG_USAGE');
  return (await import('./theme-platform-inspect.mjs')).inspectThemePlatform();
 }
 if(mode==='--validate')return {status:'CONFIG_VALID',definition:readDefinition(arg),providerCalls:0};
 if(mode==='--list'){ensure(!arg,'CONFIG_USAGE');return listRegistered(root()).map(r=>planRegistered(root(),r.definition.id));}
 if(mode==='--register')return registerDefinition({dataRoot:root(),definition:readDefinition(arg),legacyRegistry:legacy()});
 if(mode==='--plan')return planRegistered(root(),arg);
 if(mode==='--cycle')return runConfiguredOnce({dataRoot:root(),id:arg});
 if(mode==='--scheduled'){
  ensure(!arg,'CONFIG_USAGE');
  // This is still the single existing configured-theme scheduled entry.
  // Private collection/calculation runs first with the original UTC 4-GET budget.
  const privateCycle=await runConfiguredSchedule({dataRoot:root()});
  let publicCycle;
  try{
   const {runConfiguredAutoPublish}=await import('./theme-config-auto-publish.mjs');
   publicCycle=await runConfiguredAutoPublish({dataRoot:root()});
  }catch(e){
   publicCycle={status:'PUBLICATION_PARTIAL_REVIEW_REQUIRED',
    reason:e.code??'CONFIG_PUBLIC_SCHEDULE_ERROR',providerCalls:0,d1Writes:0};
  }
  return {...privateCycle,
   status:privateCycle.status==='PARTIAL_REVIEW_REQUIRED'||
    publicCycle.status==='PUBLICATION_PARTIAL_REVIEW_REQUIRED'?
    'PARTIAL_REVIEW_REQUIRED':privateCycle.status,
   privateStatus:privateCycle.status,
   publicConnection:publicCycle,
   d1Writes:publicCycle.d1Writes??0};
 }
 if(mode==='--import'){
  const d=readDefinition(arg),ui=createInterface({input:process.stdin,output:process.stdout});
  try{console.log(`테마: ${d.label}\nETF: ${d.etfs.join(' + ')} / SPY\n산식: ${d.profile}\n비공개 자동 수집·계산 목록에 등록합니다. 예약 전체 UTC 날짜당 최대 4 GET입니다. 사이트 게시는 하지 않습니다.`);
   ensure((await ui.question('등록하려면 REGISTER 입력, 취소하려면 Enter: '))==='REGISTER','CONFIG_CANCELLED');
   return registerDefinition({dataRoot:root(),definition:d,legacyRegistry:legacy()});
  }finally{ui.close();}
 }
 if(mode==='--interactive-cycle'){
  ensure(!arg,'CONFIG_USAGE');const entries=listRegistered(root());console.log(entries.map(r=>r.definition.id+' : '+r.definition.label).join('\n'));
  const ui=createInterface({input:process.stdin,output:process.stdout});
  try{const id=await ui.question('갱신할 테마 ID (취소: Enter): ');readRegistered(root(),id);
   ensure((await ui.question('기존 공급처 GET 최대 4회와 비공개 저장·계산을 실행하려면 RUN 입력: '))==='RUN','CONFIG_CANCELLED');
   return await runConfiguredOnce({dataRoot:root(),id});
  }finally{ui.close();}
 }
 ensure(false,'CONFIG_USAGE');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await cli();console.log(JSON.stringify(result,null,2));if(result?.status?.startsWith('STOP')||result?.status==='PARTIAL_REVIEW_REQUIRED')process.exitCode=2;}
 catch(e){console.error(JSON.stringify({status:'STOP',reason:e.code??'CONFIG_INVALID_OR_IO_ERROR',d1Writes:0,schedulerWrites:0}));process.exitCode=2;}
}
