import {hash} from './store.mjs';
import {boundedRead} from './sources.mjs';
const HOUR=3600000,DAY=24*HOUR;
const stamp=at=>new Date(at).toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
export function normalizeArticles(body,{start,end}){
 const data=JSON.parse(body);
 if(!Array.isArray(data.articles)||data.articles.length>250)throw Error('GDELT_ARTICLE_RESPONSE_INVALID');
 const unique=new Map();
 for(const article of data.articles){
  if(typeof article.title!=='string'||article.title.length>2000||typeof article.url!=='string')throw Error('GDELT_ARTICLE_INVALID');
  const url=new URL(article.url);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('GDELT_ARTICLE_URL_INVALID');
  // These are discovery/seen times, never inferred event occurrence timestamps.
  const seen=article.seendate;
  if(typeof seen!=='string'||!/^\d{8}T\d{6}Z$/.test(seen))throw Error('GDELT_SEEN_DATE_INVALID');
  const seenAt=Date.parse(seen.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,'$1-$2-$3T$4:$5:$6Z'));
  if(!Number.isFinite(seenAt)||seenAt<start||seenAt>end)throw Error('GDELT_WINDOW_MISMATCH');
  url.hash='';
  const id=hash(url.href);
  unique.set(id,{id,url:url.href,title:article.title,seenAt,sourceDomain:url.hostname,sourceCountry:article.sourcecountry??null,language:article.language??null,
   status:'DISCOVERED',eventAt:null,occurrenceVerified:false});
 }
 return {articles:[...unique.values()],saturated:data.articles.length===250};
}
export async function collectDiscovery({now=Date.now(),checkpoint=null,maxChunks=2,fetcher=fetch,delay=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 if(!Number.isInteger(maxChunks)||maxChunks<1||maxChunks>8)throw Error('DISCOVERY_CHUNK_LIMIT');
 const state=checkpoint?structuredClone(checkpoint):{version:'GDELT_DISCOVERY_R13',from:Math.floor((now-28*DAY)/HOUR)*HOUR,cursor:Math.floor((now-28*DAY)/HOUR)*HOUR,target:Math.floor(now/HOUR)*HOUR,span:6*HOUR,knownGaps:[],processedChunks:0};
 if(state.version!=='GDELT_DISCOVERY_R13'||!Number.isSafeInteger(state.from)||!Number.isSafeInteger(state.cursor)||state.cursor>now||!Number.isSafeInteger(state.target)||state.target>now||state.cursor<state.from||state.cursor>state.target||!Number.isSafeInteger(state.span)||state.span<15*60000||state.span>6*HOUR||!Number.isSafeInteger(state.processedChunks)||state.processedChunks<0||!Array.isArray(state.knownGaps)||(state.retryAt!=null&&!Number.isSafeInteger(state.retryAt)))throw Error('DISCOVERY_CHECKPOINT_INVALID');
 if(state.retryAt>now)return {status:'DEFERRED',checkpoint:state,articles:[],error:'GDELT_RETRY_COOLDOWN',attempts:0,observationVerified:false};
 if(state.cursor===state.target)state.target=Math.floor(now/HOUR)*HOUR;
 const articles=[];let attempts=0,error=null;
 while(state.cursor<state.target&&attempts<maxChunks){
  if(attempts)await delay(5000);
  const start=state.cursor,end=Math.min(start+state.span,state.target);
  const url='https://api.gdeltproject.org/api/v2/doc/doc?'+new URLSearchParams({query:'Iran',mode:'artlist',format:'json',maxrecords:'250',sort:'datedesc',startdatetime:stamp(start),enddatetime:stamp(end)});
  attempts++;
  try{
   const response=await boundedRead(url,{fetcher});
   if(response.status!=='COLLECTED'){
    error='GDELT_HTTP_'+response.httpStatus;
    if(response.httpStatus===429){
     const header=response.retryAfter,seconds=typeof header==='string'&&/^\d+$/.test(header)?Number(header):null;
     const requested=seconds!=null?now+seconds*1000:Date.parse(header??'');
     state.retryAt=Math.max(now+6*HOUR,Number.isSafeInteger(requested)?requested:0);
    }
    break;
   }
   delete state.retryAt;
   const batch=normalizeArticles(response.body,{start,end});
   if(batch.saturated&&state.span>15*60000){state.span=Math.max(15*60000,Math.floor(state.span/2/60000)*60000);continue;}
   if(batch.saturated)state.knownGaps.push({start,end,reason:'ARTICLE_LIMIT_AT_MINIMUM_WINDOW'});
   articles.push(...batch.articles);state.cursor=end;state.processedChunks++;
   if(!batch.saturated)state.span=6*HOUR;
  }catch{error='GDELT_READ_OR_PARSE_FAILED';break;}
 }
 return {status:error?'SOURCE_FAILED':state.cursor<state.target?'RUNNING':'DISCOVERY_CAUGHT_UP',checkpoint:state,articles,error,attempts,
  observationVerified:false,reason:'DISCOVERY_DOES_NOT_VERIFY_ATTACKS_OR_COVERAGE'};
}
