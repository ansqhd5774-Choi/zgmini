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
  const storedAt=new Map();
  // Source receipt first/updated storage time allows intraday anchor replay.
  // Read only; do not expose saved original article metadata.
  for(const row of db.prepare("SELECT body,stored_at FROM sources WHERE id LIKE 'news-metadata:%' ORDER BY stored_at,id").all()){
   const saved=JSON.parse(row.body);
   storedAt.set(saved.sourceUrl,Number(row.stored_at));
  }
  const datedAccepted=accepted.map(e=>({...e,sourceStoredAt:storedAt.get(e.sourceUrl)}));
  const shadow=calculateIranDailyAnchorShadow(datedAccepted,{
   asOfDate,collectionCheckedAt:checkedAt,
   collectionStatus:collection?.status??'NOT_OBSERVED',
  });
  // Pure numeric summary, never print URLs, headlines, secrets or source bodies.
  return {
   mode:'PC_LOCAL_READ_ONLY_SHADOW',
   version:shadow.version,asOfDate,
   preliminaryScore:fresh&&shadow.latePriorPublicationDateCount===0?shadow.score:null,
   shadowScoreAwaitingReview:shadow.latePriorPublicationDateCount>0?shadow.score:null,
   shadowScoreWhenDataStale:!fresh?shadow.score:null,
   anchorScore:shadow.anchorScore,anchorDate:shadow.anchorDate,
   realityAssessmentStatus:shadow.anchorEvidenceStatus,
   outcome:!fresh?'SHADOW_INPUT_STALE_OR_MISSING':shadow.latePriorPublicationDateCount?'LATE_PRIOR_REPORTS_REVIEW_REQUIRED':'SHADOW_UNCALIBRATED',
   classifierVersion:lastValid?.classifierVersion??null,
   previousOperationalRawScore:lastValid?.score??null,
   lastPublicationStatus:publication?.status??null,
   lastR3AsOf:lastValid?.asOfDate??null,
   collectionStatus:collection?.status??null,
   checkedAt,collectionAgeMinutes:age!==null?Math.floor(age/60000):null,
   acceptedUnique:shadow.eventCount,heldPotentialDuplicates:held.length,
   anchorAssessedAt:shadow.anchorAssessedAt,postAnchorSameDayWeightedDelta:shadow.postAnchorSameDayWeightedDelta,
   latePriorPublicationDateCount:shadow.latePriorPublicationDateCount,
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
