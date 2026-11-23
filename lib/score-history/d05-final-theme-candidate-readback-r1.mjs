// D05 read-only: re-read existing immutable, already-computed paid THEME output.
// This is not a data collector, scorer, database writer or visitor GET handler.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {captureFinalScoreOutputs,finalScoreDailySnapshots} from './d05-final-score-output-events-r1.mjs';
import {validPaidThemeRecord} from '../../worker/theme-paid-contract.mjs';

const DAY=/^20\d{2}-\d{2}-\d{2}$/;
const NAME=/^theme-([a-f0-9]{64})\.json$/;
const MAX_BYTES=1_800_000,MAX_FILES=10_000,DAY_MS=86_400_000;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const validDay=value=>typeof value==='string'&&DAY.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const validTime=value=>Number.isSafeInteger(value)&&value>0&&
 Number.isFinite(new Date(value).getTime());
const fail=code=>{throw Error(code);};

function readCandidate(filePath,{now,fileSystem}){
 const name=path.basename(filePath),expected=NAME.exec(name)?.[1];
 if(!expected||!validTime(now))fail('D05_THEME_CANDIDATE_PATH_OR_CLOCK_INVALID');
 let bytes;
 try{bytes=fileSystem.readFileSync(filePath);}catch{fail('D05_THEME_CANDIDATE_UNAVAILABLE');}
 if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>MAX_BYTES)
  fail('D05_THEME_CANDIDATE_SIZE_INVALID');
 const bodySha256=hash(bytes);
 if(bodySha256!==expected)fail('D05_THEME_CANDIDATE_SHA_MISMATCH');
 let body;
 try{body=JSON.parse(bytes.toString('utf8'));}catch{fail('D05_THEME_CANDIDATE_JSON_INVALID');}
 if(!validPaidThemeRecord(body))fail('D05_THEME_FINAL_OUTPUT_NOT_APPROVED');
 const calculatedAtMs=Date.parse(body.updatedAt??'');
 if(!validTime(calculatedAtMs)||calculatedAtMs>now||
  new Date(calculatedAtMs).toISOString()!==body.updatedAt)
  fail('D05_THEME_CALCULATION_CLOCK_UNVERIFIED');
 // A confirmed score is never dated by the newer provisional market bar.
 if(body.observationDate>new Date(calculatedAtMs).toISOString().slice(0,10))
  fail('D05_THEME_CONFIRMED_DATE_IN_FUTURE');
 const events=captureFinalScoreOutputs({
  group:'theme',body,calculatedAt:body.updatedAt
 });
 if(!events.length||events.length!==body.themes.length||
  events.some(event=>event.phase!=='CONFIRMED'||
   event.asOfDate!==body.confirmedObservationDate))
  fail('D05_THEME_CONFIRMED_FINAL_OUTPUT_INVALID');
 return {body,bodySha256,calculatedAtMs,events};
}

export function readVerifiedPaidThemeFinalOutputs(
 {candidatePath,calculatedAtMs,now=Date.now(),fileSystem=fs}={}
){
 if(typeof candidatePath!=='string'||!validTime(calculatedAtMs)||
  !validTime(now)||calculatedAtMs>now)
  fail('D05_THEME_CALCULATION_CLOCK_INVALID');
 const receipt=readCandidate(candidatePath,{now,fileSystem});
 if(receipt.calculatedAtMs!==calculatedAtMs)
  fail('D05_THEME_CANDIDATE_CHECKPOINT_MISMATCH');
 const outputEventsSha256=hash(Buffer.from(JSON.stringify(
  receipt.events.map(event=>event.eventId).sort()
 )));
 return Object.freeze({
  status:'LOCAL_FINAL_THEME_OUTPUT_VERIFIED',
  calculatedAt:new Date(calculatedAtMs).toISOString(),
  confirmedObservationDate:receipt.body.observationDate,
  scoreCount:receipt.events.length,
  candidateBodySha256:receipt.bodySha256,
  outputEventsSha256
 });
}

// Offline PC read only, never used from public GET. One-year calendar selection
// from saved immutable *calculation receipts*, NOT reconstructed 252-day curves.
// A file budget overflow or invalid candidate is an incomplete result, not PASS.
export function readStoredPaidThemeFinalScoreDays(
 {directory,fromDay,toDay,now=Date.now(),fileSystem=fs}={}
){
 if(typeof directory!=='string'||!directory||
  !validDay(fromDay)||!validDay(toDay)||fromDay>toDay||
  (Date.parse(toDay+'T00:00:00Z')-Date.parse(fromDay+'T00:00:00Z'))/DAY_MS>370)
  fail('D05_THEME_DAILY_RANGE_INVALID');
 if(!validTime(now))fail('D05_THEME_CALCULATION_CLOCK_INVALID');
 let entries;
 try{entries=fileSystem.readdirSync(directory);}catch{
  fail('D05_THEME_CANDIDATE_DIRECTORY_UNAVAILABLE');
 }
 if(!Array.isArray(entries))fail('D05_THEME_CANDIDATE_DIRECTORY_INVALID');
 const names=entries.filter(name=>NAME.test(name)).sort();
 if(names.length>MAX_FILES)fail('D05_THEME_ARCHIVE_FILES_LIMIT_EXCEEDED');
 const daily=new Map(),byClock=new Map();
 let actualOutputEvents=0;
 for(const name of names){
  const {events}=readCandidate(path.join(directory,name),{now,fileSystem});
  actualOutputEvents+=events.length;
  for(const event of events){
   const clockKey=event.scoreId+'|'+event.calculatedAt;
   const oldClock=byClock.get(clockKey);
   if(oldClock&&oldClock!==event.eventId)
    fail('D05_THEME_SAME_CLOCK_CONFLICT');
   byClock.set(clockKey,event.eventId);
   if(event.calculatedDateKst<fromDay||event.calculatedDateKst>toDay)continue;
   const dailyKey=event.scoreId+'|'+event.calculatedDateKst;
   const old=daily.get(dailyKey);
   if(!old||old.calculatedAt<event.calculatedAt)daily.set(dailyKey,event);
  }
 }
 const points=finalScoreDailySnapshots([...daily.values()],{fromDay,toDay});
 return Object.freeze({status:'STORED_FINAL_THEME_DAILY_READONLY',
  candidateFiles:names.length,actualOutputEvents,
  dailyFinalScorePoints:points.length,points});
}
