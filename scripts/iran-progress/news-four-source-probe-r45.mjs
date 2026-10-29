// R45: 4 new publishers, read-only collection preflight. Never writes PC/D1 or publishes.
// Source URLs are discovery hints. Only publisher article pages provide dates and content.
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const IRAN_NEWS_R45_SOURCES=Object.freeze([
 Object.freeze({id:'reuters',name:'Reuters',listing:'https://www.reuters.com/world/middle-east/',hosts:['www.reuters.com']}),
 Object.freeze({id:'ap',name:'AP',listing:'https://apnews.com/hub/middle-east',hosts:['apnews.com']}),
 Object.freeze({id:'arabnews',name:'Arab News',listing:'https://www.arabnews.com/middle-east',hosts:['www.arabnews.com']}),
 Object.freeze({id:'anadolu',name:'Anadolu Agency',listing:'https://www.aa.com.tr/en/middle-east',hosts:['www.aa.com.tr','mobil.aa.com.tr']}),
]);
const PRIMARY=/\b(?:iran(?:ian)?s?|saudis?|yemen(?:is?)?|houthis?)\b|이란|사우디(?:아라비아)?|예멘|예맨|후티/i;
const SECONDARY=/\b(?:wars?|cease[ -]?fires?|truces?|agreements?|accords?|deals?|negotiat(?:e|es|ed|ing|ion|ions)|talks?|progress|breakthroughs?)\b|전쟁|합의|휴전|협상|진전/i;
const MAX_HTML=2_500_000;
function htmlText(value){
 return String(value??'').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,' ').replace(/<[^>]+>/g,' ')
  .replace(/&(?:amp|quot|apos|lt|gt|nbsp|#39);/gi,x=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' ','&#39;':"'"})[x.toLowerCase()]??x)
  .replace(/\s+/g,' ').trim();
}
function attr(tag,key){
 const m=tag.match(new RegExp(String.raw`(?:^|\s)`+key+String.raw`\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))`,'i'));
 return m?htmlText(m[1]??m[2]??m[3]):null;
}
function meta(html,keys){
 for(const tag of html.match(/<meta\b[^>]*>/gi)??[]){
  const k=attr(tag,'property')??attr(tag,'name')??attr(tag,'itemprop');
  if(k&&keys.includes(k.toLowerCase()))return attr(tag,'content');
 }
 return null;
}
export function normalizeR45ArticleUrl(sourceId,raw,base){
 const spec=IRAN_NEWS_R45_SOURCES.find(s=>s.id===sourceId);
 if(!spec||typeof raw!=='string'||raw.length>2000||!raw.trim())return null;
 try{
  const u=new URL(raw,base??spec.listing);
  if(u.protocol!=='https:'||!spec.hosts.includes(u.hostname)||u.username||u.password||u.port||u.hash)return null;
  const p=u.pathname;
  const allowed=sourceId==='reuters'?/^\/world\/[^?#]+-20\d\d-\d\d-\d\d\/?$/i.test(p):
   sourceId==='ap'?/^\/article\/[a-z0-9-]{8,}\/?$/i.test(p):
   sourceId==='arabnews'?/(?:\/node\/\d{5,}|-\d{5,})\/?$/i.test(p):
   /^\/en\/[a-z0-9-]+\/[a-z0-9-]+\/\d{6,}\/?$/i.test(p);
  if(!allowed)return null;
  for(const k of [...u.searchParams.keys()])if(/^(?:utm_.+|at_medium|at_campaign|traffic_source)$/i.test(k))u.searchParams.delete(k);
  return u.href;
 }catch{return null;}
}
export function discoverR45ArticleUrls(sourceId,html,limit=12){
 if(typeof html!=='string'||html.length>MAX_HTML||!/<html\b|<!doctype html/i.test(html)||
  !Number.isInteger(limit)||limit<1||limit>50)throw Error('R45_LISTING_INVALID');
 const spec=IRAN_NEWS_R45_SOURCES.find(s=>s.id===sourceId);
 if(!spec)throw Error('R45_SOURCE_INVALID');
 const urls=new Set();
 for(const tag of html.match(/<a\b[^>]*>/gi)??[]){
  const href=attr(tag,'href');
  const u=normalizeR45ArticleUrl(sourceId,href,spec.listing);
  if(u)urls.add(u);
 }
 // Search priority is not a publication filter: a secondary keyword might only
 // appear in the original article, so never discard unrelated-looking slugs.
 const ordered=[...urls].sort((a,b)=>{
  const ap=PRIMARY.test(new URL(a).pathname)?1:0;
  const bp=PRIMARY.test(new URL(b).pathname)?1:0;
  return bp-ap;
 });
 return ordered.slice(0,limit);
}
function articleJsonLd(html){
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(!/^application\/ld\+json/i.test(attr(m[1],'type')??''))continue;
  try{
   const root=JSON.parse(m[2]);
   const stack=[root];
   while(stack.length){
    const item=stack.pop();
    if(!item||typeof item!=='object')continue;
    if(Array.isArray(item)){stack.push(...item);continue;}
    if(item['@graph'])stack.push(item['@graph']);
    const types=Array.isArray(item['@type'])?item['@type']:[item['@type']];
    if(types.some(x=>/^(?:newsarticle|article|reportagenewsarticle)$/i.test(String(x))))return item;
   }
  }catch{/* Skip invalid schema blocks. */}
 }
 return null;
}
function kstDate(ms){return new Date(ms+9*3600_000).toISOString().slice(0,10);}

function publisherIsoDate(raw){
 // Do not invent a timezone or treat feed update times as publication dates.
 if(typeof raw!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/i.test(raw.trim()))return NaN;
 return Date.parse(raw.trim());
}
function timeTagDate(html){
 for(const tag of html.match(/<time\b[^>]*>/gi)??[]){
  const date=attr(tag,'datetime')??attr(tag,'content');
  if(Number.isFinite(publisherIsoDate(date)))return date;
 }
 return null;
}
function publisherDate(html,schema){
 const candidates=[schema?.datePublished,meta(html,[
  'article:published_time','datepublished','date_published','pubdate',
  'datecreated','dc.date.issued','dc.date','sailthru.date']),
  timeTagDate(html)];
 return candidates.find(date=>Number.isFinite(publisherIsoDate(date)))??null;
}
function containedParagraphs(html,sourceId){
 // Only the publisher's named editorial body is allowed as a fallback.
 const selectors=sourceId==='arabnews'?[
  /\b(?:field-name-body|field--name-body|article-body|article__body|story-body|entry-content|article-content)\b/i,
  /\b(?:field--type-text-with-summary|field-type-text-with-summary)\b/i
 ]:sourceId==='anadolu'?[
  /\b(?:detay-icerik|detay-spot|article-body|article__body|news-content|content-detail|detail-text|article-content)\b/i
 ]:[];
 if(!selectors.length)return '';
 for(const tag of html.matchAll(/<(?:div|section)\b[^>]*>/gi)){
  const cls=attr(tag[0],'class')??'';
  const id=attr(tag[0],'id')??'';
  if(!selectors.some(re=>re.test(cls)||re.test(id)))continue;
  const node=tag[0].match(/^<(div|section)/i)?.[1]?.toLowerCase();
  const token=new RegExp('<\\/?'+node+'\\b[^>]*>','gi');
  token.lastIndex=tag.index+tag[0].length;
  let depth=1,end=-1;
  for(const match of html.matchAll(token)){
   if(match.index<token.lastIndex)continue;
   depth+=/^<\//.test(match[0])?-1:1;
   if(depth===0){end=match.index;break;}
   if(match.index-tag.index>250000)break;
  }
  if(end<0)continue;
  const part=html.slice(tag.index+tag[0].length,end);
  const paras=[...part.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)].map(m=>m[1]);
  const text=htmlText(paras.join(' '));
  if(text.length>30)return text;
 }
 return '';
}
function articleBody(html,sourceId,schema){
 if(typeof schema?.articleBody==='string'&&htmlText(schema.articleBody).length>30)
  return {text:htmlText(schema.articleBody),evidence:'PUBLISHER_JSONLD_ARTICLE_BODY'};
 const article=html.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i)?.[1]??'';
 const paragraphs=[...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)].map(m=>m[1]).join(' ');
 if(htmlText(paragraphs).length>30)return {text:htmlText(paragraphs),evidence:'SEMANTIC_ARTICLE_PARAGRAPHS'};
 const fallback=containedParagraphs(html,sourceId);
 if(fallback)return {text:fallback,evidence:'PUBLISHER_EDITORIAL_BODY'};
 return {text:'',evidence:'NO_VERIFIED_EDITORIAL_BODY'};
}
export function inspectR45Article(sourceId,url,html,{now=Date.now(),days=14}={}){
 if(!Number.isSafeInteger(now)||![14,30].includes(days))throw Error('R45_ARTICLE_WINDOW_INVALID');
 if(!normalizeR45ArticleUrl(sourceId,url)||typeof html!=='string'||html.length>MAX_HTML||
  !/<html\b|<!doctype html/i.test(html))return {sourceId,url,status:'ARTICLE_FORMAT_INVALID'};
 const schema=articleJsonLd(html);
 const rawDate=publisherDate(html,schema);
 const when=publisherIsoDate(rawDate);
 const title=htmlText(schema?.headline??meta(html,['og:title','twitter:title'])??
  html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i)?.[1]??'');
 const {text,evidence:bodyEvidence}=articleBody(html,sourceId,schema);
 const validDate=Number.isFinite(when)&&when<=now+300_000&&when>=0;
 const offsetDays=validDate?(Date.parse(kstDate(now)+'T00:00:00Z')-Date.parse(kstDate(when)+'T00:00:00Z'))/86400_000:null;
 const status=!title||title.length>500?'TITLE_UNVERIFIED':!validDate?'FIRST_PUBLICATION_UNVERIFIED':
  !text?'ARTICLE_BODY_UNVERIFIED':!PRIMARY.test(title+' '+text)||!SECONDARY.test(title+' '+text)?'ARTICLE_OUT_OF_SCOPE':
   offsetDays<0||offsetDays>=days?(days===14?'OUTSIDE_14_DAY_WINDOW':'OUTSIDE_30_DAY_WINDOW'):'ARTICLE_METADATA_REVIEWED';
 return {sourceId,url,status,bodyEvidence,dateEvidence:rawDate?'PUBLISHER_DECLARED_ZONED_DATE':'NONE',
  ...(status==='ARTICLE_METADATA_REVIEWED'?{title,publishedAt:new Date(when).toISOString()}:{}),
  rightsVerified:false,displayEligible:false};
}
async function readHtml(fetcher,url){
 const res=await fetcher(url,{redirect:'manual',headers:{accept:'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(15000)});
 if(!res||res.status!==200)throw Error('HTTP_'+(res?.status??'NO_RESPONSE'));
 const size=Number(res.headers?.get?.('content-length')??0);
 if(size>MAX_HTML)throw Error('PAYLOAD_LIMIT');
 const body=await res.text();
 if(body.length>MAX_HTML)throw Error('PAYLOAD_LIMIT');
 return body;
}
export async function probeIranFourPublishersR45({fetcher=fetch,now=Date.now(),limit=8}={}){
 if(!Number.isSafeInteger(now)||!Number.isInteger(limit)||limit<1||limit>20)throw Error('R45_OPTIONS_INVALID');
 const sources=await Promise.all(IRAN_NEWS_R45_SOURCES.map(async spec=>{
  let urls=[];
  try{urls=discoverR45ArticleUrls(spec.id,await readHtml(fetcher,spec.listing),limit);}
  catch(e){return {sourceId:spec.id,status:'SOURCE_FAILED',reason:String(e?.message).slice(0,48),feedRead:false,candidates:0,articleVerified:0,eligible14Day:0,errors:1,articles:[]};}
  const inspected=await Promise.all(urls.map(async url=>{
   try{return inspectR45Article(spec.id,url,await readHtml(fetcher,url),{now});}
   catch(e){return {sourceId:spec.id,url,status:'ARTICLE_FETCH_FAILED',reason:String(e?.message).slice(0,48)};}
  }));
  const verified=inspected.filter(a=>a.status==='ARTICLE_METADATA_REVIEWED');
  const errors=inspected.filter(a=>/FAILED|INVALID|UNVERIFIED/.test(a.status)).length;
  const articleStatuses=Object.fromEntries([...new Set(inspected.map(a=>a.status))].map(
   key=>[key,inspected.filter(a=>a.status===key).length]));
  return {sourceId:spec.id,status:!urls.length?'NO_ITEMS':errors?'PARTIAL':'READ',
   feedRead:true,candidates:urls.length,articleVerified:verified.length,eligible14Day:verified.length,errors,articleStatuses,
   articles:inspected.map(a=>({...a,rightsVerified:false,displayEligible:false}))};
 }));
 return {version:'IRAN_NEWS_R45_FOUR_SOURCE_READ_ONLY',status:sources.some(s=>s.status!=='READ')?'PARTIAL_REVIEW_REQUIRED':'READ_ONLY_REVIEW_REQUIRED',
  checkedAt:new Date(now).toISOString(),sources,sourceCount:4,
  pcCacheWritten:false,d1Written:false,schedulerModified:false,scoreLedgerModified:false,publicCacheModified:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--probe')throw Error('R45_READ_ONLY_PROBE_REQUIRED');
 console.log(JSON.stringify(await probeIranFourPublishersR45()));
}
