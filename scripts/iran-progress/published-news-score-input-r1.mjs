// Read the same public news APIs selected by OutbreakNewsContainer. No collection,
// translation, news publication or inference from the display's impact label.
import {hash} from './store.mjs';
import {planScoreNewsInput} from './score-news-input-r1.mjs';
import {storedR3Candidates} from './operate-r3.mjs';
import {validIranNewsSnapshot,readIranNewsSnapshot} from '../../lib/iran-progress/news-display-r1.mjs';
import {IRAN_NEWS_METADATA_VERSION_R41,IRAN_NEWS_METADATA_SOURCES_R41,canonicalIranMetadataUrlR41} from '../../lib/iran-progress/news-metadata-r41.mjs';
import {kstCalendarDate} from '../../lib/iran-progress/chart-history.mjs';
import {classifyPublishedScoreArticle} from '../../lib/iran-progress/published-event-r1.mjs';
import {ENGLISH_SCORE_EVIDENCE_VERSION} from './news-r41-english-score-evidence-r1.mjs';

export const PUBLISHED_NEWS_CHECKPOINT='score-published-news-input-r1';
const BASE='https://zgmini.kr';
// Source counts represent sources visible in this snapshot, not the number
// originally configured when R41 was introduced.
function readyR41(r41){
 return r41?.status==='READY'&&r41.version===IRAN_NEWS_METADATA_VERSION_R41&&
  r41.displayDays===14&&Number.isSafeInteger(r41.sourceCount)&&
  r41.sourceCount>=1&&r41.sourceCount<=Object.keys(IRAN_NEWS_METADATA_SOURCES_R41).length&&
  Number.isSafeInteger(r41.itemCount)&&r41.itemCount>0&&r41.itemCount<=250&&
  Array.isArray(r41.items)&&r41.items.length===r41.itemCount&&
  r41.sourceCount===new Set(r41.items.map(item=>item?.source)).size;
}
// R26's approved seven-source scoring policy remains stricter than the
// growing public R41 display feed. New publishers require separate R5 review.
const R5_APPROVED_SOURCE_IDS=new Set([
 'tasnim','govuk','guardian-iran','dw-world','bbc-middle-east','aljazeera','un-middle-east',
]);
export function selectPublishedNews(r41,r1,{now=Date.now()}={}){
 const useR41=readyR41(r41);
 if(useR41){
  return {endpoint:'/api/outbreak-news/iran/r41',items:r41.items};
 }
 // A READY response with impossible metadata is an error, not permission to
 // silently replace current R41 with an older R1 fallback.
 if(r41?.status==='READY')throw Error('IRAN_PUBLISHED_NEWS_INVALID');
 if(!validIranNewsSnapshot(r1,{now}))throw Error('IRAN_PUBLISHED_NEWS_UNAVAILABLE');
 return {endpoint:'/api/outbreak-news/iran',items:readIranNewsSnapshot(r1,{now}).items};
}
export function planPublishedNewsInput(store,r41,r1,{now=Date.now(),
 aiScorePolicy='LEGACY_TITLE_ONLY',englishScoreShadow=null}={}){
 if(!['LEGACY_TITLE_ONLY','REQUIRE_VERIFIED_ENGLISH_EVIDENCE'].includes(aiScorePolicy))
  throw Error('IRAN_PUBLISHED_NEWS_AI_POLICY_INVALID');
 if(aiScorePolicy==='REQUIRE_VERIFIED_ENGLISH_EVIDENCE'&&
  (englishScoreShadow?.version!==ENGLISH_SCORE_EVIDENCE_VERSION||
   englishScoreShadow.status!=='SHADOW_ONLY'||englishScoreShadow.publicWrite!==false||
   englishScoreShadow.r5ScoreChanges!==0||!Array.isArray(englishScoreShadow.items)||
   !Number.isSafeInteger(englishScoreShadow.asOf)||englishScoreShadow.asOf>now||
   now-englishScoreShadow.asOf>86400000))
  throw Error('IRAN_PUBLISHED_NEWS_AI_EVIDENCE_INVALID');
 const selected=selectPublishedNews(r41,r1,{now});
 // Empty or failed input must not change the active input checkpoint or freshness.
 if(!selected.items.length)throw Error('IRAN_PUBLISHED_NEWS_EMPTY');
 const items=selected.items.map(item=>{
  const sourceId=Object.keys(IRAN_NEWS_METADATA_SOURCES_R41).find(id=>IRAN_NEWS_METADATA_SOURCES_R41[id].name===item.source);
  const published=Date.parse(item.publishedAt);
  if(!sourceId||!canonicalIranMetadataUrlR41(sourceId,item.sourceUrl)||
   item.id!==hash(item.sourceUrl)||!Number.isSafeInteger(published)||published>now||
   typeof item.title!=='string'||!item.title.trim()||item.title.length>500)
   throw Error('IRAN_PUBLISHED_NEWS_ITEM_INVALID');
  return {id:item.id,sourceId,sourceUrl:item.sourceUrl,originalTitle:item.title,
   publisherDeclaredPublishedAt:new Date(published).toISOString(),reviewStatus:'ARTICLE_METADATA_REVIEWED'};
 });
 // Reuse existing original-title classification, duplicate and old-backlog gates.
 // now is an intake timestamp, NOT a claim that collection was freshly verified.
 const approved=items.filter(item=>R5_APPROVED_SOURCE_IDS.has(item.sourceId));
 if(!approved.length)throw Error('IRAN_PUBLISHED_NEWS_NO_APPROVED_SCORE_SOURCES');
 const intake=planScoreNewsInput(store,{version:'IRAN_NEWS_COLLECTION_R26',updatedAt:now,items:approved},null,
  {now,classify:classifyPublishedScoreArticle});
 const unapproved=items.filter(item=>!R5_APPROVED_SOURCE_IDS.has(item.sourceId));
 intake.held.push(...unapproved.map(item=>({id:item.id,sourceId:item.sourceId,
  reason:'SOURCE_NOT_APPROVED_FOR_R5'})));
 const confirmed=new Map();
 if(aiScorePolicy==='REQUIRE_VERIFIED_ENGLISH_EVIDENCE'){
  for(const item of englishScoreShadow.items){
   if(typeof item?.sourceUrl!=='string'||confirmed.has(item.sourceUrl))
    throw Error('IRAN_PUBLISHED_NEWS_AI_EVIDENCE_INVALID');
   confirmed.set(item.sourceUrl,item);
  }
  const before=intake.planned;
  intake.planned=before.filter(candidate=>{
   const proof=confirmed.get(candidate.article.sourceUrl);
   const classified=classifyPublishedScoreArticle(candidate.article);
   const valid=proof?.status==='EVIDENCE_CONFIRMED'&&proof.scoreApplied===false&&
    proof.rule===classified.rule&&proof.eventKey===classified.eventKey&&
    proof.delta===classified.delta&&proof.type===classified.type&&
    /^[a-f0-9]{64}$/.test(proof.sourceTextSha256??'')&&
    /^[a-f0-9]{64}$/.test(proof.quoteSha256??'');
   if(!valid)intake.held.push({id:candidate.candidateId,sourceId:candidate.sourceId,
    reason:'ENGLISH_AI_EVIDENCE_REQUIRED'});
   return valid;
  });
  intake.counts.accepted=intake.planned.length;
 }
 const previous=store.getCheckpoint(PUBLISHED_NEWS_CHECKPOINT);
 if(previous&&(previous.version!=='IRAN_PUBLISHED_NEWS_SCORE_INPUT_R1'||
  !Array.isArray(previous.baselineEventKeys)||!Array.isArray(previous.admittedUrls)||
  !Number.isSafeInteger(previous.cutoverAt)||previous.cutoverAt>now))throw Error('IRAN_PUBLISHED_NEWS_CHECKPOINT_INVALID');
 const admitted=new Set(previous?.admittedUrls??[]);
 for(const item of intake.planned)admitted.add(item.article.sourceUrl);
 // A private collector may have saved this URL before it appeared publicly.
 // Admit it only after publication, with unchanged title and the same age gate.
 for(const item of items){
  const lag=(Date.parse(kstCalendarDate(now)+'T00:00:00Z')-Date.parse(item.publisherDeclaredPublishedAt.slice(0,10)+'T00:00:00Z'))/86400000;
  if(!R5_APPROVED_SOURCE_IDS.has(item.sourceId))continue;
  if(aiScorePolicy==='REQUIRE_VERIFIED_ENGLISH_EVIDENCE'&&
   !intake.planned.some(candidate=>candidate.candidateId===item.id))continue;
  const event=classifyPublishedScoreArticle({sourceUrl:item.sourceUrl,title:item.originalTitle,summary:'',date:item.publisherDeclaredPublishedAt.slice(0,10)});
  if(event.accepted&&lag>=0&&lag<=1&&!intake.held.some(x=>x.id===item.id))admitted.add(item.sourceUrl);
 }
 return {...intake,version:'IRAN_PUBLISHED_NEWS_SCORE_INPUT_R1',endpoint:selected.endpoint,
  aiScorePolicy,eventClassifierVersion:'IRAN_PUBLISHED_EVENT_RULES_R1',
  snapshotHash:hash(selected),cutoverAt:previous?.cutoverAt??now,
  baselineEventKeys:previous?.baselineEventKeys??storedR3Candidates(store).map(e=>e.eventKey),
  admittedUrls:[...admitted].sort(),articleResults:items.map(item=>{
   const held=intake.held.find(x=>x.id===item.id);
   const event=classifyPublishedScoreArticle({sourceUrl:item.sourceUrl,title:item.originalTitle,
    summary:'',date:item.publisherDeclaredPublishedAt.slice(0,10)});
   return {id:item.id,sourceUrl:item.sourceUrl,
    status:held?'HELD':!event.accepted?'NO_NEW_SCORABLE_EVENT':
     intake.planned.some(x=>x.candidateId===item.id)?'NEW_ACCEPTED':'EXISTING_OR_DUPLICATE',
    reason:held?.reason??event.reason,rule:event.rule??null};
  })};
}
export function applyPublishedNewsInput(store,plan,{now=Date.now(),dryRun=true}={}){
 if(dryRun)return plan;
 store.db.exec('BEGIN IMMEDIATE');
 try{
  for(const item of plan.planned){
   store.putSource(item.id,item.article,now);
   const provenance={version:plan.version,endpoint:plan.endpoint,snapshotHash:plan.snapshotHash,
    receiptHash:item.receiptHash,publisherPublishedAt:item.publisherPublishedAt};
   store.putSource('score-published-news-provenance:'+hash(provenance),provenance,now);
  }
  const {planned,...report}=plan;
  store.checkpoint(PUBLISHED_NEWS_CHECKPOINT,report);
  store.db.exec('COMMIT');
 }catch(error){store.db.exec('ROLLBACK');throw error;}
 return plan;
}
export async function readPublishedNews({now=Date.now(),fetchImpl=fetch}={}){
 const read=async endpoint=>{
  try{
   const response=await fetchImpl(BASE+endpoint,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
   if(!response.ok)return null;
   const text=await response.text();if(text.length>1048576)throw Error('IRAN_PUBLISHED_NEWS_TOO_LARGE');
   return JSON.parse(text);
  }catch{return null;}
 };
 const r41=await read('/api/outbreak-news/iran/r41');
 const useR41=readyR41(r41);
 const r1=useR41?null:await read('/api/outbreak-news/iran');
 const selected=selectPublishedNews(r41,r1,{now});
 if(!selected.items.length)throw Error('IRAN_PUBLISHED_NEWS_EMPTY');
 return {r41,r1,selected,snapshotHash:hash(selected)};
}
export async function syncPublishedNewsInput(store,{now=Date.now(),dryRun=true,
 fetchImpl=fetch,aiScorePolicy='LEGACY_TITLE_ONLY',englishScoreShadow=null}={}){
 const {r41,r1}=await readPublishedNews({now,fetchImpl});
 return applyPublishedNewsInput(store,planPublishedNewsInput(store,r41,r1,
  {now,aiScorePolicy,englishScoreShadow}),{now,dryRun});
}
