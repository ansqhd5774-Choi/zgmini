// Read-only GOV.UK candidate discovery. A discovered feed item is NOT licensed
// for display until its individual page, summary and impact are reviewed.
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {boundedRead} from './sources.mjs';
import {kstDayWindow,kstNewsDay,NEWS_PC_RETENTION_DAYS} from '../../lib/iran-progress/news-display-r1.mjs';

// The four user-approved topics are OR, not AND. GOV.UK uses English terms.
export const IRAN_GOVUK_NEWS_KEYWORDS=Object.freeze(['Iran','Saudi','Yemen','Houthi']);
export const IRAN_GOVUK_NEWS_FEEDS=Object.freeze(IRAN_GOVUK_NEWS_KEYWORDS.map(
 keyword=>`https://www.gov.uk/search/news-and-communications.atom?keywords=${encodeURIComponent(keyword)}&order=updated-newest`));
export const IRAN_GOVUK_NEWS_FEED=IRAN_GOVUK_NEWS_FEEDS[0]; // compatibility with R1 readers

// Only the four named topics (including ordinary English/Korean inflections).
export function matchesIranNewsDisplayKeywords(text){
 if(typeof text!=='string')return false;
 return /\b(?:iran(?:ian)?s?|saudis?|yemen(?:is?)?|houthis?)\b|이란|사우디(?:아라비아)?|예멘|예맨|후티/i.test(text);
}

