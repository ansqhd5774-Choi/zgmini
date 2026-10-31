// R41 English R5 read-only preview: bounded Tasnim story fallback.
// This is intentionally separate from the R26/Korean draft source pipeline.
import {boundedRead} from './sources.mjs';
import {tasnimR26Body} from './news-r26-source-evidence-r1.mjs';
import {directR41ArticleEvidence} from './news-r41-auto-interpret-r1.mjs';
import {r41SourceRightsPolicy} from './news-r41-source-rights-r1.mjs';

const MAX_BYTES=1200000;
const decodeHtmlEntities=s=>s.replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{
 const v=n[0].toLowerCase()==='x'?Number.parseInt(n.slice(1),16):Number.parseInt(n,10);
 return v>0&&v<=0x10ffff&&!(v>=0xd800&&v<=0xdfff)?String.fromCodePoint(v):'';
}).replace(/&(amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|rdquo|ldquo|ndash|mdash);/gi,
 (_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',
  rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',ndash:'–',mdash:'—'})[n.toLowerCase()]);

function storySections(html){
 const stack=[],sections=[];
 for(const match of html.matchAll(/<\/?div\b[^>]*>/gi)){
  if(/^<\//.test(match[0])){
   const current=stack.pop();
   if(current?.isStory)sections.push(html.slice(current.start,match.index));
   continue;
  }
  const attribute=/\bclass\s*=\s*(["'])([^"'<>]{0,240})\1/i.exec(match[0]);
  const isStory=(attribute?.[2]??'').split(/\s+/).includes('story');
  stack.push({isStory,start:match.index+match[0].length});
 }
 return sections;
}

/** A Tasnim page is accepted only after the existing exact URL/headline gate. */
export function tasnimEnglishStoryBody(candidate,html){
 try{return tasnimR26Body(candidate,html);}catch(error){
  if(error?.message!=='NEWS_R26_TASNIM_BODY_MISSING')throw error;
 }
 if(typeof html!=='string'||html.length>MAX_BYTES)
  throw Error('IRAN_TASNIM_STORY_BODY_INVALID');
 const sections=storySections(html);
 if(sections.length!==1)throw Error('IRAN_TASNIM_STORY_CONTAINER_AMBIGUOUS');
 const safe=sections[0].replace(/<(?:script|style|nav|aside|footer|form|iframe)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer|form|iframe)>/gi,' ');
 const paragraphs=[];
 for(const match of safe.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)){
  const text=decodeHtmlEntities(match[1].replace(/<!--[^]*?-->/g,' ')
   .replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
  if(text)paragraphs.push(text);
 }
 const body=paragraphs.join(' ');
 if(paragraphs.length<2||body.length<120||body.length>18000)
  throw Error('IRAN_TASNIM_STORY_BODY_MISSING');
 return body;
}

/** Only a previously attempted and rights-approved R26 body-missing result can fall back. */
export async function directEnglishR41ArticleEvidenceR2(articles,{
 fetcher=fetch,maxArticles=16}={}){
 const base=await directR41ArticleEvidence(articles,{fetcher,maxArticles});
 const byId=new Map(articles.map(article=>[article.id,article]));
 const recovered=[];const failures=[];
 for(const failure of base.failures){
  const article=byId.get(failure.id);
  if(failure.reason!=='NEWS_R26_TASNIM_BODY_MISSING'||
     article?.sourceId!=='tasnim'||!r41SourceRightsPolicy(article.sourceId,
      article.sourceUrl).directlyFetchable){
   failures.push(failure);continue;
  }
  try{
   const response=await boundedRead(article.sourceUrl,{maxBytes:MAX_BYTES,
    fetcher:(url,options)=>fetcher(url,{...options,redirect:'error'})});
   if(response.status!=='COLLECTED')throw Error('IRAN_TASNIM_STORY_FETCH_FAILED');
   const articleBody=tasnimEnglishStoryBody({sourceId:article.sourceId,
    sourceUrl:article.sourceUrl,originalTitle:article.originalTitle},response.body);
   recovered.push({sourceId:article.sourceId,sourceUrl:article.sourceUrl,
    originalTitle:article.originalTitle,publishedAt:article.publishedAt,articleBody});
  }catch(error){
   failures.push({id:failure.id,reason:/^(?:IRAN_TASNIM|NEWS_R26)_[A-Z0-9_]{2,75}$/.test(error?.message)?
    error.message:'IRAN_TASNIM_STORY_FETCH_FAILED'});
  }
 }
 return {...base,items:[...base.items,...recovered],failures};
}
