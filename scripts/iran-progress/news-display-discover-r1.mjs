// Read-only GOV.UK candidate discovery. A discovered feed item is NOT licensed
// for display until its individual page, summary and impact are reviewed.
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {boundedRead} from './sources.mjs';
import {kstDayWindow,kstNewsDay,NEWS_PC_RETENTION_DAYS} from '../../lib/iran-progress/news-display-r1.mjs';

export const IRAN_GOVUK_NEWS_FEED='https://www.gov.uk/search/news-and-communications.atom?keywords=Iran&order=updated-newest';

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
function feedArticle(block,now){
 const title=xmlText(block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]??'');
 const preferred=(block.match(/<link\b[^>]*>/gi)??[]).find(tag=>!/\brel\s*=\s*["'](?:self|edit|enclosure)["']/i.test(tag));
 const rawUrl=preferred?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]
   ??block.match(/<link\b[^>]*>([^<]+)<\/link>/i)?.[1]??'';
 const sourceUrl=articleUrl(xmlText(rawUrl));
 // Atom <updated> is a revision timestamp, never the article publication date.
 const rawDate=xmlText(block.match(/<(?:published|pubDate)\b[^>]*>([^<]+)<\/(?:published|pubDate)>/i)?.[1]??'');
 const time=Date.parse(rawDate);
 if(!sourceUrl||!title||title.length>500||!Number.isSafeInteger(time)||time>now)return null;
 const {start,end}=kstDayWindow(now,NEWS_PC_RETENTION_DAYS);
 const publicationDay=kstNewsDay(time);
 if(publicationDay<start||publicationDay>end)return null;
 const summaryHint=xmlText(block.match(/<(?:summary|description)\b[^>]*>([\s\S]*?)<\/(?:summary|description)>/i)?.[1]??'').slice(0,2000);
 if(!/\b(?:iran|iranian|tehran|irgc|hormuz)\b/i.test(title+' '+summaryHint))return null;
 return {source:'GOV.UK',sourceUrl,title,publishedAt:new Date(time).toISOString(),
  rightsVerified:false,displayEligible:false,reviewReason:'INDIVIDUAL_RIGHTS_SUMMARY_IMPACT_PENDING'};
}
export function parseGovUkNewsCandidates(xml,{now=Date.now()}={}){
 if(typeof xml!=='string'||xml.length>1000000||/<!DOCTYPE|<!ENTITY/i.test(xml)||!/<(?:feed|rss)\b/i.test(xml))throw Error('NEWS_DISCOVERY_FEED_INVALID');
 const found=new Map();
 for(const block of xml.match(/<(?:entry|item)\b[^>]*>[\s\S]*?<\/(?:entry|item)>/gi)??[]){
  const article=feedArticle(block,now);
  if(article){const previous=found.get(article.sourceUrl);
   if(!previous||previous.publishedAt<article.publishedAt)found.set(article.sourceUrl,article);}
 }
 return [...found.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.sourceUrl.localeCompare(b.sourceUrl));
}
export async function discoverGovUkNewsCandidates({now=Date.now(),fetcher=fetch}={}){
 const response=await boundedRead(IRAN_GOVUK_NEWS_FEED,{fetcher,maxBytes:1000000});
 if(response.status!=='COLLECTED')throw Error('NEWS_DISCOVERY_SOURCE_FAILED');
 const candidates=parseGovUkNewsCandidates(response.body,{now});
 return {status:'REVIEW_REQUIRED',checkedAt:now,source:'GOV.UK',count:candidates.length,candidates};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--preview')throw Error('NEWS_DISCOVERY_READ_ONLY_PREVIEW_REQUIRED');
 try{console.log(JSON.stringify(await discoverGovUkNewsCandidates()));}
 catch(error){console.error(JSON.stringify({status:'DISCOVERY_DELAYED',error:error.message}));process.exitCode=1;}
}
