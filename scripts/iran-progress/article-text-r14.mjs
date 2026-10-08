import {hash} from './store.mjs';
export const ARTICLE_TEXT_VERSION='IRAN_OFFICIAL_ARTICLE_TEXT_R14_3';
export const POLICIES={
 mofa:{name:'PDL1.0',notice:'https://www.mofa.go.jp/about/legalmatters.html',license:'https://www.digital.go.jp/en/resources/open_data/public_data_license_v1.0',attribution:'Ministry of Foreign Affairs of Japan; normalized text and AI interpretation by ZGMINI'},
 govuk:{name:'OGLv3.0',notice:'https://www.gov.uk/help/terms-conditions',license:'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',attribution:'Contains public sector information licensed under the Open Government Licence v3.0; normalized text and AI interpretation by ZGMINI'},
};
export function officialArticlePolicy(value){
 let u;try{u=new URL(value);}catch{throw Error('ARTICLE_URL_NOT_ALLOWED');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash)throw Error('ARTICLE_URL_NOT_ALLOWED');
 const site=u.hostname==='www.mofa.go.jp'&&/^\/press\/release\/pressite_[\w]+\.html$/.test(u.pathname)?'mofa'
  :u.hostname==='www.gov.uk'&&/^\/government\/(?:speeches|news|statements)\/[a-z0-9-]+$/.test(u.pathname)?'govuk':null;
 if(!site)throw Error('ARTICLE_URL_NOT_ALLOWED');
 return {site,url:u.href,...POLICIES[site]};
}
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',hellip:'…'};
export function decodeEntities(s){return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(whole,key)=>{
 if(key[0]==='#'){const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):whole;}
 return entities[key]??whole;
});}
function cleanHtml(s){return s.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|noscript|iframe|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');}
export function textOnly(s){return decodeEntities(cleanHtml(s).replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();}
function attr(tag,name){return tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`,'i'))?.[2];}
// Balanced known-site containers, never fallback to navigation/body on layout drift.
export function elementInner(html,tagName,attribute,value){
 const re=new RegExp(`<\\/?${tagName}\\b[^>]*>`,'gi');let m,start=null,depth=0;
 while((m=re.exec(html))){const closing=/^<\//.test(m[0]);
  if(start===null){const a=attr(m[0],attribute);if(!closing&&(attribute==='class'?a?.split(/\s+/).includes(value):a===value)){start=re.lastIndex;depth=1;}}
  else{depth+=closing?-1:1;if(depth===0)return html.slice(start,m.index);}
 }
 throw Error('ARTICLE_CONTAINER_MISSING');
}
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function parseOfficialArticle(html,url){
 const policy=officialArticlePolicy(url),safe=cleanHtml(html);let body,title,publishedDate;
 if(policy.site==='mofa'){
  const main=elementInner(safe,'div','id','maincontents');
  const start=main.search(/<div\b[^>]*class=["']read-text["']/i);
  if(start<0)throw Error('ARTICLE_BODY_MARKER_MISSING');
  const end=main.search(/<div\b[^>]*class=["']relatedlink-section["']/i);
  body=main.slice(start,end>=start?end:undefined);
  title=textOnly(safe.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i)?.[0]??'');
  const d=main.match(/<div\b[^>]*class=["']rightalign["'][^>]*>\s*([A-Za-z]+) (\d{1,2}), (\d{4})\s*<\/div>/);
  if(!d||!MONTHS.includes(d[1]))throw Error('ARTICLE_PUBLICATION_DATE_MISSING');
  publishedDate=`${d[3]}-${String(MONTHS.indexOf(d[1])+1).padStart(2,'0')}-${d[2].padStart(2,'0')}`;
 }else{
  body=elementInner(safe,'div','class','govspeak');
  title=textOnly(safe.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0]??'');
  const originalMeta=[...safe.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]).find(t=>attr(t,'name')==='govuk:first-published-at');
  publishedDate=originalMeta?attr(originalMeta,'content')?.slice(0,10):safe.match(/<time\b[^>]*datetime=["'](\d{4}-\d{2}-\d{2})[^"']*["']/i)?.[1];
 }
 if(/third.party copyright|all rights reserved|reproduced (?:by|with) permission|©\s*(?!Crown)/i.test(textOnly(body)))throw Error('ARTICLE_RIGHTS_EXCEPTION');
 const text=textOnly(body);
 if(!title||title.length>1000||text.length<100||text.length>60000)throw Error('ARTICLE_TEXT_LENGTH_INVALID');
 if(!publishedDate||!/^\d{4}-\d{2}-\d{2}$/.test(publishedDate)||!Number.isFinite(Date.parse(publishedDate))||new Date(publishedDate).toISOString().slice(0,10)!==publishedDate)throw Error('ARTICLE_PUBLICATION_DATE_INVALID');
 if(!/\bIran(?:ian)?\b|Hormuz/i.test(text))throw Error('ARTICLE_IRAN_CONTENT_MISSING');
 return {version:ARTICLE_TEXT_VERSION,sourceUrl:policy.url,title,publishedDate,text,textHash:hash(text),bodyHash:hash(html),sourceLevel:'FULL_ARTICLE_TEXT',parserVersion:ARTICLE_TEXT_VERSION,site:policy.site,license:policy.name,attribution:policy.attribution,eventVerified:false,coverageVerified:false,scoreInputVerified:false};
}
export function discoverOfficialArticles(html,{site}={}){
 let content;if(site==='mofa')content=elementInner(cleanHtml(html),'div','id','pressrelease');else if(site==='govuk')content=html;else throw Error('ARTICLE_SITE_INVALID');
 const urls=new Set();
 if(site==='mofa'){
  for(const m of content.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
   if(!/Iran|Hormuz|Qatar/i.test(textOnly(m[2])))continue;
   try{urls.add(officialArticlePolicy(new URL(decodeEntities(m[1]),'https://www.mofa.go.jp').href).url);}catch{}
  }
 }else{
  for(const entry of content.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)){
   const link=entry[1].match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i);
   try{if(link)urls.add(officialArticlePolicy(decodeEntities(link[1])).url);}catch{}
  }
 }
 return [...urls].slice(0,40);
}

export async function fetchOfficialText(url,{fetcher=fetch}={}){
 const r=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'text/html, application/atom+xml','User-Agent':'ZGMINI-Official-Research/1.0'}});
 if(r.status!==200)throw Error('ARTICLE_HTTP_'+r.status);
 if(!r.body)throw Error('ARTICLE_RESPONSE_EMPTY');
 const reader=r.body.getReader(),parts=[];let size=0;
 try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>2000000)throw Error('ARTICLE_RESPONSE_LIMIT');parts.push(next.value);}}
 finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(parts,size).toString('utf8');
}
