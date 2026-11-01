// Source-specific public-news rights contract. This is NOT a discovery rule:
// private R26 candidates must first undergo an independent article review.
export const NEWS_RIGHTS_SOURCES=Object.freeze({
 'Tasnim':Object.freeze({
  rightsSource:'TASNIM_CC_BY_4_0',rightsPolicyUrl:'https://creativecommons.org/licenses/by/4.0/',
  publicationMode:'LICENSED_KOREAN_ADAPTATION',label:'CC BY 4.0 · 한국어 번역·요약',
 }),
 'IAEA':Object.freeze({
  rightsSource:'IAEA_WEBSITE_TERMS',rightsPolicyUrl:'https://www.iaea.org/about/terms-of-use',
  publicationMode:'LICENSED_KOREAN_ADAPTATION',label:'IAEA 자료 · 출처 표시 · 한국어 번역·요약',
 }),
 'UN':Object.freeze({
  rightsSource:'UN_NEWS_NOTICE_REVIEWED',rightsPolicyUrl:'https://www.un.org/en/about-us/copyright/',
  publicationMode:'UN_NEWS_AUTHORIZED',label:'UN 뉴스 · 출처 표시 및 통지 확인 · 한국어 요약',
 }),
 'BBC':Object.freeze({
  rightsSource:'INDEPENDENT_FACTS_LINK_ONLY',
  rightsPolicyUrl:'https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use_31March2022english.pdf',
  publicationMode:'INDEPENDENT_KOREAN_FACTS',label:'BBC 원문 링크 · 독립 검증한 사실 요약',
 }),
});

const KOREAN=/[가-힣]/;
function utcInstant(value,now){
 if(typeof value!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(value))return false;
 const time=Date.parse(value);
 return Number.isSafeInteger(time)&&time>0&&time<=now&&new Date(time).toISOString()===value;
}
function cleanHttps(value){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&
  !url.port&&!url.hash?url:false;}
 catch{return false;}
}
function sourceUrlAllowed(source,url){
 if(!url)return false;
 const {hostname,pathname}=url;
 if(source==='Tasnim')return ['www.tasnimnews.ir','tasnimnews.ir'].includes(hostname)&&pathname.startsWith('/en/news/');
 if(source==='IAEA')return ['www.iaea.org','iaea.org'].includes(hostname)&&
  /^\/newscenter\/(?:news|statements)\//.test(pathname);
 if(source==='UN')return hostname==='news.un.org'&&pathname.startsWith('/en/story/');
 if(source==='BBC')return ['www.bbc.com','bbc.com','www.bbc.co.uk','bbc.co.uk'].includes(hostname)&&pathname.startsWith('/news/');
 return false;
}

/**
 * A reviewed R1-input entry may be published only with explicit per-item
 * source-rights evidence. A publisher's licence alone does not flip R26 flags.
 */
export function validSourceRightsNews(item,now=Date.now()){
 const policy=NEWS_RIGHTS_SOURCES[item?.source];
 if(!policy||item?.rightsVerified!==true||item.displayEligible!==true||
  item.rightsSource!==policy.rightsSource||item.rightsPolicyUrl!==policy.rightsPolicyUrl||
  item.publicationMode!==policy.publicationMode||
  !utcInstant(item.rightsReviewedAt,now)||!sourceUrlAllowed(item.source,cleanHttps(item.sourceUrl))||
  typeof item.title!=='string'||!KOREAN.test(item.title)||
  typeof item.summary!=='string'||!KOREAN.test(item.summary)||
  item.editorialSummaryReviewed!==true)return false;

 if(item.source==='Tasnim'||item.source==='IAEA')
  return item.sourceOriginalContentVerified===true&&item.adaptationNotice==='한국어 번역·요약'&&
   typeof item.creatorCredit==='string'&&item.creatorCredit.trim().length>=2&&item.creatorCredit.length<=160;
 if(item.source==='UN')return item.sourceOriginalContentVerified===true&&
  item.newsReuseScopeReviewed===true&&utcInstant(item.unNoticeConfirmedAt,now)&&
  Date.parse(item.rightsReviewedAt)>=Date.parse(item.unNoticeConfirmedAt)&&
  item.adaptationNotice==='한국어 번역·요약'&&typeof item.creatorCredit==='string'&&
  item.creatorCredit.trim().length>=2&&item.creatorCredit.length<=160;
 if(item.source==='BBC'){
  const corroboration=cleanHttps(item.corroboratingSourceUrl);
  const otherHost=corroboration?corroboration.hostname.replace(/^www\./,''):'';
  return Boolean(item.independentFactsReviewed===true&&item.sourceTextReused===false&&
   corroboration&&otherHost!=='bbc.com'&&otherHost!=='bbc.co.uk'&&
   otherHost!==new URL(item.sourceUrl).hostname.replace(/^www\./,''));
 }
 return false;
}

export function sourceRightsAttribution(item,{now=Date.now()}={}){
 if(!validSourceRightsNews(item,now))return null;
 const policy=NEWS_RIGHTS_SOURCES[item.source];
 return {label:(item.creatorCredit?`${item.creatorCredit.trim()} · `:'')+policy.label,
  url:policy.rightsPolicyUrl};
}
