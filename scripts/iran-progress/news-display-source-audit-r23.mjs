// R23: independent, read-only source coverage and original-body audit.
// This never writes PC caches, D1, scores, schedules or translation fields.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {boundedRead} from './sources.mjs';
import {IRAN_GOVUK_NEWS_FEEDS,parseGovUkNewsCandidates,
 matchesIranNewsDisplayKeywords} from './news-display-discover-r1.mjs';
import {plainNewsBody} from './news-display-model-shadow-r10.mjs';
import {kstDayWindow,kstNewsDay} from '../../lib/iran-progress/news-display-r1.mjs';

const PAGE_SIZE=20;
const DEFAULT_PAGE_LIMIT=2;
const PUBLIC_NEWS_URL='https://zgmini.kr/api/outbreak-news/iran';
const allowedGovUkPath=url=>{
 try{
  const parsed=new URL(url);
  if(parsed.origin!=='https://www.gov.uk'||parsed.search||parsed.hash||
   !/^\/government\/[a-z0-9/_-]+$/i.test(parsed.pathname))return null;
  return parsed.pathname;
 }catch{return null;}
};

export async function auditGovUkFeedCoverageR23({now=Date.now(),fetcher=fetch,
 maxPages=DEFAULT_PAGE_LIMIT}={}){
 if(!Number.isSafeInteger(now)||!Number.isInteger(maxPages)||maxPages<2||maxPages>5)
  throw Error('R23_AUDIT_BOUNDS_INVALID');
 const start30=kstDayWindow(now,30).start;
 const firstPageUrls=new Set(),allUrls=new Set(),feeds=[];
 for(const base of IRAN_GOVUK_NEWS_FEEDS){
  const pages=[];
  let stopReason='PAGE_LIMIT_REACHED';
  for(let page=1;page<=maxPages;page++){
   const url=page===1?base:`${base}&page=${page}`;
   let entries,rawEntries;
   try{
    const response=await boundedRead(url,{fetcher,maxBytes:1000000});
    if(response.status!=='COLLECTED')throw Error('R23_FEED_READ_FAILED');
    rawEntries=(response.body.match(/<entry\b/gi)??[]).length;
    entries=parseGovUkNewsCandidates(response.body);
   }catch{
    pages.push({page,status:'FEED_READ_FAILED'});
    stopReason='FEED_READ_FAILED';break;
   }
   for(const entry of entries){
    allUrls.add(entry.sourceUrl);
    if(page===1)firstPageUrls.add(entry.sourceUrl);
   }
   const latestUpdate=entries.map(item=>item.feedUpdatedAt).filter(Boolean).sort().at(-1)??null;
   pages.push({page,status:'READ',rawEntries,entries:entries.length,latestUpdate,
    uniqueUrls:entries.filter(e=>e.sourceUrl).length});
   if(rawEntries!==entries.length){stopReason='FEED_PARSE_PARTIAL';break;}
   if(rawEntries<PAGE_SIZE){stopReason='FEED_EXHAUSTED';break;}
   // <updated> is only a pagination boundary hint, NOT an article publish date.
   // Actual publication eligibility always requires Content API first_published_at.
   if(page>1&&latestUpdate&&kstNewsDay(Date.parse(latestUpdate))<start30){
    stopReason='OLDER_UPDATED_PAGE_BOUNDARY';break;
   }
  }
  feeds.push({keyword:new URL(base).searchParams.get('keywords'),stopReason,pages});
 }
 const failed=feeds.some(feed=>['FEED_READ_FAILED','FEED_PARSE_PARTIAL'].includes(feed.stopReason));
 const truncated=feeds.some(feed=>feed.stopReason==='PAGE_LIMIT_REACHED');
 return {version:'IRAN_NEWS_SOURCE_AUDIT_R23',mode:'READ_ONLY',
  status:failed?'PARTIAL_SOURCE_FAILURE':truncated?'PAGINATION_NOT_PROVEN':'COVERAGE_BOUNDARY_OBSERVED',
  checkedAt:new Date(now).toISOString(),retentionStartKst:start30,
  firstPageUnique:firstPageUrls.size,scannedPageUnique:allUrls.size,
  additionalUrls:[...allUrls].filter(url=>!firstPageUrls.has(url)).length,
  // Not a claim that the entire GOV.UK archive has been enumerated.
  completenessProven:false,feeds,pcCacheWritten:false,d1Written:false,
  schedulerModified:false,scoreLedgerModified:false};
}

