import {hash} from './store.mjs';
import {boundedRead} from './sources.mjs';
import {parseNews} from './continuous-news.mjs';
import {CLASSIFIER_VERSION,classifyR2Article,buildReferenceFlowR2,trustedR2Url,validDate} from '../../lib/iran-progress/reference-flow-r2.mjs';

export const R2_NEWS_KEY='reference-flow-continuous-news-r2';
export const R2_FEEDS=[
 {id:'tasnim',url:'https://www.tasnimnews.ir/en',kind:'html'},
 {id:'govuk',url:'https://www.gov.uk/search/news-and-communications.atom?keywords=Iran&order=updated-newest',kind:'xml'},
 {id:'iaea-news',url:'https://www.iaea.org/feeds/topnews',kind:'xml'},
 {id:'iaea-statements',url:'https://www.iaea.org/feeds/dgstatements',kind:'xml'},
];
const decode=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,dec)=>{const n=parseInt(hex??dec,hex?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const text=s=>decode(s).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export function parseR2Feed(xml){
 if(!/<(?:rss|feed)\b/i.test(xml)||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('R2_FEED_FORMAT_INVALID');
 const articles=[];
 for(const block of xml.match(/<(?:item|entry)\b[^>]*>[\s\S]*?<\/(?:item|entry)>/gi)??[]){
  const title=text(block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]??'');
  const plain=block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1];
  const links=block.match(/<link\b[^>]*\bhref=["'][^"']+["'][^>]*>/gi)??[];
  const tag=links.find(t=>!/rel=["'](?:self|edit|enclosure)["']/i.test(t));
  const sourceUrl=decode(plain?.trim()??tag?.match(/href=["']([^"']+)["']/i)?.[1]??'');
  // published is preferred over updated: corrections must not masquerade as new events.
  const rawDate=block.match(/<(?:published|pubDate)\b[^>]*>([^<]+)</i)?.[1];
  const time=Date.parse(rawDate??'');
  const date=Number.isFinite(time)?new Date(time).toISOString().slice(0,10):null;
  if(title&&title.length<=500&&trustedR2Url(sourceUrl)&&validDate(date))articles.push({title,summary:'',sourceUrl,date,contentHash:hash({title,date,sourceUrl}),claimVerification:'SINGLE_SOURCE_REPORT'});
 }
 return articles;
}
export function storedR2Signals(store){
 const cp=store.getCheckpoint(R2_NEWS_KEY);if(!cp)return [];
 if(cp.classifierVersion!==CLASSIFIER_VERSION||!Array.isArray(cp.events)||hash(cp.events)!==cp.eventsHash)throw Error('R2_CHECKPOINT_INVALID');
 for(const e of cp.events){
  const row=store.db.prepare('SELECT body FROM sources WHERE id=?').get('news-metadata:'+e.receiptHash);
  if(!row)throw Error('R2_RECEIPT_MISSING');
  const a=JSON.parse(row.body),expected=classifyR2Article(a);
  if(hash(a)!==e.receiptHash||!expected.accepted||expected.eventKey!==e.eventKey||expected.rule!==e.rule||expected.delta!==e.delta||expected.sourceUrl!==e.sourceUrl)throw Error('R2_SIGNAL_MISMATCH');
 }
 return cp.events;
}
export async function collectNewsR2(store,{now=Date.now(),fetcher=fetch,maxArticles=12,feeds=R2_FEEDS}={}){
 if(!Number.isInteger(maxArticles)||maxArticles<1||maxArticles>48)throw Error('R2_BUDGET_INVALID');
 const previous=store.getCheckpoint(R2_NEWS_KEY),queue=store.getCheckpoint('continuous-news-queue-r2')?.items??[];
 const report={classifierVersion:CLASSIFIER_VERSION,checkedAt:now,feeds:[],discovered:0,analyzed:0,accepted:0,failed:0,storageVerified:false};
 const byUrl=new Map(queue.map(i=>[i.url,i]));
 const start=new Date(now-13*86400000).toISOString().slice(0,10),end=new Date(now).toISOString().slice(0,10);
 const enqueue=a=>{if(a.date<start||a.date>end)return;const old=byUrl.get(a.sourceUrl);if(!old){const i={url:a.sourceUrl,article:a};queue.push(i);byUrl.set(i.url,i);report.discovered++;}else old.article=a;};
 // Re-evaluate saved exclusions on a new classifier even if the original feed has rolled over.
 for(const row of store.db.prepare("SELECT id,body FROM sources WHERE id LIKE 'news-metadata:%' ORDER BY stored_at,id").all()){
  const a=JSON.parse(row.body);if(row.id!=='news-metadata:'+hash(a))throw Error('R2_RECEIPT_HASH_MISMATCH');enqueue(a);
 }
 for(const spec of feeds){
  let response;
  try{response=await boundedRead(spec.url,{fetcher,maxBytes:1000000});}
  catch{report.feeds.push({id:spec.id,status:'DISCOVERY_DELAYED',reason:'TRANSPORT_FAILED'});continue;}
  if(response.status!=='COLLECTED'){report.feeds.push({id:spec.id,status:'DISCOVERY_DELAYED'});continue;}
  try{
   if(spec.kind==='xml')for(const a of parseR2Feed(response.body))enqueue(a);
   else{
    if(!/<html\b|<!doctype html/i.test(response.body))throw Error('R2_HTML_FORMAT_INVALID');
    const paths=[...new Set(response.body.match(/\/en\/news\/\d{4}\/\d{2}\/\d{2}\/\d+\/[a-z0-9-]+/g)??[])];
    for(const p of paths){const date=p.slice(9,19).replaceAll('/','-'),url='https://www.tasnimnews.ir'+p;if(date<start||date>end||!/(?:iran|irgc|hormuz|tanker|ceasefire|nuclear|talks|iaea)/i.test(p))continue;if(!byUrl.has(url)){const i={url,date};queue.push(i);byUrl.set(url,i);report.discovered++;}}
   }
   report.feeds.push({id:spec.id,status:'COLLECTED',checkedAt:now});
  }catch{report.feeds.push({id:spec.id,status:'DISCOVERY_DELAYED',reason:'FORMAT_INVALID'});}
 }
 const oldEvents=previous?.classifierVersion===CLASSIFIER_VERSION?storedR2Signals(store):[];
 const events=new Map(oldEvents.map(e=>[e.sourceUrl,e]));
 const pending=queue.filter(i=>(i.article?.date??i.date)>=start&&(!i.retryAt||i.retryAt<=now)&&(i.classifierVersion!==CLASSIFIER_VERSION||i.contentHash!==hash(i.article)||new URL(i.url).hostname==='www.tasnimnews.ir'&&now-(i.fetchedAt??0)>=86400000)).sort((a,b)=>(a.analyzedAt??0)-(b.analyzedAt??0)||a.url.localeCompare(b.url));
 for(const item of pending.slice(0,maxArticles)){
  try{
   if(!item.article||new URL(item.url).hostname==='www.tasnimnews.ir'&&now-(item.fetchedAt??0)>=86400000){
    if(!trustedR2Url(item.url))throw Error('R2_URL_INVALID');
    const response=await boundedRead(item.url,{fetcher,maxBytes:1000000});if(response.status!=='COLLECTED')throw Error('R2_ARTICLE_FAILED');
    item.article=parseNews(response.body,item.url);item.fetchedAt=now;
   }
   const a=item.article;if(!validDate(a.date)||a.date>end||a.date<start)throw Error('R2_DATE_INVALID');
   const receiptHash=hash(a);store.putSource('news-metadata:'+receiptHash,a,now);
   if(store.db.prepare('SELECT body FROM sources WHERE id=?').get('news-metadata:'+receiptHash)?.body!==JSON.stringify(a))throw Error('R2_READBACK_FAILED');
   const decision=classifyR2Article(a);store.putDecision('news-flow-r2:'+CLASSIFIER_VERSION+':'+receiptHash,{...decision,receiptHash},now);
   events.delete(item.url);if(decision.accepted){events.set(item.url,{...decision,receiptHash});report.accepted++;}
   item.classifierVersion=CLASSIFIER_VERSION;item.contentHash=hash(a);item.analyzedAt=now;item.reason=decision.accepted?'ACCEPTED':decision.reason;item.retryAt=null;report.analyzed++;
  }catch{item.retryAt=now+3600000;item.reason='ANALYSIS_FAILED';report.failed++;}
  store.checkpoint('continuous-news-queue-r2',{items:queue});
 }
 report.pending=queue.filter(i=>!i.analyzedAt||i.classifierVersion!==CLASSIFIER_VERSION||i.contentHash!==hash(i.article)).length;
 const successes=report.feeds.filter(f=>f.status==='COLLECTED');
 report.lastDiscoverySuccessAt=successes.length?now:previous?.lastDiscoverySuccessAt??null;
 const all=[...events.values()];
 report.scoreChanged=buildReferenceFlowR2(all,{asOfDate:end}).score!==buildReferenceFlowR2(oldEvents,{asOfDate:end}).score;
 report.status=!successes.length?'DISCOVERY_DELAYED':report.failed?'ANALYSIS_FAILED':report.pending?'ANALYSIS_PENDING':report.discovered===0&&report.analyzed===0?'NO_NEW_ARTICLES':report.scoreChanged?'UPDATED':'ANALYZED_NO_CHANGE';
 report.storageVerified=true;
 store.checkpoint(R2_NEWS_KEY,{classifierVersion:CLASSIFIER_VERSION,events:all,eventsHash:hash(all),lastDiscoverySuccessAt:report.lastDiscoverySuccessAt,report});
 store.checkpoint('continuous-news-last-run-r2',report);return report;
}
