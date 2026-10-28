// R33: one-time local verification of two user-saved IAEA HTML pages.
// The pages are never fetched, copied into the project or published.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolvePcProject} from './news-display-upgrade-r32.mjs';

const MAX_HTML_BYTES=2_500_000;
const R32_ARTICLE_AUDITOR_SHA='99858d37a345a49e6c464427beeb61c1da0a5bd671f712b8817e774234dfc985';
const R32_MULTISOURCE_AUDITOR_SHA='740de7c1199af6bf46a52085f096d37032937ba69da8c42a6a56d32a7ff496e7';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const HISTORICAL_SOURCES=Object.freeze([
 {sourceId:'iaea-news',filename:'IAEA_NEWS.html',expectedDay:'2025-09-08',
  sourceUrl:'https://www.iaea.org/newscenter/news/restoring-iaea-inspections-in-iran-would-create-promising-ground-for-wider-progress-says-director-general-grossi'},
 {sourceId:'iaea-statements',filename:'IAEA_STATEMENT.html',expectedDay:'2025-06-22',
  sourceUrl:'https://www.iaea.org/newscenter/statements/iaea-director-general-grossis-statement-to-unsc-on-situation-in-iran-22-june-2025'},
]);

function checkedRegularBytes(filename){
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size===0||stat.size>MAX_HTML_BYTES)
  throw Error('R33_INPUT_FILE_UNSAFE');
 return fs.readFileSync(filename);
}

