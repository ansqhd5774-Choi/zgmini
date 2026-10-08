import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {openStore,hash} from './store.mjs';
import {collectSources} from './sources.mjs';
import {buildIranProgress} from '../../lib/iran-progress/r13.mjs';
import {interpretSource} from './ai.mjs';
import {publicBody,publishIran,publishIranStatus} from './publication.mjs';
import {client,credential} from '../pc-writer/d1.mjs';
import {fileURLToPath} from 'node:url';
import {IRAN_CONFLICT_START_DATE} from './contract.mjs';
import {collectDiscovery} from './discovery.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
const store=openStore(path.join(base,'iran.sqlite')),owner=randomUUID(),now=Date.now();
if(!store.claim(owner,now)){store.close();console.log(JSON.stringify({status:'RUNNING',reason:'LEASE_HELD'}));process.exit(0);}
try{
 if(process.argv.includes('--scheduled')){
  const slot=Math.floor((now+9*3600000)/(6*3600000));
  if(store.getCheckpoint('scheduled-slot')?.slot===slot){console.log(JSON.stringify({status:'SKIPPED',reason:'SCHEDULE_SLOT_ALREADY_STARTED'}));process.exitCode=0;}
  else store.checkpoint('scheduled-slot',{slot,startedAt:now});
  if(process.exitCode===0){store.release(owner);store.close();process.exit(0);}
 }
 const verified=store.getCheckpoint('verified-input')??{};
 verified.transit??={baselineApproved:true,termsApproved:false,unit:'daily_transit_calls',portid:'chokepoint6',conflictStartDate:IRAN_CONFLICT_START_DATE};
 const sources=await collectSources({now,conflictStartDate:verified.transit?.conflictStartDate});
 for(const [id,body] of Object.entries(sources)){
  // Unconfirmed reuse terms: preserve provenance/structured measurements, not whole articles.
  const {body:raw,...metadata}=body;
  store.putSource(id+':'+hash(body),{...metadata,bodyHash:raw?hash(raw):null},now);
 }
 store.checkpoint('sources',Object.fromEntries(Object.entries(sources).map(([id,s])=>[id,{status:s.status,httpStatus:s.httpStatus,observationDate:s.observationDate,lastAttemptAt:s.lastAttemptAt}])));
 let discovery={status:'NOT_REQUESTED'};
 if(process.argv.includes('--discover')){
  const d=await collectDiscovery({now,checkpoint:store.getCheckpoint('gdelt-discovery'),maxChunks:2});
  for(const article of d.articles)store.putCandidate(article,now);
  store.checkpoint('gdelt-discovery',d.checkpoint);
  discovery={status:d.status,error:d.error,articlesStored:d.articles.length,processedChunks:d.checkpoint.processedChunks,cursor:d.checkpoint.cursor,target:d.checkpoint.target,knownGapCount:d.checkpoint.knownGaps.length,observationVerified:false};
 }
 // Never infer verified relations or zero attacks from successful downloads.
 const input={...verified,events:store.events()};
 if(verified.transit&&sources.portwatch.rows){
  let baseline=store.getCheckpoint('transit-baseline');
  if(!baseline){
   const end=Date.parse(verified.transit.conflictStartDate+'T00:00:00Z');
   const rows=sources.portwatch.rows.filter(r=>Date.parse(r.date+'T00:00:00Z')>=end-28*86400000&&Date.parse(r.date+'T00:00:00Z')<end);
   if(rows.length===28){baseline={rows,conflictStartDate:verified.transit.conflictStartDate,sourceHash:hash(rows),capturedAt:now};store.putDecision('transit-baseline:'+baseline.sourceHash,baseline,now);store.checkpoint('transit-baseline',baseline);}
  }
  input.transit={...verified.transit,baselineRows:baseline?.rows,baselineFrozen:!!baseline&&baseline.conflictStartDate===verified.transit.conflictStartDate,rows:sources.portwatch.rows,observationDate:sources.portwatch.observationDate,sourceStoredAt:sources.portwatch.sourceStoredAt};
 }
 // Existing coverage is retained, never advanced by mere fetch/compute success.
 for(const c of [...Object.values(input.coverage??{}),input.hormuzCoverage].filter(Boolean)){
  c.requiredSources=c.requiredSources?.map(s=>({...s,status:sources[s.id]?.status==='COLLECTED'?s.status:'SOURCE_FAILED'}));
 }
 let ai={status:'NOT_REQUESTED'};
 if(process.argv.includes('--ai')&&sources.iaea.status==='COLLECTED'){
  const text=(sources.iaea.body.match(/<item\b[\s\S]*?<\/item>/gi)??[]).filter(x=>/iran/i.test(x)).slice(0,3).join('\n').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,12000);
  if(text){
   const inputHash=hash(text),done=store.getCheckpoint('ai:'+inputHash);
   if(done)ai={status:'UNCHANGED',sourceHash:inputHash};
   else try{
    const tags=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(5000)}).then(r=>r.json());
    const model=tags.models?.find(m=>m.name==='gemma3:4b');
    ai=await interpretSource(text,{modelDigest:model?.digest,now});
    store.putDecision(inputHash+':'+ai.modelDigest+':'+ai.promptVersion,ai,now);store.checkpoint('ai:'+inputHash,{status:ai.status});
    ai={status:ai.status,candidateCount:ai.candidates.length,sourceHash:ai.sourceHash};
   }catch{ai={status:'PENDING',reason:'AI_CANDIDATE_VALIDATION_FAILED'};}
  }
 }
 if(process.argv.includes('--ai')){
  const article=store.candidates(1)[0];
  if(article){
   try{
    const tags=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(5000)}).then(r=>r.json());
    const model=tags.models?.find(m=>m.name==='gemma3:4b');
    const interpreted=await interpretSource(article.title,{modelDigest:model?.digest,now:Date.now()});
    store.putDecision('discovery:'+article.id+':'+interpreted.modelDigest+':'+interpreted.promptVersion,{...interpreted,articleId:article.id,url:article.url,sourceLevel:'HEADLINE_ONLY',eventVerification:'PENDING'},interpreted.interpretedAt);
    store.finishCandidate(article.id,'REVIEW_PENDING');ai={status:'CANDIDATE_ONLY',candidateCount:interpreted.candidates.length,sourceLevel:'HEADLINE_ONLY'};
   }catch{ai={status:'PENDING',reason:'AI_DISCOVERY_VALIDATION_FAILED'};}
  }
 }
 // Candidate interpretation never advances the verified-input checkpoint.
 // Calculate only after collection/interpretation has completed.
 const calculatedAt=Date.now(),result=buildIranProgress(input,calculatedAt),id=store.calculate(input,result);
 let publication='NOT_SUBMITTED';
 if(process.argv.includes('--publish')){
  const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
  const remote=client(config,credential(root));
  if(result.status!=='READY'){await publishIranStatus(remote,config.core,result);publication='STATUS_VERIFIED';}
  else {
  const history=store.db.prepare("SELECT body FROM publications ORDER BY published_at").all().map(r=>JSON.parse(r.body)).map(b=>({at:b.publishedAt,value:b.score}));
  const publishedAt=Date.now();history.push({at:publishedAt,value:result.score});
  const body=publicBody(result,history,publishedAt),readback=await publishIran(remote,config.core,body,{now:publishedAt});
  publication=readback.status;
  if(publication==='VERIFIED'||publication==='UNCHANGED')store.publication(id,body,publishedAt);
  await publishIranStatus(remote,config.core,result);
  }
 }
 const report={id,version:result.version,status:result.status,score:result.score,missing:result.missing,sources:store.getCheckpoint('sources'),discovery,ai,calculatedAt,publication,reason:result.status==='READY'?null:'VERIFIED_INPUT_CONTRACT_PENDING'};
 fs.writeFileSync(path.join(base,'last-run.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{store.release(owner);store.close();}
