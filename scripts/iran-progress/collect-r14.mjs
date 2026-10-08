// Collection has no authority to verify facts, calculate scores, or publish data.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {openStore,hash} from './store.mjs';
import {collectGdeltArchiveChunk,readBoundedBytes} from './gdelt-backfill-r14.mjs';
import {parseMaradAlertsPage} from './marad-alert-candidates.mjs';
import {parseMaradAdvisoryContext} from './marad-advisory-context.mjs';
import {collectionSlot,completedCollectionSlot} from './collection-policy.mjs';
import {collectSources} from './sources.mjs';
const args=process.argv.slice(2);
if(args.some(a=>a!=='--scheduled'&&!/^--max=\d+$/.test(a)))throw Error('IRAN_COLLECTION_ARGS_INVALID');
const max=Number((args.find(a=>a.startsWith('--max='))??'--max=48').split('=')[1]);
if(!Number.isSafeInteger(max)||max<1||max>96)throw Error('IRAN_COLLECTION_ARGS_INVALID');
const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
const store=openStore(path.join(base,'iran.sqlite')),owner=randomUUID(),now=Date.now();
try{
 if(!store.claim(owner,now)){console.log(JSON.stringify({status:'RUNNING',reason:'LEASE_HELD'}));}
 else if(args.includes('--scheduled')&&completedCollectionSlot(store.getCheckpoint('collection-slot-r14'),now)){
  console.log(JSON.stringify({status:'SKIPPED',reason:'COLLECTION_SLOT_COMPLETED'}));
 }else{
  const sources=await collectSources({now,ids:['ais','marad','gdelt','iaea']});
  for(const [id,source] of Object.entries(sources)){
   const {body,...metadata}=source;
   store.putSource(id+':'+hash(source),{...metadata,bodyHash:body?hash(body):null},now);
  }
  store.checkpoint('collection-sources-r14',Object.fromEntries(Object.entries(sources).map(([id,s])=>[id,{status:s.status,httpStatus:s.httpStatus,observationDate:s.observationDate,lastAttemptAt:s.lastAttemptAt}])));
  let maradAdvisories={status:'SOURCE_FAILED',attackCount:null,eventVerified:false,coverageVerified:false};
  if(sources.marad?.status==='COLLECTED'){
   maradAdvisories={...parseMaradAdvisoryContext(sources.marad.body),bodyHash:hash(sources.marad.body),collectedAt:now};
   const {collectedAt,...receipt}=maradAdvisories;
   store.putSource('marad-advisory-context-v1:'+hash(receipt),receipt,now);
  }
  store.checkpoint('marad-advisory-context-r14',maradAdvisories);
  let marad={status:'SOURCE_FAILED'};
  try{
   const response=await fetch('https://www.maritime.dot.gov/msci-alerts',{signal:AbortSignal.timeout(20000)});
   if(response.status!==200)marad={status:'SOURCE_FAILED',httpStatus:response.status};
   else{
    const bytes=await readBoundedBytes(response,3000000);
    const parsed=parseMaradAlertsPage(bytes.toString('utf8'));
    for(const candidate of parsed.candidates)store.putCandidate(candidate,now);
    marad={status:parsed.status,candidateCount:parsed.candidates.length,bodyHash:hash(bytes.toString('utf8')),attackCount:null,coverageVerified:false};
    store.putSource('marad-alerts:'+marad.bodyHash,{...marad,sourceUrl:'https://www.maritime.dot.gov/msci-alerts'},now);
   }
  }catch{marad={status:'SOURCE_FAILED',reason:'MARAD_COLLECTION_FAILED'};}
  const backfill=await collectGdeltArchiveChunk({store,now,maxArchives:max,archiveDirectory:path.join(base,'gdelt-archives'),throttle:()=>new Promise(r=>setTimeout(r,500))});
  const cp=store.getCheckpoint('gdelt-events-r14');
  const storageVerified=cp?.nextAt===backfill.nextAt&&cp?.archivesSaved===backfill.archivesSaved;
  const finishedAt=Date.now();
  const report={version:'IRAN_COLLECTION_R14',startedAt:now,finishedAt,sources:store.getCheckpoint('collection-sources-r14'),marad,maradAdvisories,backfill,storageVerified,
   eventVerification:'PENDING',coverageVerified:false,publication:'NOT_REQUESTED'};
  store.checkpoint('collection-last-run-r14',report);
  // Failures remain resumable within the same six-hour slot; provider cooldown is separate.
  if(args.includes('--scheduled'))store.checkpoint('collection-slot-r14',{slot:collectionSlot(now),completed:storageVerified&&['RUNNING','CAUGHT_UP'].includes(backfill.status),finishedAt});
  fs.writeFileSync(path.join(base,'collection-last-run.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
  if(backfill.status==='SOURCE_FAILED'||backfill.status==='BACKLOG_BLOCKED')process.exitCode=2;
 }
}finally{store.release(owner);store.close();}
