// Consume the installed R26 cache; never fetch, translate or publish news.
import fs from 'node:fs';
import path from 'node:path';
import {hash} from './store.mjs';
import {kstCalendarDate} from '../../lib/iran-progress/chart-history.mjs';
import {classifyR3Article} from '../../lib/iran-progress/reference-flow-r3.mjs';

const HOSTS={tasnim:['www.tasnimnews.ir'],aljazeera:['www.aljazeera.com'],
 'guardian-iran':['www.theguardian.com'],govuk:['www.gov.uk'],
 'dw-world':['www.dw.com'],'bbc-middle-east':['www.bbc.co.uk','www.bbc.com'],
 'un-middle-east':['news.un.org']};
function trusted(item){
 try{const u=new URL(item.sourceUrl);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&HOSTS[item.sourceId]?.includes(u.hostname);}
 catch{return false;}
}
export function planScoreNewsInput(store,cache,status,{now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||cache?.version!=='IRAN_NEWS_COLLECTION_R26'||
  !Number.isSafeInteger(cache.updatedAt)||cache.updatedAt>now||now-cache.updatedAt>86400000||
  !Array.isArray(cache.items)||cache.items.length<1||cache.items.length>700)
  throw Error('IRAN_SCORE_NEWS_INPUT_UNREADY');
 const completed=Date.parse(String(status?.completedAtKst).replace(' ','T')+'+09:00');
 // Old R29 installations do not expose per-source article verification counts.
 // Such a cache may supply reviewed metadata, but cannot replace discovery health.
 const freshnessEligible=status?.version==='IRAN_NEWS_PRIVATE_AUTO_R29'&&
  ['PRIVATE_COLLECTION_READY','PRIVATE_COLLECTION_PARTIAL'].includes(status.status)&&
  status.sourceCount===7&&status.candidatesSaved===cache.items.length&&
  Number.isSafeInteger(completed)&&Math.abs(completed-cache.updatedAt)<=120000&&
  Number.isSafeInteger(status.articleCoverage?.sourcesVerifiedThisRun)&&
  status.articleCoverage.sourcesVerifiedThisRun>=1&&status.articleCoverage.sourcesVerifiedThisRun<=7;
 const latest=new Map(),ids=new Set();
 for(const row of store.db.prepare("SELECT id,body FROM sources WHERE id LIKE 'news-metadata:%' ORDER BY stored_at,id").all()){
  const a=JSON.parse(row.body);if(row.id!=='news-metadata:'+hash(a))throw Error('R3_RECEIPT_HASH_MISMATCH');
  latest.set(a.sourceUrl,a);
 }
 const planned=[],held=[],counts={existing:0,unmatched:0,accepted:0};
 for(const item of cache.items){
  const at=Date.parse(item?.publisherDeclaredPublishedAt);
  if(!trusted(item)||typeof item.originalTitle!=='string'||!item.originalTitle.trim()||item.originalTitle.length>500||
   item.reviewStatus!=='ARTICLE_METADATA_REVIEWED'||item.id!==hash(item.sourceUrl)||ids.has(item.id)||
   !Number.isSafeInteger(at)||at>now||new Date(at).toISOString()!==item.publisherDeclaredPublishedAt)
   throw Error('IRAN_SCORE_NEWS_CANDIDATE_INVALID');
  ids.add(item.id);
  const prior=latest.get(item.sourceUrl);
  // Never replace a prior receipt/summary with a translation or edited headline.
  if(prior){counts.existing++;if(prior.title.normalize('NFKC').trim()!==item.originalTitle.normalize('NFKC').trim())
   held.push({id:item.id,sourceId:item.sourceId,reason:'EXISTING_URL_REVISION_REQUIRES_REVIEW'});continue;}
  const article={sourceUrl:item.sourceUrl,title:item.originalTitle,summary:'',
   date:new Date(at).toISOString().slice(0,10),claimVerification:'SINGLE_SOURCE_REPORT'};
  const event=classifyR3Article(article);
  if(!event.accepted){counts.unmatched++;continue;}
  // First observation is NOW, not publication/cache-update time. Old backlog
  // needs review instead of rewriting previous scores or charging old attacks today.
  const lag=(Date.parse(kstCalendarDate(now)+'T00:00:00Z')-Date.parse(article.date+'T00:00:00Z'))/86400000;
  if(lag<0||lag>1){held.push({id:item.id,sourceId:item.sourceId,reason:'OLDER_PUBLICATION_REQUIRES_REVIEW'});continue;}
  const receiptHash=hash(article);
  planned.push({id:'news-metadata:'+receiptHash,article,receiptHash,
   candidateId:item.id,sourceId:item.sourceId,publisherPublishedAt:item.publisherDeclaredPublishedAt});
  counts.accepted++;
 }
 return {version:'IRAN_SCORE_NEWS_INPUT_R1',checkedAt:now,collectionCheckedAt:cache.updatedAt,
  partial:!freshnessEligible||status.status==='PRIVATE_COLLECTION_PARTIAL',freshnessEligible,
  collectionEvidence:freshnessEligible?'MATCHED_ARTICLE_VERIFICATION':'CACHE_METADATA_ONLY',
  sourcesVerifiedThisRun:freshnessEligible?status.articleCoverage.sourcesVerifiedThisRun:null,
  cacheHash:hash(cache),candidateCount:cache.items.length,counts,held,planned};
}
export function syncScoreNewsInput(store,dataDirectory,{now=Date.now(),dryRun=true}={}){
 if(typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory)||typeof dryRun!=='boolean')
  throw Error('IRAN_SCORE_NEWS_OPTIONS_INVALID');
 const read=name=>{
  const file=path.join(dataDirectory,name),stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)throw Error('IRAN_SCORE_NEWS_FILE_UNSAFE');
  return JSON.parse(fs.readFileSync(file,'utf8'));
 };
 let status=null;
 try{status=read('news-display-candidates-auto-r29-status.json');}
 catch(error){if(error.code!=='ENOENT')throw error;}
 const plan=planScoreNewsInput(store,read('news-display-candidates-r26.json'),status,{now});
 if(dryRun)return plan;
 store.db.exec('BEGIN IMMEDIATE');
 try{
  for(const item of plan.planned){
   store.putSource(item.id,item.article,now);
   const provenance={version:plan.version,candidateId:item.candidateId,sourceId:item.sourceId,
    receiptHash:item.receiptHash,publisherPublishedAt:item.publisherPublishedAt,cacheHash:plan.cacheHash};
   store.putSource('score-news-provenance:'+hash(provenance),provenance,now);
  }
  const {planned,...report}=plan;
  store.checkpoint('score-news-input-last-run-r1',report);
  store.db.exec('COMMIT');
 }catch(error){store.db.exec('ROLLBACK');throw error;}
 return plan;
}