function hasExpectedCanonical(html,expectedUrl){
 // User-supplied HTML is not publisher-authenticated. Require the canonical
 // link as an additional identity check, not as proof of provenance.
 for(const tag of html.match(/<link\b[^>]*>/gi)??[]){
  if(!/\brel\s*=\s*["']canonical["']/i.test(tag))continue;
  const href=tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  if(href===expectedUrl)return true;
 }
 return false;
}

export function verifyR33SavedIaeaHtml({directory,inspector,now=Date.now()}={}){
 if(typeof directory!=='string'||!path.isAbsolute(directory)||
  !fs.statSync(directory).isDirectory()||typeof inspector!=='function'||
  !Number.isSafeInteger(now))throw Error('R33_OPTIONS_INVALID');
 const results=[];
 for(const source of HISTORICAL_SOURCES){
  let bytes;
  try{bytes=checkedRegularBytes(path.join(directory,source.filename));}
  catch(error){
   results.push({sourceId:source.sourceId,filename:source.filename,
    status:error?.code==='ENOENT'?'R33_SAVED_HTML_MISSING':'R33_INPUT_FILE_UNSAFE',
    manualHistoricalVerified:false});
   continue;
  }
  const digest=sha(bytes);
  let html;
  try{html=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');}
  catch{
   results.push({sourceId:source.sourceId,filename:source.filename,
    sha256:digest,status:'R33_HTML_NOT_UTF8',manualHistoricalVerified:false});
   continue;
  }
  if(!hasExpectedCanonical(html,source.sourceUrl)){
   results.push({sourceId:source.sourceId,filename:source.filename,
    sha256:digest,status:'R33_CANONICAL_UNVERIFIED',manualHistoricalVerified:false});
   continue;
  }
  let inspected;
  try{inspected=inspector({sourceId:source.sourceId,sourceUrl:source.sourceUrl},html,{now});}
  catch{inspected={status:'R33_INSPECTOR_ERROR'};}
  const validStatus=['ARTICLE_METADATA_REVIEWED','OUTSIDE_30_DAY_WINDOW']
   .includes(inspected.status);
  const publishedAt=inspected.publisherDeclaredPublishedAt??null;
  const manualHistoricalVerified=validStatus&&publishedAt?.slice(0,10)===source.expectedDay&&
   inspected.originalTitleVerified===true&&
   inspected.articleBodyAccessible===true&&inspected.scopeVerifiedFromArticle===true;
  results.push({sourceId:source.sourceId,filename:source.filename,
   sha256:digest,sourceUrl:source.sourceUrl,
   status:manualHistoricalVerified?'MANUAL_SAVED_HTML_REVIEWED':
    validStatus&&publishedAt?.slice(0,10)!==source.expectedDay?
     'R33_EXPECTED_PUBLICATION_DAY_MISMATCH':inspected.status,
   originalTitle:manualHistoricalVerified?inspected.originalTitle:null,
   publisherDate:publishedAt,within30DayWindow:inspected.withinRetentionWindow??null,
   articleBodyAccessible:inspected.articleBodyAccessible===true,
   bodyCharacterCount:inspected.bodyCharacterCount??0,
   manualHistoricalVerified,sourceProvenance:'USER_SAVED_BROWSER_HTML_NOT_INDEPENDENTLY_ATTESTED',
   rightsVerified:false,autoCollected:false});
 }
 const verified=results.filter(item=>item.manualHistoricalVerified).length;
 return {version:'IRAN_NEWS_R33_MANUAL_IAEA_HTML',
  status:verified===2?'PASS_R33_TWO_MANUAL_HISTORICAL_HTML_REVIEWED':
   'PARTIAL_R33_MANUAL_HISTORICAL_HTML_REVIEW',sourceCount:2,verified,results,
  automaticArticleCollectionVerified:false,pcCacheWritten:false,
  publicCacheModified:false,d1Written:false,scoreLedgerModified:false,
  schedulerModified:false,translationModified:false};
}

function pinnedPcInspector(projectRoot){
 const folder=path.join(projectRoot,'scripts','iran-progress');
 for(const [basename,expected] of [
  ['news-display-article-audit-r25.mjs',R32_ARTICLE_AUDITOR_SHA],
  ['news-display-multisource-audit-r24.mjs',R32_MULTISOURCE_AUDITOR_SHA],
 ]){
  const target=path.join(folder,basename);
  if(sha(checkedRegularBytes(target))!==expected)
   throw Error('R33_INSTALLED_R32_PARSER_DRIFT');
 }
 return path.join(folder,'news-display-article-audit-r25.mjs');
}

export const r33BundleRoot=(moduleUrl=import.meta.url)=>
 path.resolve(path.dirname(fileURLToPath(moduleUrl)),'..','..');

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--verify'){
  console.error('STOP_R33_EXPLICIT_VERIFY_MODE_REQUIRED');process.exitCode=2;
 }else{
  const root=r33BundleRoot(),log=path.join(root,'IRAN_NEWS_R33_MANUAL_IAEA_RESULT.txt');
  let report;
  try{
   const projectRoot=resolvePcProject();
   const file=pinnedPcInspector(projectRoot);
   const {inspectIranArticleR25}=await import(pathToFileURL(file).href);
   report=verifyR33SavedIaeaHtml({directory:root,inspector:inspectIranArticleR25});
  }catch(error){
   report={version:'IRAN_NEWS_R33_MANUAL_IAEA_HTML',status:'STOP_R33_READ_ONLY',
    reason:/^R3[23]_[A-Z0-9_]+$/.test(error?.message)?error.message:
     'R33_UNCLASSIFIED_FAILURE',automaticArticleCollectionVerified:false,
    pcCacheWritten:false,d1Written:false,schedulerModified:false};
  }
  try{
   fs.writeFileSync(log,'R33_MANUAL_IAEA_HTML_BEGIN\n'+JSON.stringify(report,null,2)+
    '\nFINAL_STATUS='+report.status+'\n',{flag:'wx'});
   console.log('RESULT_FILE=IRAN_NEWS_R33_MANUAL_IAEA_RESULT.txt');
   console.log('FINAL_STATUS='+report.status);
  }catch{
   console.error('STOP_R33_RESULT_FILE_EXISTS_OR_UNWRITABLE');process.exitCode=2;
  }
  if(!process.exitCode&&report.status!=='PASS_R33_TWO_MANUAL_HISTORICAL_HTML_REVIEWED')
   process.exitCode=1;
 }
}
