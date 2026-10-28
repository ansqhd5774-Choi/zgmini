// R24: discover existing R3 news publishers for DISPLAY review, independently of R3 scoring.
// Read-only. No licence or original-publication verification is implied by a feed response.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {boundedRead} from './sources.mjs';
import {IRAN_DISPLAY_FEEDS_R26} from './news-display-source-registry-r26.mjs';
import {parseGovUkNewsCandidates} from './news-display-discover-r1.mjs';

const ACCEPTED_HOSTS=Object.freeze({
 tasnim:['www.tasnimnews.ir'],
 govuk:['www.gov.uk'],
 'iaea-news':['www.iaea.org'],
 'iaea-statements':['www.iaea.org'],
 'bbc-middle-east':['www.bbc.com','www.bbc.co.uk','www.bbci.co.uk'],
 aljazeera:['www.aljazeera.com'],
 'un-middle-east':['news.un.org'],
});
const XML_BLOCK=/<(?:item|entry)\b[^>]*>[\s\S]*?<\/(?:item|entry)>/gi;
const MAX_FEED_BYTES=1_000_000;
const MAX_CANDIDATES_PER_FEED=250;
export const IRAN_GOVUK_R24_TOPIC_FEEDS=Object.freeze(
 ['Iran','Saudi','Yemen','Houthi'].map(keyword=>
  `https://www.gov.uk/search/news-and-communications.atom?keywords=${encodeURIComponent(keyword)}&order=updated-newest`));
export const IRAN_ALJAZEERA_TOPIC_ARCHIVE_R32='https://www.aljazeera.com/where/iran';
// The IAEA's DG RSS (observed 2026-10-28) stops at 2026-09-14 although
// its official homepage lists statements published on October 23 and 27.
// Homepage links are *only discovery hints*: R25 still checks original body,
// publisher date, scope and the 30-day window before retaining anything.
export const IRAN_IAEA_OFFICIAL_HOME_R34='https://www.iaea.org/';
const matchesIranTopicR24=text=>
 /\b(?:iran(?:ian)?s?|saudis?|yemen(?:is?)?|houthis?)\b|이란|사우디(?:아라비아)?|예멘|예맨|후티/i.test(text);

export const IRAN_MULTISOURCE_FEEDS_R24=Object.freeze(IRAN_DISPLAY_FEEDS_R26.map(spec=>Object.freeze({...spec})));

function xmlText(value){
 return String(value??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/<[^>]+>/g,' ')
  .replace(/&#(x[0-9a-f]+|\d+);/gi,(_,raw)=>{
   const value=raw[0].toLowerCase()==='x'?parseInt(raw.slice(1),16):parseInt(raw,10);
   return value>0&&value<=0x10ffff?String.fromCodePoint(value):'';
  })
  .replace(/&(amp|lt|gt|quot|apos|#39);/gi,(_,name)=>
   ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",'#39':"'"})[name.toLowerCase()])
  .replace(/\s+/g,' ').trim();
}

export function newsR24SourceUrl(sourceId,value){
 try{
  const url=new URL(value);
  // IAEA's official RSS still emits http://www.iaea.org article URLs.
  // Normalize only that exact official host to HTTPS; all other HTTP is rejected.
  if(sourceId.startsWith('iaea-')&&url.protocol==='http:'&&
   url.hostname==='www.iaea.org'&&!url.port)url.protocol='https:';
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||
   !ACCEPTED_HOSTS[sourceId]?.includes(url.hostname)||url.href.length>2000)return null;
  // UN RSS links use an official /feed/view/ redirect to the canonical story.
  // Normalize only that exact publisher path, without following a remote redirect.
  if(sourceId==='un-middle-east'&&/^\/feed\/view\/en\/story\//.test(url.pathname))
   url.pathname=url.pathname.replace(/^\/feed\/view(?=\/en\/story\/)/,'');
  for(const key of [...url.searchParams.keys()]){
   if(/^(?:utm_.+|at_medium|at_campaign|traffic_source)$/i.test(key))url.searchParams.delete(key);
  }
  return url.href;
 }catch{return null;}
}

function tagValue(block,name){
 return xmlText(block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]??'');
}

