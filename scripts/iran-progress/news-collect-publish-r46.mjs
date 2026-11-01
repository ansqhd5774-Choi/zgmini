// PC collection -> verified metadata -> existing R41 table. Never translates,
// stores article bodies, changes score formulae, creates schema or deletes rows.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {openStore,hash} from './store.mjs';
import {collectIranNewsR26} from './news-display-collection-r26.mjs';
import {auditIranArticleDetailsR25} from './news-display-article-audit-r25.mjs';
import {stageIranNewsMetadataR41} from './news-metadata-stage-r41.mjs';
import {IRAN_NEWS_METADATA_SOURCES_R41,validIranMetadataRowR41} from '../../lib/iran-progress/news-metadata-r41.mjs';
import {kstDayWindow,kstNewsDay} from '../../lib/iran-progress/news-display-r1.mjs';
const TABLE='iran_news_article_metadata_r41';
export const R46_READ=`SELECT article_id,source_id,source,source_url,title,published_at FROM ${TABLE} ORDER BY published_at DESC,article_id LIMIT 700`;
const same=(a,b)=>a?.article_id===b.articleId&&a.source_id===b.sourceId&&a.source===b.source&&a.source_url===b.sourceUrl&&a.title===b.title&&a.published_at===b.publishedAt;
export function prepareR46Rows(articles,{now=Date.now()}={}){
 if(!Array.isArray(articles)||articles.length>70)throw Error('R46_ARTICLE_REPORT_INVALID');
 const window=kstDayWindow(now,14),rows=[];
 for(const a of articles){
  if(a.status!=='ARTICLE_METADATA_REVIEWED')continue;
  const day=kstNewsDay(Date.parse(a.publisherDeclaredPublishedAt));
  if(day<window.start||day>window.end)continue;
  const row={articleId:hash(a.sourceUrl),sourceId:a.sourceId,source:IRAN_NEWS_METADATA_SOURCES_R41[a.sourceId]?.name,
   sourceUrl:a.sourceUrl,title:a.originalTitle,publishedAt:a.publisherDeclaredPublishedAt,
   bodyVerified:a.articleBodyAccessible===true,twoStageKeywordsVerified:a.scopeVerifiedFromArticle===true,checkedAt:now};
  if(!validIranMetadataRowR41(row,{now}))throw Error('R46_VERIFIED_METADATA_INVALID');
  rows.push(row);
 }
 if(new Set(rows.map(r=>r.articleId)).size!==rows.length)throw Error('R46_DUPLICATE_ARTICLE_ID');
 return rows;
}
export async function publishR46Rows({remote,db,rows,now=Date.now(),fetcher=fetch,onPending=()=>{}}){
 const before=(await remote.query(db,R46_READ)).results??[];
 const pending=rows.filter(row=>!before.some(old=>same(old,row)));
 if(!pending.length)return {status:'NO_METADATA_CHANGES',changed:0,verified:0};
 onPending(pending);
 await stageIranNewsMetadataR41(remote.adapter(db,{allowWrites:true}),pending,{now});
 const after=(await remote.query(db,R46_READ)).results??[];
 if(pending.some(row=>!after.some(old=>same(old,row))))throw Error('R46_D1_READBACK_MISMATCH');
 const response=await fetcher('https://zgmini.kr/api/outbreak-news/iran/r41',{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
 const api=await response.json();
 if(!response.ok||!Array.isArray(api.items)||pending.some(row=>!api.items.some(a=>a.id===row.articleId&&a.sourceUrl===row.sourceUrl&&a.title===row.title&&a.publishedAt===row.publishedAt)))
  throw Error('R46_PUBLIC_API_READBACK_PENDING');
 return {status:'D1_AND_PUBLIC_API_VERIFIED',changed:pending.length,verified:pending.length,publicItems:api.itemCount,publicSources:api.sourceCount};
}
export async function collectPublishR46({dataDirectory,remote,db,now=Date.now(),fetcher=fetch,
 collector=collectIranNewsR26,articleAuditor=auditIranArticleDetailsR25}={}){
 const file=path.join(dataDirectory,'news-collect-publish-r46-status.json');
 const save=value=>{fs.writeFileSync(file+'.next',JSON.stringify(value));fs.renameSync(file+'.next',file);};
 if(fs.existsSync(file)){
  const prior=JSON.parse(fs.readFileSync(file,'utf8'));
  if(['SUBMITTING','D1_OUTCOME_REQUIRES_READBACK'].includes(prior.status)){
   const actual=(await remote.query(db,R46_READ)).results??[];
   if(!Array.isArray(prior.pendingRows)||prior.pendingRows.some(row=>!actual.some(old=>same(old,row))))throw Error('R46_PREVIOUS_PARTIAL_WRITE_REVIEW_REQUIRED');
   // Exact readback resolved the old submission; do not replay its writes.
   save({...prior,status:'PREVIOUS_D1_SUBMISSION_RECONCILED',reconciledAt:Date.now()});
  }
 }
 let inspected=null,writeStarted=false;
 const record={version:'IRAN_NEWS_COLLECT_PUBLISH_R46',startedAt:now,status:'COLLECTING',scoreLedgerModified:false,translationModified:false};
 save(record);
 try{
  // Check the existing target table BEFORE collecting. Never create/alter schema.
  await remote.query(db,R46_READ);
  const collection=await collector({dataDirectory,now,fetcher,dryRun:false,
   articleAuditor:async options=>{inspected=await articleAuditor(options);return inspected;}});
  if(!inspected?.articles)throw Error('R46_ARTICLE_REVIEW_MISSING');
  if(collection.sourceCount===7){
   // Preserve the existing private-collection status contract. Publication has
   // its own R46 receipt; never leave the old R29 clock frozen after cutover.
   const legacy=path.join(dataDirectory,'news-display-candidates-auto-r29-status.json');
   const status={version:'IRAN_NEWS_PRIVATE_AUTO_R29',status:collection.status==='COLLECTION_REVIEW_READY'?'PRIVATE_COLLECTION_READY':'PRIVATE_COLLECTION_PARTIAL',
    completedAtKst:new Date(Date.now()+32400000).toISOString().slice(0,19).replace('T',' '),
    sourceCount:7,sourcesFailed:collection.sourcesFailed,articleFailures:collection.articleFailures,
    candidatesSaved:collection.candidatesSaved,newCandidates:collection.newCandidates,
    expiredCandidates:collection.expiredCandidates,articleCoverage:collection.articleCoverage,
    rightsVerified:0,displayEligible:0,scoreLedgerModified:false,publicCacheModified:false,d1Written:false,
    schedulerModified:false,translationModified:false,publicationReceipt:'news-collect-publish-r46-status.json'};
   fs.writeFileSync(legacy+'.next',JSON.stringify(status));fs.renameSync(legacy+'.next',legacy);
  }
  record.collection=collection;record.reviewed=inspected.metadataReviewed;
  record.articleOutcomes=inspected.articles.map(a=>({sourceId:a.sourceId,sourceUrl:a.sourceUrl,status:a.status,bodyEvidence:a.articleBodyEvidence??null}));
  const rows=prepareR46Rows(inspected.articles,{now});record.qualified14Days=rows.length;
  if(!rows.length){save({...record,status:'NO_VERIFIED_ROWS_PREVIOUS_NEWS_PRESERVED',finishedAt:Date.now()});return {status:'NO_VERIFIED_ROWS_PREVIOUS_NEWS_PRESERVED',changed:0};}
  const publication=await publishR46Rows({remote,db,rows,now,fetcher,onPending:pending=>{
   writeStarted=true;save({...record,status:'SUBMITTING',pendingRows:pending});
  }});
  const final={...record,...publication,finishedAt:Date.now(),pendingRows:undefined};save(final);return final;
 }catch(error){
  const prior=JSON.parse(fs.readFileSync(file,'utf8'));
  const reason=/^[A-Z0-9_]+$/.test(error.message)?error.message:'R46_COLLECTION_OR_PUBLICATION_FAILED';
  save({...prior,status:writeStarted?'D1_OUTCOME_REQUIRES_READBACK':'COLLECTION_FAILED_PREVIOUS_NEWS_PRESERVED',reason,finishedAt:Date.now()});
  throw Error(reason);
 }
}
async function main(){
 if(!['--scheduled','--run-once'].includes(process.argv[2])||process.argv.length!==3)throw Error('R46_MODE_REQUIRED');
 if(process.argv[2]==='--scheduled'&&process.env.ZGMINI_IRAN_NEWS_R29_SCHEDULED!=='YES')throw Error('R46_EXISTING_SCHEDULED_HOOK_REQUIRED');
 const home=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 if(!fs.existsSync(path.join(home,'iran.sqlite')))throw Error('R46_OPERATIONAL_DB_MISSING');
 const store=openStore(path.join(home,'iran.sqlite')),owner=randomUUID();
 try{
  if(!store.claim(owner,Date.now()))throw Error('R46_EXISTING_LEASE_HELD_WAIT');
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const {client,credential}=await import('../pc-writer/d1.mjs');
  const cfg=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
  const remote=client(cfg,credential(root));
  const result=await collectPublishR46({dataDirectory:home,remote,db:cfg.core});
  console.log(JSON.stringify({status:result.status,changed:result.changed??0,publicItems:result.publicItems??null}));
 }finally{store.release(owner);store.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{
 console.error(JSON.stringify({status:'STOP_R46',reason:/^[A-Z0-9_]+$/.test(error.message)?error.message:'R46_UNKNOWN_FAILURE'}));process.exitCode=1;
});
