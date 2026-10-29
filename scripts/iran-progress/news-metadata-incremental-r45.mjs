// R45: Convert verified new-source R25 metadata into additive R41 D1 rows.
// No CLI writes, no R1 snapshot access, no implicit network calls.
import {createHash} from 'node:crypto';
import {IRAN_NEWS_METADATA_SOURCES_R41,validIranMetadataRowR41}
 from '../../lib/iran-progress/news-metadata-r41.mjs';
import {stageIranNewsMetadataR41} from './news-metadata-stage-r41.mjs';

export const R45_INCREMENTAL_SOURCES=Object.freeze(['arabnews']);
// Reuters/AP are blocked; Anadolu needs a publisher-zoned original date.
// Expand only after their individual evidence and integration checks pass.

export function prepareIranNewsIncrementalR45(report,{now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||report?.version!=='IRAN_ARTICLE_DETAIL_AUDIT_R25'||
  report?.mode!=='READ_ONLY'||!Array.isArray(report.articles)||
  typeof report.checkedAt!=='string')throw Error('R45_EVIDENCE_INVALID');
 const checkedAt=Date.parse(report.checkedAt);
 if(!Number.isSafeInteger(checkedAt)||checkedAt<=0||checkedAt>now)
  throw Error('R45_EVIDENCE_TIME_INVALID');
 const rows=[],seen=new Set();
 for(const article of report.articles){
  if(!article||!R45_INCREMENTAL_SOURCES.includes(article.sourceId)||
   article.status!=='ARTICLE_METADATA_REVIEWED')continue;
  const spec=IRAN_NEWS_METADATA_SOURCES_R41[article.sourceId];
  const sourceUrl=article.sourceUrl;
  if(typeof sourceUrl!=='string')throw Error('R45_ARTICLE_URL_INVALID');
  const row={articleId:createHash('sha256').update(sourceUrl).digest('hex'),
   sourceId:article.sourceId,source:spec?.name,sourceUrl,
   title:article.originalTitle,
   publishedAt:article.publisherDeclaredPublishedAt,
   bodyVerified:article.articleBodyAccessible===true,
   twoStageKeywordsVerified:article.scopeVerifiedFromArticle===true,
   checkedAt};
  if(seen.has(row.articleId)||!validIranMetadataRowR41(row,{now}))
   throw Error('R45_VERIFIED_ARTICLE_INVALID_OR_DUPLICATE');
  seen.add(row.articleId);rows.push(row);
 }
 return rows.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.articleId.localeCompare(b.articleId));
}

/** Must be explicitly called by approved PC writer with its already configured
 * D1 adapter. Do not call for empty results and never delete prior rows.
 * On unknown D1 response, caller must read back before any retry. */
export async function stageIranNewsIncrementalR45(db,report,{now=Date.now()}={}){
 const rows=prepareIranNewsIncrementalR45(report,{now});
 if(!rows.length)return {version:'IRAN_NEWS_R45_INCREMENTAL',
  status:'NO_VERIFIED_NEW_SOURCE_ARTICLES',rows:0,d1Written:false,
  r1Modified:false,schedulerModified:false};
 const result=await stageIranNewsMetadataR41(db,rows,{now});
 return {version:'IRAN_NEWS_R45_INCREMENTAL',status:result.status,
  rows:result.rows,readbackVerified:result.readbackVerified,
  d1Written:result.d1Written,r1Modified:false,schedulerModified:false};
}