export async function auditPublishedGovUkBodiesR23({items,fetcher=fetch}={}){
 if(!Array.isArray(items)||items.length>100)throw Error('R23_PUBLIC_ITEMS_INVALID');
 const records=[];
 for(let at=0;at<items.length;at+=3){
  const batch=await Promise.all(items.slice(at,at+3).map(async item=>{
   const articlePath=allowedGovUkPath(item?.sourceUrl);
   if(!articlePath||item.source!=='GOV.UK'||typeof item.publishedAt!=='string')
    return {sourceUrl:item?.sourceUrl??null,status:'SOURCE_IDENTITY_INVALID'};
   try{
    const response=await boundedRead(`https://www.gov.uk/api/content${articlePath}`,
     {fetcher,maxBytes:4000000});
    if(response.status!=='COLLECTED')throw Error('SOURCE_READ_FAILED');
    const content=JSON.parse(response.body);
    if(content.base_path!==articlePath||content.withdrawn===true||
     Date.parse(content.first_published_at??'')!==Date.parse(item.publishedAt))
     return {sourceUrl:item.sourceUrl,status:'OFFICIAL_METADATA_MISMATCH'};
    const body=plainNewsBody(content.details?.body??'');
    return {sourceUrl:item.sourceUrl,status:body?'OFFICIAL_BODY_AVAILABLE':'OFFICIAL_BODY_MISSING',
     bodyCharacters:body.length,descriptionCharacters:(content.description??'').length,
     topicInBody:matchesIranNewsDisplayKeywords(body),
     firstPublishedAt:new Date(Date.parse(content.first_published_at)).toISOString()};
   }catch{return {sourceUrl:item.sourceUrl,status:'SOURCE_READ_FAILED'};}
  }));
  records.push(...batch);
 }
 const bodyAvailable=records.filter(x=>x.status==='OFFICIAL_BODY_AVAILABLE').length;
 return {version:'IRAN_NEWS_SOURCE_AUDIT_R23',mode:'READ_ONLY',
  checkedCount:records.length,bodyAvailable,bodyUnavailable:records.length-bodyAvailable,
  records,pcCacheWritten:false,d1Written:false,schedulerModified:false,
  scoreLedgerModified:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];
 if(process.argv.length!==3||!['--feed-audit','--public-audit'].includes(mode))
  throw Error('R23_READ_ONLY_MODE_REQUIRED');
 try{
  if(mode==='--feed-audit'){
   const audit=await auditGovUkFeedCoverageR23();
   console.log(JSON.stringify(audit));
   if(audit.status!=='COVERAGE_BOUNDARY_OBSERVED')process.exitCode=2;
  }
  else{
   const result=await boundedRead(PUBLIC_NEWS_URL,{maxBytes:1000000});
   if(result.status!=='COLLECTED')throw Error('R23_PUBLIC_NEWS_READ_FAILED');
   const snapshot=JSON.parse(result.body);
   if(snapshot?.version!=='IRAN_NEWS_DISPLAY_R1'||!Array.isArray(snapshot.items)||
    snapshot.items.length!==snapshot.itemCount)throw Error('R23_PUBLIC_SNAPSHOT_INVALID');
   const audit=await auditPublishedGovUkBodiesR23({items:snapshot.items});
   console.log(JSON.stringify({...audit,publicItemCount:snapshot.itemCount}));
   if(audit.bodyUnavailable)process.exitCode=2;
  }
 }catch(error){console.error(JSON.stringify({status:'R23_SOURCE_AUDIT_FAILED',
  reason:error.message,publication:'DISABLED'}));process.exitCode=1;}
}
