import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {openStore} from './store.mjs';
import {storedR3Candidates,resolveR3Events} from './operate-r3.mjs';
import {R3_FEEDS} from './continuous-news-r3.mjs';
import {CLASSIFIER_VERSION,classifyR3Article} from '../../lib/iran-progress/reference-flow-r3.mjs';
import {kstCalendarDate} from '../../lib/iran-progress/chart-history.mjs';
import {calculateIranDailyAnchorShadow} from '../../lib/iran-progress/daily-anchored-shadow-r5.mjs';
import {buildIranR5Public,validateIranR5Public} from '../../lib/iran-progress/daily-public-r5.mjs';
import {independentlyCorroboratedR5Positives} from '../../lib/iran-progress/verified-positive-r5.mjs';
import {publishIranR5Provisional} from './publication.mjs';
import {client,credential} from '../pc-writer/d1.mjs';

/**
 * Fail closed until the same-PC R5 has a separately audited current-reality
 * reference, multi-date historical calibration, and explicit production
 * authority. Source-level and unit-test success must never authorize a write.
 */
export function assertR5RealityPublicationReady(shadow){
 if(shadow?.productionReady!==true||
    shadow.independentCurrentRealityVerified!==true||
    shadow.calibrated!==true||
    shadow.status!=='REALITY_VERIFIED')
  throw Error('R5_REALITY_CALIBRATION_NOT_APPROVED_FOR_PUBLICATION');
}
// One independently reviewed URL, two immutable receipt versions, one attack.
// The original 19 Oct publication is retained for the publication-date chart.
// If source content is edited again, hold R5; never guess or rewrite stored R3.
const REVIEWED_SHABWA_REVISION=Object.freeze({
 sourceUrl:'https://www.bbc.co.uk/news/articles/cv0ld6lrr2zeo',
 originalDate:'2026-10-19',
 originalTitle:'Houthi missile strike on Yemen camp kills 50 security recruits, local authorities say',
 revisedDate:'2026-10-20',
 revisedTitle:'Houthi missile strike on Yemen camp kills 73 security recruits, local authorities say',
 rule:'MILITARY_ATTACK',delta:-12,
});
export function resolveReviewedR5SourceRevision(event,versions){
 const r=REVIEWED_SHABWA_REVISION;
 if(event?.sourceUrl!==r.sourceUrl||!Array.isArray(versions)||versions.length!==2)
  throw Error('R5_UNREVIEWED_SOURCE_REVISION');
 const [first,last]=versions;
 if(first?.sourceUrl!==r.sourceUrl||last?.sourceUrl!==r.sourceUrl||
    first.date!==r.originalDate||last.date!==r.revisedDate||
    first.title!==r.originalTitle||last.title!==r.revisedTitle)
  throw Error('R5_REVIEWED_REVISION_PROVENANCE_CHANGED');
 const original=classifyR3Article(first),revised=classifyR3Article(last);
 const fields=['rule','type','delta','actor','location','target','scope'];
 if(original.accepted!==true||revised.accepted!==true||
    fields.some(field=>original[field]!==revised[field])||
    revised.rule!==r.rule||revised.delta!==r.delta||
    event.rule!==revised.rule||event.type!==revised.type||
    event.delta!==revised.delta||event.date!==revised.date||
    event.eventKey!==revised.eventKey||
    fields.some(field=>event[field]!==revised[field]))
  throw Error('R5_REVIEWED_REVISION_CLASSIFICATION_CHANGED');
 return {...event,date:original.date,publicationDate:original.publicationDate,
   eventKey:original.eventKey,evidence:original.evidence};
}
export function assertR5ProvisionalPublicationReady(shadow,body,{now=Date.now()}={}){
 if(shadow?.status!=='SHADOW_UNCALIBRATED'||shadow.calibrated!==false||
    shadow.productionReady!==false||shadow.independentCurrentRealityVerified!==false||
    shadow.latePriorPublicationDateCount!==0||
    shadow.potentialCasualtyRevisionCount!==0||
    shadow.weightedPointScale!==21||
    !validateIranR5Public(body,now)||body.score!==shadow.score||
    body.acceptedEventCount!==shadow.eventCount)
  throw Error('R5_PROVISIONAL_PUBLICATION_GATE_FAILED');
}
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
 const firstSeen=new Map(),revisionCount=new Map(),versionsByUrl=new Map();
 for(const row of store.db.prepare("SELECT body,stored_at FROM sources WHERE id LIKE 'news-metadata:%' ORDER BY stored_at,id").all()){
  const a=JSON.parse(row.body);
  if(typeof a.sourceUrl!=='string')continue;
  const n=Number(row.stored_at),prev=firstSeen.get(a.sourceUrl);
  if(Number.isSafeInteger(n)&&n>0&&(prev===undefined||n<prev))firstSeen.set(a.sourceUrl,n);
  revisionCount.set(a.sourceUrl,(revisionCount.get(a.sourceUrl)??0)+1);
  if(a.sourceUrl===REVIEWED_SHABWA_REVISION.sourceUrl){
   const versions=versionsByUrl.get(a.sourceUrl)??[];
   versions.push(a);versionsByUrl.set(a.sourceUrl,versions);
  }
 }
 if(unique.length===0)throw Error('R5_NO_STORED_ACCEPTED_EVENTS');
 if(unique.some(e=>!firstSeen.has(e.sourceUrl)))
  throw Error('R5_FIRST_SEEN_OR_REVISIONS_REVIEW_REQUIRED');
 const input=unique.map(e=>{
  const count=revisionCount.get(e.sourceUrl);
  if(count===1)return {...e,sourceStoredAt:firstSeen.get(e.sourceUrl)};
  const restored=resolveReviewedR5SourceRevision(e,versionsByUrl.get(e.sourceUrl));
  return {...restored,sourceStoredAt:firstSeen.get(e.sourceUrl)};
 });
 if(new Set(input.map(e=>e.eventKey)).size!==input.length)
  throw Error('R5_REVIEWED_REVISION_EVENT_COLLISION');
 const shadow=calculateIranDailyAnchorShadow(input,{
  asOfDate:kstCalendarDate(now),sensitivityScale:21,
  collectionCheckedAt:checked,collectionStatus:checkpoint.status,
 });
 if(shadow.status!=='SHADOW_UNCALIBRATED'||shadow.latePriorPublicationDateCount!==0||
  shadow.potentialCasualtyRevisionCount!==0)throw Error('R5_SOURCE_REVIEW_REQUIRED');
 const body=buildIranR5Public(shadow,{
  now,possibleDuplicateCount:resolution.held.length,collectionCheckedAt:checked,
  sourceStoredAt:Math.max(...input.map(e=>e.sourceStoredAt)),
 });
 return {body,shadow};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];
 if(!['--preview','--publish','--publish-provisional'].includes(mode))throw Error('R5_MODE_INVALID');
 const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 if(!fs.existsSync(path.join(base,'iran.sqlite')))throw Error('R5_OPERATIONAL_DB_MISSING');
 const store=openStore(path.join(base,'iran.sqlite')),owner=randomUUID();
 try{
  if(!store.claim(owner,Date.now()))throw Error('R5_EXISTING_COLLECTION_LEASE_HELD');
  const now=Date.now(),{body,shadow}=calculateOperationalR5(store,{now});
  if(mode==='--preview')console.log(JSON.stringify({status:'SHADOW_PREVIEW',
   score:body.score,asOfDate:body.asOfDate,classifierVersion:body.classifierVersion,
   collectionCheckedAt:body.collectionCheckedAt,
   eventCount:body.acceptedEventCount,publicWrite:false}));
  else{
   if(mode==='--publish-provisional')assertR5ProvisionalPublicationReady(shadow,body,{now});
   else assertR5RealityPublicationReady(shadow);
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
