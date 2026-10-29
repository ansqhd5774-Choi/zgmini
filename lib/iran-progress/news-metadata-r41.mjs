// R41: metadata-only seven-source news. Separate from the GOV.UK-only R1 snapshot.
import {kstDayWindow,kstNewsDay,NEWS_PC_RETENTION_DAYS} from './news-display-r1.mjs';
import {iranNewsOffTopicReasonR1} from './news-offtopic-exclusions-r1.mjs';

export const IRAN_NEWS_METADATA_VERSION_R41='IRAN_NEWS_METADATA_R41';
export const IRAN_NEWS_METADATA_TABLE_R41='iran_news_article_metadata_r41';
export const IRAN_NEWS_METADATA_SOURCES_R41=Object.freeze({
 tasnim:Object.freeze({name:'Tasnim',hosts:['www.tasnimnews.ir']}),
 govuk:Object.freeze({name:'GOV.UK',hosts:['www.gov.uk']}),
 'guardian-iran':Object.freeze({name:'The Guardian',hosts:['www.theguardian.com']}),
 'dw-world':Object.freeze({name:'DW',hosts:['www.dw.com']}),
 'bbc-middle-east':Object.freeze({name:'BBC',hosts:['www.bbc.com','www.bbc.co.uk','www.bbci.co.uk']}),
 aljazeera:Object.freeze({name:'Al Jazeera',hosts:['www.aljazeera.com']}),
 'un-middle-east':Object.freeze({name:'UN News',hosts:['news.un.org']}),
 reuters:Object.freeze({name:'Reuters',hosts:['www.reuters.com']}),
 ap:Object.freeze({name:'AP',hosts:['apnews.com']}),
 arabnews:Object.freeze({name:'Arab News',hosts:['www.arabnews.com']}),
 anadolu:Object.freeze({name:'Anadolu Agency',hosts:['www.aa.com.tr','mobil.aa.com.tr']}),
});
export const IRAN_NEWS_METADATA_SOURCE_IDS_R41=Object.freeze(Object.keys(IRAN_NEWS_METADATA_SOURCES_R41));
const ID=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;

export function canonicalIranMetadataUrlR41(sourceId,raw){
 const spec=IRAN_NEWS_METADATA_SOURCES_R41[sourceId];
 if(!spec||typeof raw!=='string'||raw.length>2000)return null;
 try{
  const url=new URL(raw);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||
   !spec.hosts.includes(url.hostname))return null;
  // R24/R25 already strip tracking query arguments. Requiring exact URLs avoids
  // accidentally combining distinct article identities during a D1 upsert.
  if([...url.searchParams.keys()].some(key=>/^(?:utm_.+|at_medium|at_campaign|traffic_source)$/i.test(key)))
   return null;
  return url.href===raw?raw:null;
 }catch{return null;}
}

export function validIranMetadataRowR41(row,{now=Date.now(),days=NEWS_PC_RETENTION_DAYS}={}){
 if(!row||typeof row!=='object'||Array.isArray(row)||
  typeof row.articleId!=='string'||!ID.test(row.articleId)||
  !IRAN_NEWS_METADATA_SOURCES_R41[row.sourceId]||
  row.source!==IRAN_NEWS_METADATA_SOURCES_R41[row.sourceId].name||
  !canonicalIranMetadataUrlR41(row.sourceId,row.sourceUrl)||
  typeof row.title!=='string'||!row.title.trim()||row.title.length>500||
  typeof row.publishedAt!=='string'||!UTC.test(row.publishedAt)||
  !Number.isSafeInteger(Date.parse(row.publishedAt))||Date.parse(row.publishedAt)>now||
  row.bodyVerified!==true||row.twoStageKeywordsVerified!==true||
  !Number.isSafeInteger(row.checkedAt)||row.checkedAt<1||row.checkedAt>now)return false;
 const {start,end}=kstDayWindow(now,days);
 const key=kstNewsDay(Date.parse(row.publishedAt));
 return key>=start&&key<=end;
}

export function visibleIranMetadataRowsR41(rows,{now=Date.now(),days=14}={}){
 if(!Array.isArray(rows))throw Error('R41_ROWS_INVALID');
 const {start,end}=kstDayWindow(now,days),seen=new Set();
 return rows.filter(row=>{
  if(!validIranMetadataRowR41(row,{now,days:NEWS_PC_RETENTION_DAYS})||
   iranNewsOffTopicReasonR1(row.title))return false;
  const day=kstNewsDay(Date.parse(row.publishedAt));
  if(day<start||day>end||seen.has(row.articleId))return false;
  seen.add(row.articleId);return true;
 }).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.articleId.localeCompare(b.articleId));
}
