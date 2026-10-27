// Display-only cache. Never delete rows from the R3/R5 immutable event store.
import {createHash} from 'node:crypto';
import {NEWS_PC_RETENTION_DAYS,IRAN_NEWS_DISPLAY_VERSION,kstDayWindow,kstNewsDay,
 validNewsDisplayItem,visibleIranNewsItems,buildIranNewsSnapshot} from '../../lib/iran-progress/news-display-r1.mjs';

export const RIGHTS_SOURCE='GOV_UK_OGL_V3';
export const RIGHTS_POLICY_URL='https://www.gov.uk/help/reuse-govuk-content';
export const IRAN_NEWS_CACHE_VERSION='IRAN_NEWS_PC_DISPLAY_R1';
export const EMPTY_IRAN_NEWS_CACHE=Object.freeze({version:IRAN_NEWS_CACHE_VERSION,items:[]});

// The caller must establish that the individual GOV.UK page is not third-party content.
export function toDisplayNewsItem(candidate,{now=Date.now()}={}){
 if(candidate?.rightsVerified!==true||candidate.rightsSource!==RIGHTS_SOURCE||
    candidate.rightsPolicyUrl!==RIGHTS_POLICY_URL||candidate.source!=='GOV.UK')return null;
 if(typeof candidate.sourceUrl!=='string'||typeof candidate.publishedAt!=='string')return null;
 const url=(()=>{try{const u=new URL(candidate.sourceUrl);u.hash='';u.search='';return u.href;}catch{return '';}})();
 const id=createHash('sha256').update(url).digest('hex');
 const hasEnglish=candidate.titleEn!==undefined||candidate.summaryEn!==undefined;
 const hasKorean=candidate.titleKo!==undefined||candidate.summaryKo!==undefined;
 if(hasEnglish&&!(typeof candidate.titleEn==='string'&&typeof candidate.summaryEn==='string'))return null;
 if(hasKorean&&(!hasEnglish||candidate.translationReviewed!==true))return null;
 const item={id,source:'GOV.UK',publishedAt:candidate.publishedAt,
  title:candidate.title,summary:candidate.summary,impact:candidate.impact,sourceUrl:url,
  ...(hasEnglish?{titleEn:candidate.titleEn,summaryEn:candidate.summaryEn}:{}),
  ...(hasKorean?{titleKo:candidate.titleKo,summaryKo:candidate.summaryKo,translationReviewed:true}:{})};
 return validNewsDisplayItem(item,now)?item:null;
}
export function previewIranNewsRetention(cache,incoming,{now=Date.now()}={}){
 if(cache?.version!==IRAN_NEWS_CACHE_VERSION||!Array.isArray(cache.items))throw Error('NEWS_CACHE_FORMAT_INVALID');
 if(!Array.isArray(incoming))throw Error('NEWS_INPUT_INVALID');
 const {start,end}=kstDayWindow(now,NEWS_PC_RETENTION_DAYS);
 const previous=cache.items.filter(item=>validNewsDisplayItem(item,now));
 const validIncoming=incoming.map(item=>toDisplayNewsItem(item,{now})).filter(Boolean);
 const byId=new Map();
 for(const item of [...previous,...validIncoming]){
  const date=kstNewsDay(Date.parse(item.publishedAt));
  if(date<start||date>end)continue;
  const existing=byId.get(item.id);
  if(!existing||item.publishedAt>=existing.publishedAt)byId.set(item.id,item);
 }
 const items=[...byId.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id));
 const expired=previous.filter(item=>kstNewsDay(Date.parse(item.publishedAt))<start).length;
 return {cache:{version:IRAN_NEWS_CACHE_VERSION,updatedAt:now,items},
  report:{before:cache.items.length,received:incoming.length,accepted:validIncoming.length,
   rejected:incoming.length-validIncoming.length,expired,after:items.length,asOfDate:end}};
}
export function previewIranNewsPublic(cache,{now=Date.now()}={}){
 if(cache?.version!==IRAN_NEWS_CACHE_VERSION||!Array.isArray(cache.items))throw Error('NEWS_CACHE_FORMAT_INVALID');
 return buildIranNewsSnapshot(visibleIranNewsItems(cache.items,{now}),{now});
}
