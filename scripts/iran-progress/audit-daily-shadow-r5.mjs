/**
 * One-off READ ONLY R5 shadow replay of the existing PC SQLite evidence.
 * Does NOT collect, change R3/R4, write checkpoints, or access D1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {kstCalendarDate} from '../../lib/iran-progress/chart-history.mjs';
import {calculateIranDailyAnchorShadow} from '../../lib/iran-progress/daily-anchored-shadow-r5.mjs';
import {storedR3Candidates,resolveR3Events} from './operate-r3.mjs';

export function auditR5ReadOnly(file,{now=Date.now()}={}){
 if(!fs.existsSync(file))throw Error('R5_OPERATIONAL_DB_MISSING');
 const db=new DatabaseSync(file,{readOnly:true});
 try{
  db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=2000');
  const store={db,getCheckpoint(name){
   const row=db.prepare('SELECT body FROM checkpoints WHERE name=?').get(name);
   return row?JSON.parse(row.body):null;
  }};
  const asOfDate=kstCalendarDate(now);
  const collection=store.getCheckpoint('continuous-news-last-run-r3');
  const publication=store.getCheckpoint('reference-flow-publication-r3');
  const lastValid=store.getCheckpoint('reference-flow-last-valid-r3');
  const checkedAt=collection?.lastDiscoverySuccessAt??null;
  const age=Number.isSafeInteger(checkedAt)?now-checkedAt:null;
  const fresh=age!==null&&age>=0&&age<=86400000;
  const {accepted,held}=resolveR3Events(storedR3Candidates(store));
  const storedAt=new Map(),revisionCount=new Map();
  // source URL can have several immutable versions. The latest receipt time
  // must NOT masquerade as a newly discovered independent incident.
  // Select the earliest immutable stored_at, and hold revised URLs for review.
  for(const row of db.prepare("SELECT body,stored_at FROM sources WHERE id LIKE 'news-metadata:%' ORDER BY stored_at,id").all()){
   const saved=JSON.parse(row.body);
   if(typeof saved.sourceUrl!=='string')continue;
   const seen=storedAt.get(saved.sourceUrl);
   const at=Number(row.stored_at);
   if(Number.isSafeInteger(at)&&at>0&&(seen===undefined||at<seen))
    storedAt.set(saved.sourceUrl,at);
   revisionCount.set(saved.sourceUrl,(revisionCount.get(saved.sourceUrl)??0)+1);
  }
  const revisedSourceUrls=accepted.filter(e=>(revisionCount.get(e.sourceUrl)??0)>1).length;
  const sourceReceiptTimeMissing=accepted.filter(e=>!storedAt.has(e.sourceUrl)).length;
  const datedAccepted=accepted.map(e=>({...e,sourceStoredAt:storedAt.get(e.sourceUrl)}));
  const shadow=calculateIranDailyAnchorShadow(datedAccepted,{
   asOfDate,collectionCheckedAt:checkedAt,
   collectionStatus:collection?.status??'NOT_OBSERVED',
  });
  // Pure numeric summary, never print URLs, headlines, secrets or source bodies.
  return {
   mode:'PC_LOCAL_READ_ONLY_SHADOW',
   version:shadow.version,asOfDate,
   preliminaryScore:fresh&&shadow.status==='SHADOW_UNCALIBRATED'&&shadow.latePriorPublicationDateCount===0&&revisedSourceUrls===0&&sourceReceiptTimeMissing===0?shadow.score:null,
   shadowScoreAwaitingReview:shadow.latePriorPublicationDateCount>0?shadow.score:null,
   shadowScoreWhenDataStale:!fresh?shadow.score:null,
   anchorScore:shadow.anchorScore,anchorDate:shadow.anchorDate,
   realityAssessmentStatus:shadow.anchorEvidenceStatus,
   outcome:!fresh?'SHADOW_INPUT_STALE_OR_MISSING':shadow.latePriorPublicationDateCount||shadow.potentialCasualtyRevisionCount||revisedSourceUrls||sourceReceiptTimeMissing?'INDEPENDENT_INCIDENT_REVIEW_REQUIRED':'SHADOW_UNCALIBRATED',
   classifierVersion:lastValid?.classifierVersion??null,
   previousOperationalRawScore:lastValid?.score??null,
   lastPublicationStatus:publication?.status??null,
   lastR3AsOf:lastValid?.asOfDate??null,
   collectionStatus:collection?.status??null,
   checkedAt,collectionAgeMinutes:age!==null?Math.floor(age/60000):null,
   r3LifetimeEventCount:lastValid?.eventCount??null,
   r3PublishedProjectionCount:lastValid?.events?.length??null,
   r5BackcastWindowEventCount:shadow.history.reduce((n,p)=>n+p.reportedEvents,0),
   r5AvailableUniqueEventCount:shadow.eventCount,
   acceptedUnique:shadow.eventCount,heldPotentialDuplicates:held.length,
   revisedSourceUrls,sourceReceiptTimeMissing,
   anchorAssessedAt:shadow.anchorAssessedAt,postAnchorSameDayWeightedDelta:shadow.postAnchorSameDayWeightedDelta,
   latePriorPublicationDateCount:shadow.latePriorPublicationDateCount,
   potentialCasualtyRevisionCount:shadow.potentialCasualtyRevisionCount,
   dailyHistory:shadow.history.map(({date,value,reportedEvents,verifiedEvents,carried,adverseVeto,suppressedPositivePoints})=>({
    date,value,reportedEvents,verifiedEvents,carried,adverseVeto,suppressedPositivePoints,
   })),
   limitations:shadow.limitations,
   publisher:'DISABLED',dbWrite:'DISABLED',providerCalls:'DISABLED',
  };
 }finally{db.close();}
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const args=process.argv.slice(2);
 if(args.length>1||args.length===1&&!args[0].startsWith('--db='))
  throw Error('R5_ARGS_INVALID');
 const dbFile=args[0]?.slice(5)??path.join(process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13'),'iran.sqlite');
 console.log(JSON.stringify(auditR5ReadOnly(dbFile),null,2));
}
