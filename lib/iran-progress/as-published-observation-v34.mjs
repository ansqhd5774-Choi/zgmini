/**
 * R3 MVP observation ledger: compare public API GET captures, never rewrite
 * retrospective article-date history as actual as-published measurements.
 * Pure read-only logic. No DB, API, writer, schedule, formula or Cloudflare work.
 */
export const R3_MVP_OBSERVATION_VERSION='IRAN_R3_MVP_AS_PUBLISHED_OBSERVATION_V34';
const VERSION='IRAN_REFERENCE_FLOW_R3';
const STATUSES=new Set(['REFERENCE','UPDATE_DELAYED']);
const DAY=86400000;
const isoDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const time=x=>Number.isSafeInteger(x)&&x>0;
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const validStr=x=>typeof x==='string'&&x.length>=1&&x.length<=128;
export function normalizeR3PublishedCaptureV34(api,{capturedAt}={}){
 if(!time(capturedAt)||!api||api.version!==VERSION||!STATUSES.has(api.status)||
  !score(api.score)||!time(api.publishedAt)||api.publishedAt>capturedAt||
  !time(api.collectionCheckedAt)||api.collectionCheckedAt>api.publishedAt||
  api.historyMode!=='RETROSPECTIVE_PUBLICATION_DATE'||!isoDay(api.asOfDate)||
  Date.parse(api.asOfDate+'T00:00:00Z')>capturedAt||
  !Array.isArray(api.history)||api.history.length>14||api.history.length===0||
  !api.history.every((p,i)=>isoDay(p?.date)&&score(p.value)&&
   (i===0||p.date>api.history[i-1].date)&&p.date<=api.asOfDate)||
  api.history.at(-1).value!==api.score||
  (api.lastSignalDate!=null&&!isoDay(api.lastSignalDate))||
  (api.newsCollection?.status!=null&&!validStr(api.newsCollection.status)))
  throw Error('R3_V34_PUBLIC_CAPTURE_INVALID');
 const lastSignalDate=api.lastSignalDate??null;
 return Object.freeze({method:VERSION,observedAt:capturedAt,score:api.score,
  status:api.status,publishedAt:api.publishedAt,collectionCheckedAt:api.collectionCheckedAt,
  articleAsOfDate:api.asOfDate,lastSignalDate,
  retrospectiveArticleChangePoints:api.history.length,
  // These are not past public publication measurements; only this captured row is.
  observedPublicSnapshot:true,derivedFromArticleTimeline:false});
}
function validCapture(c){return c&&c.method===VERSION&&time(c.observedAt)&&score(c.score)&&
 STATUSES.has(c.status)&&time(c.publishedAt)&&c.publishedAt<=c.observedAt&&
 time(c.collectionCheckedAt)&&c.collectionCheckedAt<=c.publishedAt&&isoDay(c.articleAsOfDate)&&
 time(Date.parse(c.articleAsOfDate+'T00:00:00Z'))&&c.retrospectiveArticleChangePoints>0&&
 Number.isInteger(c.retrospectiveArticleChangePoints)&&c.retrospectiveArticleChangePoints<=14&&
 c.observedPublicSnapshot===true&&c.derivedFromArticleTimeline===false;}
/** Does not mutate captures and does not create a storage contract. */
export function reviewR3MvpCapturesV34(captures,{now}={}){
 if(!Array.isArray(captures)||captures.length>366||!time(now))throw Error('R3_V34_REVIEW_INPUT_INVALID');
 const rows=[...captures];let previous=null,changes=0,publicationRefreshes=0;
 for(const x of rows){
  if(!validCapture(x)||x.observedAt>now||previous&&x.observedAt<=previous.observedAt)
   throw Error('R3_V34_OBSERVATION_INVALID_OR_UNSORTED');
  if(previous){
   if(x.publishedAt<previous.publishedAt)throw Error('R3_V34_PUBLICATION_TIMESTAMP_REGRESSION');
   if(x.publishedAt===previous.publishedAt&&x.score!==previous.score)
    throw Error('R3_V34_SAME_PUBLICATION_SCORE_CHANGED');
   if(x.publishedAt>previous.publishedAt){publicationRefreshes++;
    if(x.score!==previous.score)changes++;
   }
  }
  previous=x;
 }
 const last=rows.at(-1)??null,first=rows[0]??null;
 const daysObserved=new Set(rows.map(x=>new Date(x.observedAt+9*3600000).toISOString().slice(0,10))).size;
 return {version:R3_MVP_OBSERVATION_VERSION,
  status:!last?'NO_OBSERVATIONS':last.status==='UPDATE_DELAYED'||now-last.collectionCheckedAt>DAY?'COLLECTION_DELAYED':'OBSERVATIONS_READY',
  snapshotsObserved:rows.length,daysWithActualPublicCaptures:daysObserved,
  firstCapturedAt:first?.observedAt??null,lastCapturedAt:last?.observedAt??null,
  firstScore:first?.score??null,lastScore:last?.score??null,
  netObservedDelta:rows.length>=2?Number((last.score-first.score).toFixed(2)):null,
  actualObservedScoreChanges:changes,publicationRefreshes,
  articleDateHistoryMustNotBeInterpretedAsAsPublished:true,
  missingCapturedDaysDoNotMeanZero:true,
  method:VERSION,methodComparableAcrossCaptures:true,
  scoreFormulaUntouched:true,autoPublished:false,dbWrites:0,providerCalls:0};
}
