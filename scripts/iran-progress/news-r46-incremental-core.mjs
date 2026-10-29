// R46: pure preparation of *only* independently reviewed R45 news metadata.
// No PC file, provider API, D1, R1 snapshot, scheduler or score operations.
import {createHash} from 'node:crypto';

export const R46_APPROVED_INCREMENTAL_IDS=Object.freeze(['arabnews']);

export function prepareIranNewsIncrementalR46(report,{
 now=Date.now(),sourceSpecs,validateRow,allowedIds=R46_APPROVED_INCREMENTAL_IDS,
}={}){
 if(!Number.isSafeInteger(now)||!report||report.version!=='IRAN_NEWS_R45_FOUR_SOURCE_READ_ONLY'||
  typeof report.checkedAt!=='string'||!Array.isArray(report.sources)||
  !sourceSpecs||typeof sourceSpecs!=='object'||typeof validateRow!=='function'||
  !Array.isArray(allowedIds)||!allowedIds.length||
  allowedIds.some(id=>!R46_APPROVED_INCREMENTAL_IDS.includes(id))||
  new Set(allowedIds).size!==allowedIds.length)
  throw Error('R46_EVIDENCE_CONTRACT_INVALID');
 const checkedAt=Date.parse(report.checkedAt);
 if(!Number.isSafeInteger(checkedAt)||checkedAt<1||checkedAt>now)
  throw Error('R46_EVIDENCE_TIMESTAMP_INVALID');
 const reportSources=new Set();
 const rows=[],seen=new Set(),sources=[];
 for(const source of report.sources){
  if(!source||typeof source.sourceId!=='string'||reportSources.has(source.sourceId)||
   !Array.isArray(source.articles)||!Number.isInteger(source.articleVerified)||
   !Number.isInteger(source.eligible14Day))throw Error('R46_SOURCE_REPORT_INVALID');
  reportSources.add(source.sourceId);
  if(!allowedIds.includes(source.sourceId))continue;
  const passed=source.articles.filter(x=>x?.status==='ARTICLE_METADATA_REVIEWED');
  if(source.feedRead!==true||source.status!=='READ'||
   source.articleVerified!==passed.length||source.eligible14Day!==passed.length||
   source.errors!==0||passed.length===0)throw Error('R46_SOURCE_EVIDENCE_INCOMPLETE');
  const spec=sourceSpecs[source.sourceId];
  if(!spec||typeof spec.name!=='string'||!Array.isArray(spec.hosts))
   throw Error('R46_SOURCE_NOT_APPROVED');
  sources.push(source.sourceId);
  for(const article of passed){
   if(article.sourceId!==source.sourceId||typeof article.url!=='string'||
    typeof article.title!=='string'||!article.title.trim()||
    typeof article.publishedAt!=='string'||article.rightsVerified!==false||
    article.displayEligible!==false||
    !['PUBLISHER_EDITORIAL_BODY','PUBLISHER_JSONLD_ARTICLE_BODY',
     'SEMANTIC_ARTICLE_PARAGRAPHS'].includes(article.bodyEvidence)||
    article.dateEvidence!=='PUBLISHER_DECLARED_ZONED_DATE'||
    (article.bodyCharacterCount!==undefined&&
     (!Number.isSafeInteger(article.bodyCharacterCount)||article.bodyCharacterCount<=0)))
    throw Error('R46_ARTICLE_EVIDENCE_INVALID');
   const articleId=createHash('sha256').update(article.url).digest('hex');
   if(seen.has(articleId))throw Error('R46_DUPLICATE_ARTICLE');
   seen.add(articleId);
   const row={articleId,sourceId:source.sourceId,source:spec.name,
    sourceUrl:article.url,title:article.title,publishedAt:article.publishedAt,
    bodyVerified:true,twoStageKeywordsVerified:true,checkedAt};
   if(!validateRow(row,{now}))throw Error('R46_ROW_INVALID');
   rows.push(row);
  }
 }
 if(!sources.length)throw Error('R46_NO_VERIFIED_SOURCE');
 return {version:'IRAN_NEWS_R46_PREPARE',status:'PREPARED_NO_WRITE',sourceIds:sources,
  rows:rows.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.articleId.localeCompare(b.articleId)),
  d1Written:false,r1Modified:false,schedulerModified:false,scoreLedgerModified:false};
}
