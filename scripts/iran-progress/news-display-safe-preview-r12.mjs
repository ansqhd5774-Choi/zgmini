// R12: rights-gated read-only preview of display-only news candidates.
// No free-form model output may be silently promoted to public news.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {boundedRead} from './sources.mjs';
import {discoverGovUkNewsCandidates} from './news-display-discover-r1.mjs';
import {toDisplayNewsItem,RIGHTS_SOURCE,RIGHTS_POLICY_URL} from './news-display-r1.mjs';
import {kstDayWindow,kstNewsDay} from '../../lib/iran-progress/news-display-r1.mjs';
import {plainNewsBody} from './news-display-model-shadow-r10.mjs';

const TOPIC_PATTERNS=[
 ['이란',/\biran(?:ian)?s?\b|이란/i],
 ['사우디아라비아',/\bsaudis?\b|사우디(?:아라비아)?/i],
 ['예멘',/\byemen(?:is?)?\b|예멘|예맨/i],
 ['후티',/\bhouthis?\b|후티/i],
];
const ALLOWED_DOCUMENT_TYPES=new Set(['press_release','news_story','statement','speech']);

export function displayTopicNames(text){
 return TOPIC_PATTERNS.filter(([,test])=>test.test(text)).map(([name])=>name);
}
export function safeNewsFallbackSummary(topics){
 if(!Array.isArray(topics)||!topics.length||topics.some(name=>!TOPIC_PATTERNS.some(([allowed])=>allowed===name)))
  throw Error('NEWS_SAFE_SUMMARY_TOPICS_INVALID');
 const mentioned=topics.join('·');
 return `영국 정부 공식 발표에서 ${mentioned} 관련 내용을 언급했습니다. 상세 내용은 원문에서 확인할 수 있습니다.`;
}
export function assessGovUkNewsRights(content,html){
 if(!content||typeof content!=='object'||typeof html!=='string')return {status:'RIGHTS_METADATA_MISSING'};
 if(!ALLOWED_DOCUMENT_TYPES.has(content.document_type))return {status:'RIGHTS_DOCUMENT_TYPE_UNSUPPORTED'};
 const orgs=content.links?.organisations;
 if(!Array.isArray(orgs)||!orgs.some(org=>typeof org.base_path==='string'&&org.base_path.startsWith('/government/organisations/')))
  return {status:'RIGHTS_GOVERNMENT_PUBLISHER_UNVERIFIED'};
 if(!/Open Government Licence(?:\s*(?:v3\.0|version\s*3))?/i.test(html))return {status:'RIGHTS_OGL_NOTICE_NOT_FOUND'};
 const body=plainNewsBody(content.details?.body??'');
 if(!body)return {status:'RIGHTS_SOURCE_BODY_MISSING'};
 if(/(?:©|\bcopyright\b|all rights reserved|reproduced with permission|third.party copyright)/i.test(body))
  return {status:'RIGHTS_THIRD_PARTY_NOTICE_IN_BODY'};
 return {status:'RIGHTS_CROWN_TEXT_ONLY'};
}
async function inspectArticle(article,fetcher,now){
 const base={title:article.title,sourceUrl:article.sourceUrl,publishedAt:article.publishedAt};
 try{
  const contentUrl='https://www.gov.uk/api/content'+new URL(article.sourceUrl).pathname;
  const [api,page]=await Promise.all([
   boundedRead(contentUrl,{fetcher,maxBytes:4000000}),
   boundedRead(article.sourceUrl,{fetcher,maxBytes:3000000}),
  ]);
  if(api.status!=='COLLECTED'||page.status!=='COLLECTED')return {...base,status:'SOURCE_READ_FAILED'};
  const content=JSON.parse(api.body);
  if(content.base_path!==new URL(article.sourceUrl).pathname||content.withdrawn===true||
   Date.parse(content.first_published_at??'')!==Date.parse(article.publishedAt))
   return {...base,status:'SOURCE_IDENTITY_MISMATCH'};
  const rights=assessGovUkNewsRights(content,page.body);
  if(rights.status!=='RIGHTS_CROWN_TEXT_ONLY')return {...base,status:rights.status};
  const original=plainNewsBody(content.details?.body??'');
  const topics=displayTopicNames([article.title,content.description??'',original].join(' '));
  if(!topics.length)return {...base,status:'SOURCE_TOPIC_NOT_CONFIRMED'};
  const summary=safeNewsFallbackSummary(topics);
  const reviewed={source:'GOV.UK',sourceUrl:article.sourceUrl,
   title:article.title,publishedAt:article.publishedAt,summary,impact:'neutral',
   rightsVerified:true,rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL};
  const item=toDisplayNewsItem(reviewed,{now});
  if(!item)return {...base,status:'PUBLIC_DISPLAY_CONTRACT_FAILED'};
  return {...base,status:'ELIGIBLE_SAFE_TEXT_ONLY',topics,impact:'neutral',summary,
   rightsSource:RIGHTS_SOURCE,displayId:item.id};
 }catch{return {...base,status:'SOURCE_READ_FAILED'};}
}

export async function previewSafeIranNewsR12({now=Date.now(),fetcher=fetch}={}){
 const found=await discoverGovUkNewsCandidates({now,fetcher});
 const {start}=kstDayWindow(now,14);
 const recent=found.candidates.filter(a=>kstNewsDay(Date.parse(a.publishedAt))>=start);
 const previews=[];
 for(const article of recent.slice(0,50))previews.push(await inspectArticle(article,fetcher,now));
 const eligible=previews.filter(p=>p.status==='ELIGIBLE_SAFE_TEXT_ONLY');
 return {status:'R12_DISPLAY_PREVIEW_ONLY_NO_WRITES',asOfKst:new Date(now+9*3600000).toISOString().slice(0,19).replace('T',' '),
  source:'GOV.UK',topics:'Iran OR Saudi OR Yemen OR Houthi',
  discovered30d:found.count,discovered14d:recent.length,
  inspected:previews.length,uninspected:recent.length-previews.length,
  eligible:eligible.length,held:previews.length-eligible.length,
  results:previews,summaryMode:'DETERMINISTIC_NEUTRAL_FALLBACK_TEXT',
  rightsMode:'OFFICIAL_PUBLISHER_AND_OGL_NOTICE_AND_NO_BODY_RIGHTS_FLAG',
  publication:'NOT_STARTED',d1Written:false,cacheModified:false,
  schedulerModified:false,scoreLedgerModified:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')throw Error('R12_READ_ONLY_ONLY');
 try{const result=await previewSafeIranNewsR12();console.log(JSON.stringify(result));
  if(result.eligible===0||result.uninspected>0)process.exitCode=2;
 }catch(error){console.error(JSON.stringify({status:'R12_PREVIEW_FAILED',reason:error.message,publication:'NOT_STARTED'}));process.exitCode=1;}
}
