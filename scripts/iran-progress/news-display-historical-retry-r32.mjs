// R32: three explicit historical publisher-article GETs, never a scheduler run.
// Read-only, even when an article is beyond the existing 30-day cache window.
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolvePcProject} from './news-display-upgrade-r32.mjs';

export const R32_HISTORICAL_SAMPLES=Object.freeze([
 {sourceId:'aljazeera',sourceUrl:'https://www.aljazeera.com/news/2026/10/21/irans-enriched-uranium-re-emerges-as-point-of-contention-in-us-talks'},
 {sourceId:'iaea-news',sourceUrl:'https://www.iaea.org/newscenter/news/restoring-iaea-inspections-in-iran-would-create-promising-ground-for-wider-progress-says-director-general-grossi'},
 {sourceId:'iaea-statements',sourceUrl:'https://www.iaea.org/newscenter/statements/iaea-director-general-grossis-statement-to-unsc-on-situation-in-iran-22-june-2025'},
]);

export async function probeR32Historical({inspector,fetcher=fetch,now=Date.now()}={}){
 if(typeof inspector!=='function')throw Error('R32_INSPECTOR_REQUIRED');
 const results=[];
 for(const item of R32_HISTORICAL_SAMPLES){
  try{
   const response=await fetcher(item.sourceUrl,{redirect:'manual',
    signal:AbortSignal.timeout(20000)});
   if(!response.ok||response.status!==200){
    results.push({sourceId:item.sourceId,status:'ARTICLE_FETCH_FAILED',
     httpStatus:response.status});continue;
   }
   const html=await response.text();
   if(html.length>2_500_000){
    results.push({sourceId:item.sourceId,status:'ARTICLE_BODY_TOO_LARGE'});continue;
   }
   const audited=inspector(item,html,{now});
   const historicalArticleVerified=
    ['ARTICLE_METADATA_REVIEWED','OUTSIDE_30_DAY_WINDOW'].includes(audited.status)&&
    audited.articleBodyAccessible===true&&audited.scopeVerifiedFromArticle===true&&
    !!audited.publisherDeclaredPublishedAt;
   results.push({sourceId:item.sourceId,articleUrl:item.sourceUrl,
    status:audited.status,historicalArticleVerified,
    publisherDate:audited.publisherDeclaredPublishedAt??null,
    within30DayWindow:audited.withinRetentionWindow??null,
    articleBodyAccessible:audited.articleBodyAccessible===true,
    rightsVerified:false});
  }catch{
   results.push({sourceId:item.sourceId,status:'ARTICLE_FETCH_FAILED',
    errorCode:'READ_ERROR'});
  }
 }
 const verified=results.filter(item=>item.historicalArticleVerified).length;
 return {version:'IRAN_NEWS_R32_HISTORICAL_DIRECT_PROBE',
  status:verified===3?'PASS_R32_THREE_HISTORICAL_ARTICLES_READONLY':
   'PARTIAL_R32_HISTORICAL_PROBE',sourceCount:3,verified,results,
  pcCacheWritten:false,scoreLedgerModified:false,d1Written:false,
  schedulerModified:false,translationModified:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--probe'){
  console.error(JSON.stringify({status:'STOP_R32_PROBE_MODE_INVALID'}));process.exitCode=2;
 }else{
  try{
   const project=resolvePcProject();
   const filename=path.join(project,'scripts','iran-progress','news-display-article-audit-r25.mjs');
   const {inspectIranArticleR25}=await import(pathToFileURL(filename).href);
   const result=await probeR32Historical({inspector:inspectIranArticleR25});
   console.log(JSON.stringify(result));
   if(result.verified!==3)process.exitCode=1;
  }catch(error){console.error(JSON.stringify({status:'STOP_R32_DIRECT_PROBE',
   reason:/^R32_[A-Z0-9_]+$/.test(error?.message)?error.message:'R32_UNCLASSIFIED_FAILURE',
   pcCacheWritten:false,d1Written:false,schedulerModified:false}));process.exitCode=2;}
 }
}
