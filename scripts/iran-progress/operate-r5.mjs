import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {openStore} from './store.mjs';
import {storedR3Candidates,resolveR3Events} from './operate-r3.mjs';
import {R3_FEEDS} from './continuous-news-r3.mjs';
import {CLASSIFIER_VERSION} from '../../lib/iran-progress/reference-flow-r3.mjs';
import {kstCalendarDate} from '../../lib/iran-progress/chart-history.mjs';
import {calculateIranDailyAnchorShadow} from '../../lib/iran-progress/daily-anchored-shadow-r5.mjs';
import {buildIranR5Public} from '../../lib/iran-progress/daily-public-r5.mjs';
import {independentlyCorroboratedR5Positives} from '../../lib/iran-progress/verified-positive-r5.mjs';
import {publishIranR5Provisional} from './publication.mjs';
import {client,credential} from '../pc-writer/d1.mjs';

export function calculateOperationalR5(store,{now=Date.now()}={}){
 const checkpoint=store.getCheckpoint('continuous-news-last-run-r3');
 const checked=checkpoint?.lastDiscoverySuccessAt;
 if(!Number.isSafeInteger(checked)||checked>now||now-checked>86400000||
  checkpoint.classifierVersion!==CLASSIFIER_VERSION||
  !Array.isArray(checkpoint.feeds)||checkpoint.feeds.length!==R3_FEEDS.length||
  checkpoint.feeds.some(f=>f.status!=='COLLECTED'||!R3_FEEDS.some(x=>x.id===f.id))||
  new Set(checkpoint.feeds.map(f=>f.id)).size!==R3_FEEDS.length||
  !['UPDATED','ANALYZED_NO_CHANGE','NO_NEW_ARTICLES'].includes(checkpoint.status))
  throw Error('R5_SOURCE_COLLECTION_UNREADY');
 const articles=storedR3Candidates(store),resolution=resolveR3Events(articles);
 const unique=independentlyCorroboratedR5Positives(resolution.accepted,articles);
 const firstSeen=new Map(),revisionCount=new Map();
 for(const row of store.db.prepare("SELECT body,stored_at FROM sources WHERE id LIKE 'news-metadata:%' ORDER BY stored_at,id").all()){
  const a=JSON.parse(row.body);
  if(typeof a.sourceUrl!=='string')continue;
  const n=Number(row.stored_at),prev=firstSeen.get(a.sourceUrl);
  if(Number.isSafeInteger(n)&&n>0&&(prev===undefined||n<prev))firstSeen.set(a.sourceUrl,n);
  revisionCount.set(a.sourceUrl,(revisionCount.get(a.sourceUrl)??0)+1);
 }
 if(unique.some(e=>!firstSeen.has(e.sourceUrl)||revisionCount.get(e.sourceUrl)!==1))
  throw Error('R5_FIRST_SEEN_OR_REVISIONS_REVIEW_REQUIRED');
 const input=unique.map(e=>({...e,sourceStoredAt:firstSeen.get(e.sourceUrl)}));
 const shadow=calculateIranDailyAnchorShadow(input,{
  asOfDate:kstCalendarDate(now),sensitivityScale:21,
  collectionCheckedAt:checked,collectionStatus:checkpoint.status,
 });
 if(shadow.status!=='SHADOW_UNCALIBRATED'||shadow.latePriorPublicationDateCount!==0||
  shadow.potentialCasualtyRevisionCount!==0)throw Error('R5_SOURCE_REVIEW_REQUIRED');
 const body=buildIranR5Public(shadow,{
  now,possibleDuplicateCount:resolution.held.length,collectionCheckedAt:checked,
 });
 return {body,shadow};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];
 if(!['--preview','--publish'].includes(mode))throw Error('R5_MODE_INVALID');
 const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 if(!fs.existsSync(path.join(base,'iran.sqlite')))throw Error('R5_OPERATIONAL_DB_MISSING');
 const store=openStore(path.join(base,'iran.sqlite')),owner=randomUUID();
 try{
  if(!store.claim(owner,Date.now()))throw Error('R5_EXISTING_COLLECTION_LEASE_HELD');
  const now=Date.now(),{body}=calculateOperationalR5(store,{now});
  if(mode==='--preview')console.log(JSON.stringify({status:'SHADOW_PREVIEW',
   score:body.score,asOfDate:body.asOfDate,classifierVersion:body.classifierVersion,
   collectionCheckedAt:body.collectionCheckedAt,
   eventCount:body.acceptedEventCount,publicWrite:false}));
  else{
   const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
   const cfgPath=path.join(os.homedir(),'.zgmini','pc-writer','config.json');
   const config=JSON.parse(fs.readFileSync(cfgPath,'utf8'));
   const remote=client(config,credential(root));
   const result=await publishIranR5Provisional(remote,config.core,body,{now});
   if(!['VERIFIED','UNCHANGED'].includes(result.status))
    throw Error('R5_REMOTE_NEWER_OR_PUBLICATION_NOT_VERIFIED');
   store.checkpoint('reference-flow-last-valid-r5',body);
   store.checkpoint('reference-flow-publication-r5',{...result,
    score:body.score,asOfDate:body.asOfDate,publishedAt:body.publishedAt});
   console.log(JSON.stringify({status:result.status,score:body.score,
    asOfDate:body.asOfDate,classifierVersion:body.classifierVersion,
    resultHash:result.bodyHash}));
  }
 }finally{store.release(owner);store.close();}
}