function xmlText(value){
 return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/<[^>]+>/g,' ')
  .replace(/&#(x[0-9a-f]+|\d+);/gi,(_,code)=>{
   const n=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):parseInt(code,10);
   return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
  })
  .replace(/&(amp|lt|gt|quot|apos);/g,(_,name)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[name])
  .replace(/\s+/g,' ').trim();
}
function articleUrl(url){
 try{
  const u=new URL(url);
  if(u.protocol!=='https:'||u.hostname!=='www.gov.uk'||!u.pathname.startsWith('/government/')||u.username||u.password||u.port)return null;
  u.hash='';u.search='';return u.href;
 }catch{return null;}
}
function feedArticle(block){
 const title=xmlText(block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]??'');
 const preferred=(block.match(/<link\b[^>]*>/gi)??[]).find(tag=>!/\brel\s*=\s*["'](?:self|edit|enclosure)["']/i.test(tag));
 const rawUrl=preferred?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]
   ??block.match(/<link\b[^>]*>([^<]+)<\/link>/i)?.[1]??'';
 const sourceUrl=articleUrl(xmlText(rawUrl));
 if(!sourceUrl||!title||title.length>500)return null;
 // GOV.UK Atom entries may have <updated> but no <published>.
 // The date here is discovery metadata ONLY, never a publishable date.
 const rawUpdated=xmlText(block.match(/<updated\b[^>]*>([^<]+)<\/updated>/i)?.[1]??'');
 const time=Date.parse(rawUpdated);
 return {source:'GOV.UK',sourceUrl,feedTitle:title,
  feedUpdatedAt:Number.isSafeInteger(time)?new Date(time).toISOString():null};
}
export function parseGovUkNewsCandidates(xml){
 if(typeof xml!=='string'||xml.length>1000000||/<!DOCTYPE|<!ENTITY/i.test(xml)||!/<(?:feed|rss)\b/i.test(xml))throw Error('NEWS_DISCOVERY_FEED_INVALID');
 const found=new Map();
 for(const block of xml.match(/<(?:entry|item)\b[^>]*>[\s\S]*?<\/(?:entry|item)>/gi)??[]){
  const article=feedArticle(block);
  if(article){const previous=found.get(article.sourceUrl);
   if(!previous||String(previous.feedUpdatedAt)<String(article.feedUpdatedAt))found.set(article.sourceUrl,article);}
 }
 return [...found.values()].sort((a,b)=>String(b.feedUpdatedAt).localeCompare(String(a.feedUpdatedAt))||a.sourceUrl.localeCompare(b.sourceUrl));
}
export function govUkContentCandidate(feedItem,content,{now=Date.now()}={}){
 if(!feedItem?.sourceUrl||!content||typeof content!=='object')return {status:'METADATA_INVALID'};
 const expectedPath=new URL(feedItem.sourceUrl).pathname;
 if(content.base_path!==expectedPath||content.withdrawn===true)return {status:'METADATA_INVALID'};
 const timestamp=Date.parse(content.first_published_at??'');
 // public_updated_at and Atom <updated> are explicitly NOT a fallback.
 if(!Number.isSafeInteger(timestamp)||timestamp>now)return {status:'FIRST_PUBLICATION_UNVERIFIED'};
 const {start,end}=kstDayWindow(now,NEWS_PC_RETENTION_DAYS);
 const day=kstNewsDay(timestamp);
 if(day<start||day>end)return {status:'OUTSIDE_30_DAY_WINDOW'};
 const title=typeof content.title==='string'?content.title.trim():'';
 const description=typeof content.description==='string'?content.description.trim():'';
 if(!title||title.length>500)return {status:'METADATA_INVALID'};
 const body=typeof content.details?.body==='string'?content.details.body:'';
 if(!matchesIranNewsDisplayKeywords([title,description,body].join(' ')))return {status:'OUT_OF_SCOPE'};
 return {status:'REVIEW_REQUIRED',item:{source:'GOV.UK',sourceUrl:feedItem.sourceUrl,
  title,publishedAt:new Date(timestamp).toISOString(),sourceDescription:description.slice(0,300),
  rightsVerified:false,displayEligible:false,reviewReason:'INDIVIDUAL_RIGHTS_SUMMARY_IMPACT_PENDING'}};
}
export async function discoverGovUkNewsCandidates({now=Date.now(),fetcher=fetch}={}){
 const counts={feedEntries:0,feedSucceeded:0,feedFailed:0,apiChecked:0,apiFailed:0,old:0,outOfScope:0,unverified:0};
 const feeds=await Promise.all(IRAN_GOVUK_NEWS_FEEDS.map(async url=>{
  try{
   const result=await boundedRead(url,{fetcher,maxBytes:1000000});
   if(result.status!=='COLLECTED')throw Error('NEWS_DISCOVERY_SOURCE_FAILED');
   return parseGovUkNewsCandidates(result.body);
  }catch{return null;}
 }));
 const entriesByUrl=new Map();
 for(const entries of feeds){
  if(entries===null){counts.feedFailed++;continue;}
  counts.feedSucceeded++;
  for(const entry of entries){
   const previous=entriesByUrl.get(entry.sourceUrl);
   if(!previous||String(previous.feedUpdatedAt)<String(entry.feedUpdatedAt))entriesByUrl.set(entry.sourceUrl,entry);
  }
 }
 if(counts.feedSucceeded===0)throw Error('NEWS_DISCOVERY_SOURCE_FAILED');
 const entries=[...entriesByUrl.values()],candidates=[];
 counts.feedEntries=entries.length;
 for(const entry of entries){
  const apiUrl='https://www.gov.uk/api/content'+new URL(entry.sourceUrl).pathname;
  try{
   counts.apiChecked++;
   const api=await boundedRead(apiUrl,{fetcher,maxBytes:4000000});
   if(api.status!=='COLLECTED')throw Error('CONTENT_API_SOURCE_FAILED');
   const assessed=govUkContentCandidate(entry,JSON.parse(api.body),{now});
   if(assessed.item)candidates.push(assessed.item);
   else if(assessed.status==='OUTSIDE_30_DAY_WINDOW')counts.old++;
   else if(assessed.status==='OUT_OF_SCOPE')counts.outOfScope++;
   else counts.unverified++;
  }catch{counts.apiFailed++;}
 }
 candidates.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.sourceUrl.localeCompare(b.sourceUrl));
 if(counts.apiChecked>0&&counts.apiFailed===counts.apiChecked)throw Error('NEWS_CONTENT_API_DISCOVERY_FAILED');
 return {status:counts.apiFailed||counts.feedFailed?'PARTIAL_REVIEW_REQUIRED':candidates.length?'REVIEW_REQUIRED':'NO_RECENT_CANDIDATES',
  checkedAt:now,source:'GOV.UK',count:candidates.length,counts,candidates};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--preview')throw Error('NEWS_DISCOVERY_READ_ONLY_PREVIEW_REQUIRED');
 try{console.log(JSON.stringify(await discoverGovUkNewsCandidates()));}
 catch(error){console.error(JSON.stringify({status:'DISCOVERY_DELAYED',error:error.message}));process.exitCode=1;}
}
