import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';import {randomUUID} from 'node:crypto';
import {openStore,hash} from './store.mjs';import {boundedRead} from './sources.mjs';
export const NEWS_KEY='reference-flow-continuous-news-r1';
const HOST='https://www.tasnimnews.ir';
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
export function newsLinks(html,now){
 const end=new Date(now).toISOString().slice(0,10),start=new Date(now-13*86400000).toISOString().slice(0,10);
 return [...new Set((html.match(/\/en\/news\/\d{4}\/\d{2}\/\d{2}\/\d+\/[a-z0-9-]+/g)??[]))].filter(p=>{const d=p.slice(9,19).replaceAll('/','-');return d>=start&&d<=end&&/iran|irgc|hormuz|tanker/i.test(p)}).map(p=>HOST+p).sort((a,b)=>b.localeCompare(a));
}
export function parseNews(html,url){
 const u=new URL(url);if(u.hostname!=='www.tasnimnews.ir'||!/^\/en\/news\/\d{4}\/\d{2}\/\d{2}\/\d+\/[a-z0-9-]+$/.test(u.pathname))throw Error('NEWS_URL_INVALID');
 const title=clean(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]??'').replace(/ - [^-]+ news - Tasnim News Agency$/,'');
 const tag=(html.match(/<meta\b[^>]*>/gi)??[]).find(t=>/name=["']description["']/i.test(t));
 const summary=clean(tag?.match(/content="([^"]*)"/i)?.[1]??'');
 if(!title||summary.length<40||summary.length>1200)throw Error('NEWS_METADATA_MISSING');
 return {title,summary,date:u.pathname.slice(9,19).replaceAll('/','-'),sourceUrl:url,contentHash:hash({title,summary}),claimVerification:'SINGLE_SOURCE_REPORT'};
}
export function newsSignal(article){
 const text=article.title+' '+article.summary;
 if(!/Iran|IRGC|Islamic Revolution Guards|Hormuz/i.test(text))return {accepted:false,reason:'OUT_OF_SCOPE'};
 if(/\b(?:could|may|might|if|denies|denied|rumor|rumour)\b/i.test(article.title))return {accepted:false,reason:'CONDITIONAL_OR_DISPUTED'};
 // Only explicit report directions; conditional predictions never become events.
 let rule,type,delta;
 if(/Hormuz/i.test(text)&&/(?:tanker|vessel).{0,100}(?:caught fire|catches fire|struck|striking|hitting).{0,80}(?:mine|missile)|(?:mine|missile).{0,80}(?:tanker|vessel)/i.test(text)){
  rule='MARITIME_DISRUPTION';type='MARITIME';delta=-20;
 }else if(/Iran.{0,50}(?:warns|warning).{0,80}(?:US|United States|Israel)/i.test(article.title)){
  rule='MILITARY_WARNING';type='MILITARY';delta=-3;
 }else return {accepted:false,reason:'NO_EXPLICIT_CHANGE_RULE'};
 return {accepted:true,rule,type,delta,date:article.date,sourceUrl:article.sourceUrl,evidence:article.title,reason:rule==='MARITIME_DISRUPTION'?'호르무즈 선박 피해 보도':'군사 경고 보도',claimVerification:'SINGLE_SOURCE_REPORT',eventVerified:false};
}
export function storedNewsSignals(store){
 const cp=store.getCheckpoint(NEWS_KEY);if(!cp)return [];
 if(cp.version!=='CONTINUOUS_NEWS_R1'||cp.eventsHash!==hash(cp.events)||!Array.isArray(cp.events)||cp.events.length>10000)throw Error('NEWS_CHECKPOINT_INVALID');
 for(const e of cp.events){const receipt=store.db.prepare('SELECT body FROM sources WHERE id=?').get('news-metadata:'+e.receiptHash);if(!receipt)throw Error('NEWS_RECEIPT_MISSING');const article=JSON.parse(receipt.body);const expected=newsSignal(article);if(hash(article)!==e.receiptHash||!expected.accepted||expected.rule!==e.rule||expected.delta!==e.delta||expected.date!==e.date||expected.sourceUrl!==e.sourceUrl)throw Error('NEWS_SIGNAL_MISMATCH');}
 return cp.events;
}
export async function collectContinuousNews(store,{now=Date.now(),fetcher=fetch,maxArticles=12,wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const previous=store.getCheckpoint(NEWS_KEY);const queue=store.getCheckpoint('continuous-news-queue-r1')?.items??[];
 const result=await boundedRead(HOST+'/en',{fetcher,maxBytes:1000000});if(result.status!=='COLLECTED')throw Error('NEWS_DISCOVERY_FAILED');
 const urls=new Set(queue.map(i=>i.url));for(const url of newsLinks(result.body,now))if(!urls.has(url)){queue.push({url,lastAttemptAt:0,complete:false});urls.add(url);}
 const events=new Map(storedNewsSignals(store).map(e=>[e.sourceUrl,e]));let attempted=0,accepted=0,failed=0,excluded=0;
 const today=new Date(now).toISOString().slice(0,10),start=new Date(now-13*86400000).toISOString().slice(0,10);
 const pending=queue.filter(i=>!i.complete&&(!i.retryAt||i.retryAt<=now)&&i.url.slice(HOST.length+9,HOST.length+19).replaceAll('/','-')>=start).sort((a,b)=>b.url.localeCompare(a.url));
 for(const item of pending.slice(0,maxArticles)){
  attempted++;item.lastAttemptAt=now;
  try{await wait(1000);const response=await boundedRead(item.url,{fetcher,maxBytes:1000000});if(response.status!=='COLLECTED')throw Error('NEWS_ARTICLE_FAILED');const article=parseNews(response.body,item.url);if(article.date>today||article.date<start)throw Error('NEWS_DATE_INVALID');
   const receiptHash=hash(article);store.putSource('news-metadata:'+receiptHash,article,now);const check=store.db.prepare('SELECT body FROM sources WHERE id=?').get('news-metadata:'+receiptHash);if(check?.body!==JSON.stringify(article))throw Error('NEWS_READBACK_FAILED');
   const signal=newsSignal(article);store.putDecision('news-flow:'+receiptHash,{...signal,sourceUrl:item.url,receiptHash,checkedAt:now},now);
   if(signal.accepted){events.set(item.url,{...signal,receiptHash});accepted++;}else excluded++;
   item.complete=true;item.reason=signal.accepted?'ACCEPTED':signal.reason;item.date=article.date;
  }catch(error){failed++;item.reason=/^NEWS_[A-Z_]+$/.test(error.message)?error.message:'NEWS_TRANSPORT_FAILED';item.retryAt=now+3600000;}
  store.checkpoint('continuous-news-queue-r1',{items:queue});
 }
 // Keep accumulated signals when the chart window advances; history is not a rolling baseline.
 const all=[...events.values()];
 store.checkpoint(NEWS_KEY,{version:'CONTINUOUS_NEWS_R1',checkedAt:now,events:all,eventsHash:hash(all),coverageVerified:false});
 const report={status:failed?'PARTIAL':'COMPLETE',checkedAt:now,discovered:urls.size,attempted,accepted,excluded,failed,pending:queue.filter(i=>!i.complete).length,newestSignalDate:all.map(e=>e.date).sort().at(-1)??null,storageVerified:true,previousCheckedAt:previous?.checkedAt??null};
 store.checkpoint('continuous-news-last-run-r1',report);return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13'),store=openStore(path.join(base,'iran.sqlite')),owner=randomUUID();
 try{if(!store.claim(owner,Date.now()))throw Error('NEWS_LEASE_HELD');console.log(JSON.stringify(await collectContinuousNews(store)));}finally{store.release(owner);store.close();}
}