function xmlLink(block){
 const plain=tagValue(block,'link');
 if(plain)return plain;
 const tags=block.match(/<link\b[^>]*>/gi)??[];
 const alternate=tags.find(tag=>/\brel\s*=\s*["']alternate["']/i.test(tag))??
  tags.find(tag=>!/\brel\s*=\s*["'](?:self|edit|enclosure)["']/i.test(tag));
 return xmlText(alternate?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]??'');
}

export function parseIranMultisourceFeedR24(sourceId,kind,body){
 if(typeof body!=='string'||body.length>MAX_FEED_BYTES||
  (kind==='xml'&&/<!DOCTYPE|<!ENTITY/i.test(body)))
  throw Error('R24_FEED_FORMAT_INVALID');
 if(kind==='xml'){
  if(!/<(?:feed|rss)\b/i.test(body))throw Error('R24_FEED_FORMAT_INVALID');
  if(sourceId==='govuk'){
   const rawEntries=(body.match(/<entry\b/gi)??[]).length;
   const records=parseGovUkNewsCandidates(body).map(item=>({
    sourceUrl:item.sourceUrl,feedTitle:item.feedTitle,
    feedDescription:'',
    feedPublishedAt:null,feedUpdatedAt:item.feedUpdatedAt,
    timestampStatus:'OFFICIAL_FIRST_PUBLICATION_REQUIRED',
   }));
   return {rawEntries,records};
  }
  const blocks=body.match(XML_BLOCK)??[],records=[];
  for(const block of blocks.slice(0,MAX_CANDIDATES_PER_FEED+1)){
   const feedTitle=tagValue(block,'title');
   const sourceUrl=newsR24SourceUrl(sourceId,xmlLink(block));
   if(!feedTitle||feedTitle.length>500||!sourceUrl)continue;
   const feedDescription=(tagValue(block,'description')||tagValue(block,'summary')).slice(0,1000);
   const sourceDate=tagValue(block,'pubDate')||tagValue(block,'published');
   const time=Date.parse(sourceDate);
   records.push({sourceUrl,feedTitle,feedDescription,
    feedPublishedAt:Number.isFinite(time)?new Date(time).toISOString():null,
    feedUpdatedAt:null,timestampStatus:'FEED_DATE_NOT_ORIGIN_VERIFIED'});
  }
  return {rawEntries:blocks.length,records};
 }
 if(kind==='html'&&sourceId==='tasnim'){
  if(!/<html\b|<!doctype html/i.test(body))throw Error('R24_FEED_FORMAT_INVALID');
  const matches=[...body.matchAll(/\bhref\s*=\s*["'](\/en\/news\/\d{4}\/\d{2}\/\d{2}\/\d+\/[a-z0-9-]+)["']/gi)];
  const urls=new Set(matches.map(m=>m[1]));
  const records=[...urls].slice(0,MAX_CANDIDATES_PER_FEED+1).map(link=>({
   sourceUrl:newsR24SourceUrl(sourceId,`https://www.tasnimnews.ir${link}`),
   // A URL slug is only a search hint, never the original article headline.
   feedTitle:null,topicHint:link.split('/').at(-1).replaceAll('-',' '),
   feedDescription:'',
   feedPublishedAt:null,feedUpdatedAt:null,
   timestampStatus:'ARTICLE_DETAIL_AND_FIRST_PUBLICATION_REQUIRED',
  })).filter(r=>r.sourceUrl);
  return {rawEntries:urls.size,records};
 }
 if(kind==='html'&&sourceId==='aljazeera'){
  if(!/<html\b|<!doctype html/i.test(body))throw Error('R24_FEED_FORMAT_INVALID');
  // Official Iran topic listing supplements the short, all-topic RSS history.
  // Its URLs are hints only; R25 must validate every article body and first date.
  const matches=[...body.matchAll(/\bhref\s*=\s*["'](\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/([a-z0-9-]+))["']/gi)];
  const urls=new Map(matches.map(match=>[match[1],match[2]]));
  const records=[...urls].slice(0,MAX_CANDIDATES_PER_FEED+1).map(([link,slug])=>({
   sourceUrl:newsR24SourceUrl(sourceId,`https://www.aljazeera.com${link}`),
   feedTitle:null,topicHint:`Iran topic archive ${slug.replaceAll('-',' ')}`,
   feedDescription:'',feedPublishedAt:null,feedUpdatedAt:null,
   timestampStatus:'ARTICLE_DETAIL_AND_FIRST_PUBLICATION_REQUIRED',
  })).filter(record=>record.sourceUrl);
  return {rawEntries:urls.size,records};
 }
 if(kind==='html'&&['iaea-news','iaea-statements'].includes(sourceId)){
  if(!/<html\b|<!doctype html/i.test(body))throw Error('R24_FEED_FORMAT_INVALID');
  const articleKind=sourceId==='iaea-news'?'news':'statements';
  // Limit to exact publisher relative links: never follow arbitrary homepage
  // external URLs, query strings, fragments, or non-editorial assets.
  const pattern=new RegExp(`\\bhref\\s*=\\s*["'](\\/newscenter\\/${articleKind}\\/[a-z0-9-]+)["']`,'gi');
  const urls=new Set([...body.matchAll(pattern)].map(match=>match[1]));
  const records=[...urls].slice(0,MAX_CANDIDATES_PER_FEED+1).map(link=>({
   sourceUrl:newsR24SourceUrl(sourceId,`https://www.iaea.org${link}`),
   feedTitle:null,feedDescription:'',feedPublishedAt:null,feedUpdatedAt:null,
   timestampStatus:'ARTICLE_DETAIL_AND_FIRST_PUBLICATION_REQUIRED',
   discoveryOrigin:'IAEA_OFFICIAL_HOMEPAGE_UNSCOPED_R34',
  })).filter(item=>item.sourceUrl);
  return {rawEntries:urls.size,records};
 }
 throw Error('R24_FEED_KIND_INVALID');
}

export async function auditIranMultisourceCollectionR24({now=Date.now(),fetcher=fetch,
 feeds=IRAN_MULTISOURCE_FEEDS_R24}={}){
 if(!Number.isSafeInteger(now)||!Array.isArray(feeds)||!feeds.length||feeds.length>7||
  feeds.some(spec=>!IRAN_MULTISOURCE_FEEDS_R24.some(approved=>
   approved.id===spec.id&&approved.url===spec.url&&approved.kind===spec.kind)))
  throw Error('R24_SOURCE_REGISTRY_INVALID');
 const seen=new Set(),candidates=[],sources=[];
 for(const spec of feeds){
  const urls=spec.id==='govuk'?IRAN_GOVUK_R24_TOPIC_FEEDS:
   spec.id==='aljazeera'?[spec.url,IRAN_ALJAZEERA_TOPIC_ARCHIVE_R32]:
   spec.id==='iaea-news'||spec.id==='iaea-statements'?
    [spec.url,IRAN_IAEA_OFFICIAL_HOME_R34]:[spec.url];
  const result={rawEntries:0,records:[]};
  let feedUrlsRead=0,feedUrlsFailed=0,failedFormat=false;
  for(const url of urls){
   try{
    const response=await boundedRead(url,{fetcher,maxBytes:MAX_FEED_BYTES});
    if(response.status!=='COLLECTED')throw Error('R24_SOURCE_READ_FAILED');
    const kind=url===IRAN_ALJAZEERA_TOPIC_ARCHIVE_R32||
     url===IRAN_IAEA_OFFICIAL_HOME_R34?'html':spec.kind;
    const parsed=parseIranMultisourceFeedR24(spec.id,kind,response.body);
    result.rawEntries+=parsed.rawEntries;result.records.push(...parsed.records);
    feedUrlsRead++;
   }catch(error){
    feedUrlsFailed++;
    if(/FORMAT|KIND/.test(String(error?.message)))failedFormat=true;
   }
  }
  let topicMatches=0,queuedForReview=0,duplicates=0;
  for(const record of result.records.slice(0,MAX_CANDIDATES_PER_FEED)){
   if(record.discoveryOrigin!=='IAEA_OFFICIAL_HOMEPAGE_UNSCOPED_R34'&&
    !matchesIranTopicR24([record.feedTitle,record.feedDescription,
     record.topicHint].join(' ')))continue;
   topicMatches++;
   if(seen.has(record.sourceUrl)){duplicates++;continue;}
   seen.add(record.sourceUrl);queuedForReview++;
   candidates.push({sourceId:spec.id,sourceUrl:record.sourceUrl,
    feedTitle:record.feedTitle??null,feedPublishedAt:record.feedPublishedAt,
    feedUpdatedAt:record.feedUpdatedAt,timestampStatus:record.timestampStatus,
    contentKind:/\/(?:videos?|watch)\//i.test(new URL(record.sourceUrl).pathname)?
     'VIDEO_REQUIRES_SEPARATE_REVIEW':'UNKNOWN_OR_ARTICLE',
    originalPublicationVerified:false,rightsVerified:false,displayEligible:false,
    originalTitleVerified:false,reviewStatus:'SOURCE_METADATA_ONLY',scopeVerifiedFromArticle:false});
  }
  const overLimit=result.rawEntries>MAX_CANDIDATES_PER_FEED;
  const partial=overLimit||result.records.length<Math.min(result.rawEntries,MAX_CANDIDATES_PER_FEED);
  const status=feedUrlsFailed?(feedUrlsRead?'SOURCE_PARTIAL':
   failedFormat?'FORMAT_INVALID':'SOURCE_FAILED'):
   partial?'PARSE_PARTIAL':result.rawEntries?'READ':'NO_ITEMS';
  sources.push({sourceId:spec.id,status,feedUrls:urls.length,feedUrlsRead,feedUrlsFailed,
   rawEntries:result.rawEntries,
   parsedEntries:result.records.length,topicMatches,queuedForReview,duplicates,
   unmatchedMetadataEntries:result.records.length-topicMatches,
   originalDatesVerified:0,displayRightsVerified:0});
 }
 const failed=sources.filter(s=>['SOURCE_FAILED','SOURCE_PARTIAL','FORMAT_INVALID','PARSE_PARTIAL'].includes(s.status));
 return {version:'IRAN_NEWS_MULTISOURCE_AUDIT_R24',mode:'READ_ONLY',
  checkedAt:new Date(now).toISOString(),sourceCount:sources.length,
  sourcesRead:sources.filter(s=>['READ','NO_ITEMS'].includes(s.status)).length,
  sourcesFailed:failed.length,status:failed.length?'PARTIAL_SOURCE_FAILURE':
   candidates.length?'CANDIDATES_REQUIRE_REVIEW':'NO_MATCHING_HEADLINES',
  candidatesFound:candidates.length,displayEligible:0,
  // No publisher licence, original first publication, or event fact is inferred here.
  totalCoverageProven:false,articleBodyScopeReviewed:0,candidates,sources,
  pcCacheWritten:false,d1Written:false,schedulerModified:false,
  scoreLedgerModified:false,translationModified:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--probe')
  throw Error('R24_READ_ONLY_PROBE_REQUIRED');
 const report=await auditIranMultisourceCollectionR24();
 console.log(JSON.stringify(report));
 if(report.sourcesFailed)process.exitCode=2;
}
