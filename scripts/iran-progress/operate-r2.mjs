import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';import {randomUUID} from 'node:crypto';
import {openStore,hash} from './store.mjs';import {collectNewsR2} from './continuous-news-r2.mjs';
import {buildReferenceFlowR2,classifyR2Article,CLASSIFIER_VERSION} from '../../lib/iran-progress/reference-flow-r2.mjs';
import {validateReferenceFlowR2} from '../../lib/iran-progress/reference-public-r2.mjs';
import {publishReferenceFlowR2} from './publication.mjs';import {client,credential} from '../pc-writer/d1.mjs';
import {publishArrowState} from '../pc-writer/score-arrow-publication.mjs';

const tokens=e=>new Set((e.evidence??'').toLowerCase().replace(/iranian|iran|navy|says|another|the |of |in |after |chief|spokesman/gi,' ').match(/[a-z]{3,}/g)??[]);
export function resolveR2Events(input){
 const accepted=[],held=[],keys=new Set();
 for(const e of [...input].sort((a,b)=>a.date.localeCompare(b.date)||a.sourceUrl.localeCompare(b.sourceUrl))){
  const key=e.sourceUrl+':'+e.date+':'+e.rule;if(keys.has(key))continue;keys.add(key);
  const near=accepted.find(old=>{
   if(e.rule!==old.rule||Math.abs(Date.parse(e.date)-Date.parse(old.date))>3*86400000)return false;
   const locations=['Doha','Muscat','Tehran','Geneva'];const loc=x=>locations.filter(l=>new RegExp('\\b'+l+'\\b','i').test(x.evidence??''));
   const aLoc=loc(e),bLoc=loc(old);if(aLoc.length&&bLoc.length&&!aLoc.some(x=>bLoc.includes(x)))return false;
   const a=tokens(e),b=tokens(old);if(!a.size||!b.size)return false;
   return [...a].filter(t=>b.has(t)).length/new Set([...a,...b]).size>=.55;
  });
  if(near&&e.eventKey!==near.eventKey){held.push({sourceUrl:e.sourceUrl,rule:e.rule,date:e.date,reason:'POSSIBLE_SAME_EVENT',relatedSourceUrl:near.sourceUrl});continue;}
  accepted.push(e);
 }
 return {accepted,held};
}
export function storedR2Candidates(store){
 const byUrl=new Map();
 for(const row of store.db.prepare("SELECT id,body FROM sources WHERE id LIKE 'news-metadata:%' ORDER BY stored_at,id").all()){
  const a=JSON.parse(row.body);if(row.id!=='news-metadata:'+hash(a))throw Error('R2_RECEIPT_HASH_MISMATCH');byUrl.set(a.sourceUrl,a);
 }
 const events=[];for(const a of byUrl.values()){const e=classifyR2Article(a);if(e.accepted)events.push(e);}
 // Reuse the existing audited official article extraction, but apply only R2 rules.
 const evaluation=store.getCheckpoint('article-ai-evaluation-r14'),seen=new Set();
 if(evaluation?.status==='PASS')for(const row of store.db.prepare("SELECT body FROM decisions WHERE id LIKE 'article-ai:%' ORDER BY stored_at DESC,id").all()){
  const d=JSON.parse(row.body);if(d.promptVersion!==evaluation.promptVersion||d.modelDigest!==evaluation.modelDigest||seen.has(d.sourceId))continue;
  const r=store.db.prepare('SELECT body FROM sources WHERE id=?').get(d.sourceId);if(!r)continue;const s=JSON.parse(r.body);
  if(!s.text||d.sourceHash!==hash(s.text)||!s.rightsReceiptId||!store.db.prepare('SELECT id FROM sources WHERE id=?').get(s.rightsReceiptId))continue;
  seen.add(d.sourceId);
  for(const c of d.candidates??[]){if(c.claimStatus!=='ASSERTED'||typeof c.quote!=='string'||!s.text.includes(c.quote))continue;
   const e=classifyR2Article({title:c.quote,summary:s.title??'',sourceUrl:s.sourceUrl,date:s.publishedDate});if(e.accepted)events.push(e);
  }
 }
 return events;
}
export function calculateOperationalR2(store,now=Date.now()){
 const report=store.getCheckpoint('continuous-news-last-run-r2'),previous=store.getCheckpoint('reference-flow-last-valid-r2');
 const checked=report?.lastDiscoverySuccessAt;
 if(!Number.isSafeInteger(checked)||checked>now||now-checked>86400000){
  if(!previous)throw Error('R2_NO_FRESH_DISCOVERY_OR_PREVIOUS');
  return {...previous,status:'UPDATE_DELAYED',publishedAt:now,newsCollection:{...previous.newsCollection,status:'DISCOVERY_DELAYED'}};
 }
 const resolved=resolveR2Events(storedR2Candidates(store));
 const result=buildReferenceFlowR2(resolved.accepted,{asOfDate:new Date(now).toISOString().slice(0,10)});
 if(!result.eventCount)throw Error('R2_NO_SUPPORTED_EVENTS');
 const partial=report.feeds.some(f=>f.status!=='COLLECTED')||['DISCOVERY_DELAYED','ANALYSIS_FAILED','ANALYSIS_PENDING'].includes(report.status);
 const {ledger,...body}=result;
 const scoreChanged=previous?previous.score!==body.score:true;
 const collectionStatus=['UPDATED','ANALYZED_NO_CHANGE'].includes(report.status)?scoreChanged?'UPDATED':'ANALYZED_NO_CHANGE':report.status;
 const projection={...body,publishedAt:now,collectionCheckedAt:checked,lastSignalDate:ledger.at(-1)?.date??null,status:partial?'UPDATE_DELAYED':'REFERENCE',classifierVersion:CLASSIFIER_VERSION,
  newsCollection:{...report,status:collectionStatus,scoreChanged,possibleDuplicateCount:resolved.held.length},
  collectionCoverage:{completeEventCoverage:false,partial},events:ledger.filter(e=>Date.parse(e.date+'T00:00:00Z')>=Date.parse(result.asOfDate+'T00:00:00Z')-13*86400000).slice(-100).map(({evidence,eventKey,...e})=>e)};
 if(!validateReferenceFlowR2(projection,now))throw Error('R2_CALCULATION_CONTRACT_INVALID');
 store.checkpoint('reference-flow-event-review-r2',{classifierVersion:CLASSIFIER_VERSION,held:resolved.held,checkedAt:now});
 return projection;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];if(!['--preview','--collect-preview','--publish','--collect-publish'].includes(mode))throw Error('R2_MODE_INVALID');
 const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 if(!fs.existsSync(path.join(base,'iran.sqlite')))throw Error('R2_OPERATIONAL_DB_MISSING');
 const store=openStore(path.join(base,'iran.sqlite')),owner=randomUUID(),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 try{
  if(!store.claim(owner,Date.now()))throw Error('R2_LEASE_HELD');
  if(mode.startsWith('--collect-'))await collectNewsR2(store,{maxArticles:12});
  const now=Date.now(),body=calculateOperationalR2(store,now);
  if(mode.endsWith('preview')){store.checkpoint('reference-flow-preview-r2',body);console.log(JSON.stringify({mode:'PREVIEW',score:body.score,status:body.status,eventCount:body.eventCount,collectionStatus:body.newsCollection.status,possibleDuplicateCount:body.newsCollection.possibleDuplicateCount}));}
  else{
   const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
   const remote=client(config,credential(root));
   const result=await publishReferenceFlowR2(remote,config.core,body,{now});
   if(!['VERIFIED','UNCHANGED'].includes(result.status))throw Error('R2_REMOTE_NEWER_PRESERVED');
   store.checkpoint('reference-flow-last-valid-r2',body);store.checkpoint('reference-flow-publication-r2',{...result,score:body.score,eventCount:body.eventCount,publishedAt:body.publishedAt});
   const arrows=await publishArrowState(remote,config.core,'iran',{iran:{score:body.score,sourceAt:body.publishedAt,method:body.version}});
   store.checkpoint('score-arrow-publication-r1',arrows);
   console.log(JSON.stringify({...result,version:body.version,score:body.score,status:body.status,eventCount:body.eventCount,collectionStatus:body.newsCollection.status,possibleDuplicateCount:body.newsCollection.possibleDuplicateCount}));
  }
 }finally{store.release(owner);store.close();}
}
