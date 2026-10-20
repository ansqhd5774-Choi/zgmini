/**
 * Versioned stored, provisional daily R5 output. Readers never compute events.
 * This is a USER-ACCEPTED 2026-10-21 13-point provisional baseline, NOT
 * a verified probability, confirmed peace assessment or complete war feed.
 */
import {R5_REFERENCE} from './daily-anchored-shadow-r5.mjs';
import {kstCalendarDate} from './chart-history.mjs';
import {validDate,CLASSIFIER_VERSION} from './reference-flow-r3.mjs';

export const IRAN_R5_PUBLIC_KEY='public:iran-progress:daily-anchored:r5';
export const IRAN_R5_PUBLIC_VERSION='IRAN_DAILY_PROVISIONAL_R5_1';
const DAY=86400000;
const finite=n=>Number.isFinite(n)&&n>=0&&n<=100;
const at=d=>Date.parse(d+'T00:00:00Z');
export function validateIranR5Public(b,now=Date.now()){
 if(b?.version!==IRAN_R5_PUBLIC_VERSION||b.status!=='PROVISIONAL'||
  b.sourceMethod!=='R5_21_OCT_13_K21'||
  b.anchorDate!==R5_REFERENCE.date||b.anchorScore!==R5_REFERENCE.score||
  b.anchorAssessedAt!==R5_REFERENCE.assessedAt||
  b.classifierVersion!==CLASSIFIER_VERSION||b.sensitivityScale!==21||
  b.probability!==false||b.calibrated!==false||
  b.completeEventCoverage!==false||b.verifiedWarState!==false||
  !validDate(b.asOfDate)||b.asOfDate>kstCalendarDate(now)||!finite(b.score)||
  !Number.isSafeInteger(b.collectionCheckedAt)||b.collectionCheckedAt<1||
  !Number.isSafeInteger(b.publishedAt)||b.publishedAt<1||
  b.collectionCheckedAt>b.publishedAt||b.publishedAt>now||
  now-b.collectionCheckedAt>86400000||
  !Number.isSafeInteger(b.acceptedEventCount)||b.acceptedEventCount<0||
  !Number.isSafeInteger(b.possibleDuplicateCount)||b.possibleDuplicateCount<0||
  !Array.isArray(b.history)||b.history.length!==14)return false;
 const end=at(b.asOfDate),start=end-13*DAY;
 if(b.history.some((p,i)=>
  !validDate(p?.date)||at(p.date)!==start+i*DAY||
  !finite(p.value)||typeof p.carried!=='boolean'||
  !Number.isSafeInteger(p.reportedEvents)||p.reportedEvents<0||
  !Number.isSafeInteger(p.verifiedEvents)||p.verifiedEvents<0||
  p.verifiedEvents>p.reportedEvents))return false;
 return b.history.at(-1).value===b.score;
}
export function buildIranR5Public(shadow,{now=Date.now(),classifierVersion=CLASSIFIER_VERSION,
 possibleDuplicateCount=0,collectionCheckedAt}={}){
 if(shadow?.status!=='SHADOW_UNCALIBRATED'||
  shadow.weightedPointScale!==21||shadow.anchorScore!==R5_REFERENCE.score||
  shadow.anchorDate!==R5_REFERENCE.date||shadow.latePriorPublicationDateCount!==0||
  shadow.potentialCasualtyRevisionCount!==0||
  !Number.isSafeInteger(collectionCheckedAt)||now-collectionCheckedAt>86400000||
  collectionCheckedAt>now||now<1)throw Error('R5_PUBLICATION_PRECHECK_FAILED');
 const body={
  version:IRAN_R5_PUBLIC_VERSION,status:'PROVISIONAL',
  sourceMethod:'R5_21_OCT_13_K21',
  anchorDate:shadow.anchorDate,anchorScore:shadow.anchorScore,
  anchorAssessedAt:shadow.anchorAssessedAt,
  asOfDate:shadow.asOfDate,score:shadow.score,
  history:shadow.history.map(p=>({
   date:p.date,value:p.value,carried:p.carried,
   reportedEvents:p.reportedEvents,verifiedEvents:p.verifiedEvents,
  })),
  classifierVersion,sensitivityScale:21,
  acceptedEventCount:shadow.eventCount,possibleDuplicateCount,
  collectionCheckedAt,publishedAt:now,
  probability:false,calibrated:false,verifiedWarState:false,
  completeEventCoverage:false,
 };
 if(!validateIranR5Public(body,now))throw Error('R5_PUBLIC_CONTRACT_INVALID');
 return body;
}
