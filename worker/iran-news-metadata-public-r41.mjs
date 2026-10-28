// Metadata-only R41 API reader: never reads/writes the GOV.UK R1 snapshot key.
import {IRAN_NEWS_METADATA_VERSION_R41,visibleIranMetadataRowsR41,
 IRAN_NEWS_METADATA_SOURCE_IDS_R41} from '../lib/iran-progress/news-metadata-r41.mjs';
import {kstNewsDay} from '../lib/iran-progress/news-display-r1.mjs';

const headers={'cache-control':'no-store','content-type':'application/json; charset=utf-8'};
export const IRAN_NEWS_R41_SELECT=`SELECT article_id,source_id,source,source_url,title,
 published_at,body_verified,keywords_verified,checked_at
 FROM iran_news_article_metadata_r41 ORDER BY published_at DESC,article_id LIMIT 250`;

/** @param {Request} request @param {{db?: any,now?: number}} options */
export async function storedIranNewsMetadataR41Response(request,{db,now=Date.now()}={}){
 if(request.method!=='GET')
  return Response.json({status:'UNAVAILABLE',reason:'METHOD_NOT_ALLOWED',items:[]},{status:405,headers});
 if(!db)return Response.json({status:'UNAVAILABLE',reason:'R41_DATABASE_UNAVAILABLE',items:[]},
  {status:503,headers});
 let raw;
 try{raw=await db.prepare(IRAN_NEWS_R41_SELECT).all();}
 catch{return Response.json({status:'UNAVAILABLE',reason:'R41_SCHEMA_OR_READ_UNAVAILABLE',items:[]},
  {status:503,headers});}
 const rows=(raw?.results??[]).map(row=>({
  articleId:row.article_id,sourceId:row.source_id,source:row.source,
  sourceUrl:row.source_url,title:row.title,publishedAt:row.published_at,
  bodyVerified:Number(row.body_verified)===1,
  twoStageKeywordsVerified:Number(row.keywords_verified)===1,
  checkedAt:Number(row.checked_at),
 }));
 const visible=visibleIranMetadataRowsR41(rows,{now,days:14});
 const sourcesWithArticles=new Set(visible.map(item=>item.sourceId));
 const allSeven=IRAN_NEWS_METADATA_SOURCE_IDS_R41.every(id=>sourcesWithArticles.has(id));
 const payload={version:IRAN_NEWS_METADATA_VERSION_R41,
  status:!visible.length?'PENDING':allSeven?'READY':'PARTIAL',
  asOfDate:kstNewsDay(now),displayDays:14,
  sourceCount:sourcesWithArticles.size,requiredSourceCount:7,
  itemCount:visible.length,
  items:visible.map(item=>({id:item.articleId,source:item.source,
   title:item.title,publishedAt:item.publishedAt,sourceUrl:item.sourceUrl})),
 };
 return Response.json(payload,{headers});
}
