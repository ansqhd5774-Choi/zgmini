// Read the same public news APIs selected by OutbreakNewsContainer. No collection,
// translation, news publication or inference from the display's impact label.
import {hash} from './store.mjs';
import {planScoreNewsInput} from './score-news-input-r1.mjs';
import {storedR3Candidates} from './operate-r3.mjs';
import {validIranNewsSnapshot,readIranNewsSnapshot} from '../../lib/iran-progress/news-display-r1.mjs';
import {IRAN_NEWS_METADATA_VERSION_R41,IRAN_NEWS_METADATA_SOURCES_R41,canonicalIranMetadataUrlR41} from '../../lib/iran-progress/news-metadata-r41.mjs';
import {kstCalendarDate} from '../../lib/iran-progress/chart-history.mjs';
import {classifyR3Article} from '../../lib/iran-progress/reference-flow-r3.mjs';

export const PUBLISHED_NEWS_CHECKPOINT='score-published-news-input-r1';
const BASE='https://zgmini.kr';
export function selectPublishedNews(r41,r1,{now=Date.now()}={}){
 const useR41=r41?.status==='READY'&&r41.sourceCount===7&&r41.itemCount>0&&
  Array.isArray(r41.items)&&r41.items.length===r41.itemCount;
 if(useR41){
  if(r41.version!==IRAN_NEWS_METADATA_VERSION_R41||r41.displayDays!==14||r41.items.length>250)
   throw Error('IRAN_PUBLISHED_NEWS_INVALID');
  return {endpoint:'/api/outbreak-news/iran/r41',items:r41.items};
 }
 if(!validIranNewsSnapshot(r1,{now}))throw Error('IRAN_PUBLISHED_NEWS_UNAVAILABLE');
 return {endpoint:'/api/outbreak-news/iran',items:readIranNewsSnapshot(r1,{now}).items};
}
export function planPublishedNewsInput(store,r41,r1,{now=Date.now()}={}){
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
 const intake=planScoreNewsInput(store,{version:'IRAN_NEWS_COLLECTION_R26',updatedAt:now,items},null,{now});
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
  const event=classifyR3Article({sourceUrl:item.sourceUrl,title:item.originalTitle,summary:'',date:item.publisherDeclaredPublishedAt.slice(0,10)});
  if(event.accepted&&lag>=0&&lag<=1&&!intake.held.some(x=>x.id===item.id))admitted.add(item.sourceUrl);
 }
 return {...intake,version:'IRAN_PUBLISHED_NEWS_SCORE_INPUT_R1',endpoint:selected.endpoint,
  snapshotHash:hash(selected),cutoverAt:previous?.cutoverAt??now,
  baselineEventKeys:previous?.baselineEventKeys??storedR3Candidates(store).map(e=>e.eventKey),
  admittedUrls:[...admitted].sort()};
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
export async function syncPublishedNewsInput(store,{now=Date.now(),dryRun=true,fetchImpl=fetch}={}){
 const read=async endpoint=>{
  try{
   const response=await fetchImpl(BASE+endpoint,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
   if(!response.ok)return null;
   const text=await response.text();if(text.length>1048576)throw Error('IRAN_PUBLISHED_NEWS_TOO_LARGE');
   return JSON.parse(text);
  }catch{return null;}
 };
 const r41=await read('/api/outbreak-news/iran/r41');
 const useR41=r41?.status==='READY'&&r41.sourceCount===7&&r41.itemCount>0&&Array.isArray(r41.items)&&r41.items.length===r41.itemCount;
 const r1=useR41?null:await read('/api/outbreak-news/iran');
 return applyPublishedNewsInput(store,planPublishedNewsInput(store,r41,r1,{now}),{now,dryRun});
}
