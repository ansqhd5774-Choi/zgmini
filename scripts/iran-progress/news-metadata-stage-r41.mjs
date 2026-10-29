// R41: explicit, article-by-article D1 staging. No CLI D1 writes or automatic scheduling.
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {IRAN_NEWS_METADATA_SOURCE_IDS_R41,IRAN_NEWS_METADATA_SOURCES_R41,
 validIranMetadataRowR41} from '../../lib/iran-progress/news-metadata-r41.mjs';

const R41_ORIGINAL_SEVEN_SOURCES=Object.freeze(['tasnim','govuk','guardian-iran',
 'dw-world','bbc-middle-east','aljazeera','un-middle-east']);

export const IRAN_NEWS_R41_UPSERT_SQL=`INSERT INTO iran_news_article_metadata_r41
 (article_id,source_id,source,source_url,title,published_at,body_verified,
 keywords_verified,checked_at,stored_at)
 VALUES(?,?,?,?,?,?,1,1,?,?)
 ON CONFLICT(article_id) DO UPDATE SET
  source_id=excluded.source_id,source=excluded.source,
  source_url=excluded.source_url,title=excluded.title,
  published_at=excluded.published_at,body_verified=excluded.body_verified,
  keywords_verified=excluded.keywords_verified,
  checked_at=excluded.checked_at,stored_at=excluded.stored_at
 WHERE excluded.checked_at >= iran_news_article_metadata_r41.checked_at`;

export function prepareIranNewsMetadataR41(report,{now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||report?.version!=='IRAN_NEWS_FULL_AUDIT_R40'||
  report.status!=='CANDIDATES_INSPECTED_REVIEW_REQUIRED'||
  report.candidatesUninspected!==0||report.articleFailures!==0||
  report.sourceFeedsFailed!==0||!Array.isArray(report.articles)||
  report.candidatesInspected!==report.articles.length||
  !report.allSevenQualified14Days)throw Error('R41_EVIDENCE_NOT_COMPLETE');
 const checkedAt=Date.parse(report.checkedAt);
 if(!Number.isSafeInteger(checkedAt)||checkedAt>now||checkedAt<1)
  throw Error('R41_EVIDENCE_TIME_INVALID');
 const rows=[],seen=new Set();
 for(const item of report.articles){
  if(item.status!=='ARTICLE_METADATA_REVIEWED')continue;
  const articleId=createHash('sha256').update(item.sourceUrl).digest('hex');
  const source=IRAN_NEWS_METADATA_SOURCES_R41[item.sourceId]?.name;
  const row={articleId,sourceId:item.sourceId,source,sourceUrl:item.sourceUrl,
   title:item.title,publishedAt:item.publisherDeclaredPublishedAt,
   bodyVerified:item.bodyVerified,twoStageKeywordsVerified:item.twoStageKeywordsVerified,
   checkedAt};
  if(seen.has(articleId)||!validIranMetadataRowR41(row,{now}))
   throw Error('R41_QUALIFIED_ARTICLE_INVALID_OR_DUPLICATE');
  seen.add(articleId);rows.push(row);
 }
 if(rows.length!==report.qualified30Days||
  R41_ORIGINAL_SEVEN_SOURCES.some(id=>!rows.some(row=>row.sourceId===id)))
  throw Error('R41_QUALIFIED_COUNT_OR_SOURCE_MISMATCH');
 return rows.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.articleId.localeCompare(b.articleId));
}

// Upsert is monotone by checked_at, with one transaction per bounded D1 batch.
// On any error the caller must retain the partial state and safely retry; do not
// delete, replace or reset R1's public:iran-progress:news:iran:r1 snapshot.
export async function stageIranNewsMetadataR41(db,rows,{now=Date.now(),batchSize=20}={}){
 if(!db||typeof db.prepare!=='function'||typeof db.batch!=='function'||
  !Array.isArray(rows)||rows.length===0||rows.length>250||
  !Number.isSafeInteger(now)||!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>20||
  rows.some(row=>!validIranMetadataRowR41(row,{now}))||
  new Set(rows.map(row=>row.articleId)).size!==rows.length)
  throw Error('R41_STAGE_INPUT_INVALID');
 let batchesWritten=0;
 for(let i=0;i<rows.length;i+=batchSize){
  const chunk=rows.slice(i,i+batchSize);
  const statements=chunk.map(row=>db.prepare(IRAN_NEWS_R41_UPSERT_SQL).bind(
   row.articleId,row.sourceId,row.source,row.sourceUrl,row.title,row.publishedAt,
   row.checkedAt,now));
  await db.batch(statements);
  batchesWritten++;
  const placeholders=chunk.map(()=>'?').join(',');
  const sql=`SELECT article_id,source_url,body_verified,keywords_verified,checked_at
   FROM iran_news_article_metadata_r41 WHERE article_id IN (${placeholders})`;
  const readback=await db.prepare(sql).bind(...chunk.map(row=>row.articleId)).all();
  const actual=new Map((readback?.results??[]).map(row=>[row.article_id,row]));
  for(const expected of chunk){
   const row=actual.get(expected.articleId);
   if(!row||row.source_url!==expected.sourceUrl||Number(row.checked_at)<expected.checkedAt||
    Number(row.body_verified)!==1||Number(row.keywords_verified)!==1)
    throw Error('R41_STAGE_READBACK_MISMATCH');
  }
 }
 return {version:'IRAN_NEWS_R41_STAGE',status:'STAGED_READBACK_VERIFIED',
  rows:rows.length,batchesWritten,readbackVerified:rows.length,
  publicationTriggered:false,publicSnapshotModified:false,
  d1Written:true,scoreLedgerModified:false,queueModified:false,
  pcRunnerModified:false,schedulerModified:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--prepare-only')
  throw Error('R41_MANUAL_PREPARE_ONLY_REQUIRED');
 const raw=await readFile(new URL('../../docs/IRAN_NEWS_R40_FULL_AUDIT_20261029.json',import.meta.url),'utf8');
 const rows=prepareIranNewsMetadataR41(JSON.parse(raw));
 const target=new URL('../../docs/IRAN_NEWS_R41_STAGING_ROWS_20261029.json',import.meta.url);
 // Fail closed on re-run rather than overwriting previously reviewed evidence.
 await writeFile(target,`${JSON.stringify({version:'IRAN_NEWS_R41_STAGING_ROWS',rows},null,2)}\n`,{flag:'wx'});
 console.log(JSON.stringify({status:'STAGING_MANIFEST_PREPARED',rows:rows.length,
  d1Written:false,publicSnapshotModified:false,file:fileURLToPath(target)}));
}
