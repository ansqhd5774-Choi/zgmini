// Article triage only. URL grouping is not event deduplication or fact verification.
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {openStore} from './store.mjs';
const VERSION='IRAN_REVIEW_QUEUE_R14';
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function buildReviewQueue(candidates,now){
 if(!Array.isArray(candidates)||!Number.isSafeInteger(now)||now<=0)throw Error('IRAN_REVIEW_ARGS_INVALID');
 const groups=new Map();let outside=0,invalid=0;
 for(const c of candidates){
  if(c.source!=='GDELT_2_EVENTS')continue;
  let u;try{u=new URL(c.sourceUrl);}catch{invalid++;continue;}
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password){invalid++;continue;}
  const actors=[c.actor1??'',c.actor2??''].join(' ');
  const actorIran=/\bIRAN(?:IAN)?\b|\bIRGC\b/i.test(actors);
  // Outside this screen remains preserved and unreviewed; it is never declared irrelevant.
  const related=actorIran||c.actionCountry==='IR'||/iran|hormuz|hezbollah|houthi/i.test(u.pathname);
  if(!related){outside++;continue;}
  u.hash=''; // Only fragments are ignored. Query strings and protocols retain identity.
  const key=u.href;
  const g=groups.get(key)??{sourceUrl:key,sourceDomain:u.hostname,candidateIds:[],dateHints:[],axisHints:[],relevance:[],status:'PENDING_REVIEW',
   eventAt:null,eventVerified:false,duplicateChecked:false,independentRoot:null,reason:'SOURCE_TEXT_AND_INDEPENDENT_FACTS_REQUIRED'};
  g.candidateIds.push(c.id);
  if(c.eventDateHint)g.dateHints.push(c.eventDateHint);
  if(actorIran){g.relevance.push('IRAN_ACTOR_HINT');
   if(/\bISRAEL(?:I)?\b/i.test(actors))g.axisHints.push('IRN_ISR');
   if(/\bUNITED STATES\b|\bAMERICA(?:N)?\b/i.test(actors))g.axisHints.push('IRN_USA');
  }else g.relevance.push('GEOGRAPHY_OR_URL_HINT');
  groups.set(key,g);
 }
 const articles=[...groups.values()].map(g=>({...g,candidateIds:[...new Set(g.candidateIds)].sort(),
  dateHints:[...new Set(g.dateHints)].sort(),axisHints:[...new Set(g.axisHints)].sort(),relevance:[...new Set(g.relevance)].sort()}))
  .sort((a,b)=>(b.dateHints.at(-1)??'').localeCompare(a.dateHints.at(-1)??'')||a.sourceUrl.localeCompare(b.sourceUrl));
 const included=articles.reduce((n,g)=>n+g.candidateIds.length,0);
 return {version:VERSION,createdAt:now,inputHash:digest(candidates.map(c=>[c.id,c.sourceUrl,c.actor1,c.actor2,c.actionCountry,c.eventDateHint]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))),
  totalCandidates:candidates.length,includedCandidates:included,articleGroups:articles.length,repeatedArticleRows:included-articles.length,
  outsideScreenUnreviewed:outside,invalidUrls:invalid,articles,eventVerified:false,coverageVerified:false,attackCount:null,publication:'NOT_REQUESTED'};
}
export function persistReviewQueue(store,queue){
 const id='review-queue:'+queue.inputHash;
 const body={...queue};delete body.createdAt;
 // Immutable content receipt and cursor are committed together. Source candidates stay intact.
 store.db.exec('BEGIN IMMEDIATE');
 try{store.putDecision(id,body,queue.createdAt);store.checkpoint('review-queue-r14',{id,inputHash:queue.inputHash,createdAt:queue.createdAt,
  totalCandidates:queue.totalCandidates,includedCandidates:queue.includedCandidates,articleGroups:queue.articleGroups,
  repeatedArticleRows:queue.repeatedArticleRows,outsideScreenUnreviewed:queue.outsideScreenUnreviewed,invalidUrls:queue.invalidUrls,
  eventVerified:false,coverageVerified:false,publication:'NOT_REQUESTED'});store.db.exec('COMMIT');}
 catch(e){store.db.exec('ROLLBACK');throw e;}
 const saved=store.db.prepare('SELECT body FROM decisions WHERE id=?').get(id);
 if(!saved||saved.body!==JSON.stringify(body)||store.getCheckpoint('review-queue-r14')?.inputHash!==queue.inputHash)throw Error('IRAN_REVIEW_READBACK_FAILED');
 return {...store.getCheckpoint('review-queue-r14'),status:'REVIEW_QUEUE_STORED',storageVerified:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('IRAN_REVIEW_ARGS_INVALID');
 const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 const store=openStore(path.join(base,'iran.sqlite')),owner=randomUUID(),now=Date.now();
 try{
  if(!store.claim(owner,now))console.log(JSON.stringify({status:'RUNNING',reason:'LEASE_HELD'}));
  else{
   const candidates=store.db.prepare('SELECT body FROM discovery_candidates ORDER BY id').all().map(r=>JSON.parse(r.body));
   const queue=buildReviewQueue(candidates,now),result=persistReviewQueue(store,queue);
   fs.writeFileSync(path.join(base,'review-queue-last-run.json'),JSON.stringify(result,null,2));
   console.log(JSON.stringify(result));
  }
 }finally{store.release(owner);store.close();}
}
