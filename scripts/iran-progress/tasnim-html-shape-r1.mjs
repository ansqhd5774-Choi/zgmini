// Read-only Tasnim HTML structure probe for the English R5 evidence pipeline.
// It deliberately does not persist, echo or submit original article text.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPublishedNews} from './published-news-score-input-r1.mjs';
import {validateR41MetadataFeed} from './news-r41-auto-interpret-r1.mjs';
import {r41SourceRightsPolicy} from './news-r41-source-rights-r1.mjs';
import {boundedRead} from './sources.mjs';

const VERSION='IRAN_TASNIM_HTML_SHAPE_R1';
const classesOf=attrs=>{
 const values=[];
 for(const name of ['class','id','itemprop']){
  const match=new RegExp(`\\b${name}\\s*=\\s*(["'])([^"'<>]{1,160})\\1`,'i').exec(attrs);
  if(!match)continue;
  for(const token of match[2].split(/\s+/))if(/^[A-Za-z0-9_-]{2,80}$/.test(token))
   values.push(token);
 }
 return values;
};

export function inspectTasnimHtmlShape(html,{title}={}){
 if(typeof html!=='string'||html.length>1200000||typeof title!=='string'||!title)
  throw Error('IRAN_TASNIM_SHAPE_INPUT_INVALID');
 const articles=[];
 for(const [,json] of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  let root;
  try{root=JSON.parse(json.trim());}catch{continue;}
  const pending=[root];
  while(pending.length){
   const row=pending.pop();
   if(Array.isArray(row)){pending.push(...row);continue;}
   if(!row||typeof row!=='object')continue;
   if(Array.isArray(row['@graph']))pending.push(...row['@graph']);
   const types=Array.isArray(row['@type'])?row['@type']:[row['@type']];
   if(types.some(type=>type==='NewsArticle'||type==='Article'))articles.push(row);
  }
 }
 const matched=articles.filter(row=>row.headline===title);
 const bodyFields=matched.map(row=>({
  type:typeof row.articleBody,
  chars:typeof row.articleBody==='string'?row.articleBody.length:null,
 }));
 // Only HTML element names and static class/id/itemprop tokens are reported.
 const withoutScripts=html.replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,' ');
 const candidates=new Set();let articleTags=0,paragraphTags=0;
 for(const [,tag,attrs] of withoutScripts.matchAll(/<([a-z][\w:-]*)\b([^<>]{0,600})>/gi)){
  if(tag.toLowerCase()==='article')articleTags++;
  if(tag.toLowerCase()==='p')paragraphTags++;
  if(candidates.size>=35)continue;
  const tokens=classesOf(attrs).filter(token=>
   /(?:article|body|content|detail|description|entry|story|news|text|main)/i.test(token));
  if(tokens.length)candidates.add(tag.toLowerCase()+':'+tokens.slice(0,4).join('.'));
 }
 const description=/<meta\b[^>]*name=["']description["'][^>]*>/i.exec(html)?.[0]??'';
 return {htmlBytes:Buffer.byteLength(html),jsonLdArticles:articles.length,
  exactHeadlineMatches:matched.length,bodyFields,articleTags,paragraphTags,
  hasMetaDescription:Boolean(description),candidateContainers:[...candidates]};
}

export async function runTasnimHtmlShape({now=Date.now(),fetchImpl=fetch,
 articleFetcher=fetch,maxArticles=12}={}){
 if(!Number.isSafeInteger(now)||!Number.isInteger(maxArticles)||
  maxArticles<1||maxArticles>20)throw Error('IRAN_TASNIM_SHAPE_OPTIONS_INVALID');
 const {r41,selected}=await readPublishedNews({now,fetchImpl});
 if(selected.endpoint!=='/api/outbreak-news/iran/r41')
  throw Error('IRAN_TASNIM_SHAPE_R41_UNAVAILABLE');
 const articles=validateR41MetadataFeed(r41,{now}).filter(article=>
  article.sourceId==='tasnim'&&r41SourceRightsPolicy(article.sourceId,
   article.sourceUrl).directlyFetchable).slice(0,maxArticles);
 const results=[];
 for(const article of articles){
  let outcome={sourceUrl:article.sourceUrl,status:'SOURCE_FAILED'};
  try{
   const response=await boundedRead(article.sourceUrl,{maxBytes:1200000,
    fetcher:(url,opts)=>articleFetcher(url,{...opts,redirect:'error'})});
   if(response.status!=='COLLECTED')outcome={...outcome,httpStatus:response.httpStatus};
   else outcome={sourceUrl:article.sourceUrl,status:'HTML_SHAPE_READ',
    ...inspectTasnimHtmlShape(response.body,{title:article.originalTitle})};
  }catch(error){outcome={...outcome,errorCode:
   /^[A-Z][A-Z0-9_]{1,79}$/.test(error?.message)?error.message:'SOURCE_READ_FAILED'};}
  results.push(outcome);
 }
 return {version:VERSION,status:'READ_ONLY',checkedAt:new Date(now).toISOString(),
  sourceCount:r41.sourceCount,newsCount:r41.itemCount,tasnimChecked:results.length,
  articles:results,articleBodyPersisted:false,ollamaCalls:0,r5ScoreChanges:0,publicWrite:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--read-only')
   throw Error('IRAN_TASNIM_SHAPE_READ_ONLY');
  console.log(JSON.stringify(await runTasnimHtmlShape(),null,2));
 }catch(error){
  const reason=/^IRAN_TASNIM_[A-Z0-9_]+$/.test(error?.message)?error.message:
   'IRAN_TASNIM_SHAPE_FAILED';
  console.error(JSON.stringify({status:'BLOCKED',reason,publicWrite:false,r5ScoreChanges:0}));
  process.exitCode=1;
 }
}
