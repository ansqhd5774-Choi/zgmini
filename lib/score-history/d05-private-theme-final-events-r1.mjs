// D05 private paid-theme final scores: immutable calculation receipts, not model history.
// Local only: no provider, database, public projection, or task changes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {captureFinalScoreOutputs,mergeFinalScoreEvents,finalScoreDailySnapshots}
 from './d05-final-score-output-events-r1.mjs';

export const PRIVATE_EVENT_SCHEMA='ZGMINI_D05_PRIVATE_THEME_FINAL_EVENTS_R1';
const SHA=/^[a-f0-9]{64}$/;
const NAME=/^d05-private-final-theme-([a-f0-9]{64})\.json$/;
const MAX_SOURCE=8*1024*1024,MAX_EVENT=128*1024;
const sha=b=>createHash('sha256').update(b).digest('hex');
const require_= (ok,code)=>{if(!ok)throw Error(code)};
const validDay=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\d$/.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&
 new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const validClock=x=>Number.isSafeInteger(x)&&x>0&&Number.isFinite(new Date(x).getTime());
function readHashed(file,expected,limit,fileSystem){
 const bytes=fileSystem.readFileSync(file);
 require_(Buffer.isBuffer(bytes)&&bytes.length>=2&&bytes.length<=limit,
  'D05_PRIVATE_FILE_SIZE_INVALID');
 require_(sha(bytes)===expected,'D05_PRIVATE_FILE_SHA_MISMATCH');
 try{return JSON.parse(bytes.toString('utf8'))}
 catch{throw Error('D05_PRIVATE_FILE_JSON_INVALID')}
}
function validatedEvents(body){
 require_(body?.schema===PRIVATE_EVENT_SCHEMA&&SHA.test(body.privateBodySha256??'')&&
  SHA.test(body.sourceVersion??'')&&SHA.test(body.registrySha256??'')&&
  validDay(body.confirmedObservationDate)&&
  typeof body.calculatedAt==='string'&&
  Number.isFinite(Date.parse(body.calculatedAt))&&
  new Date(body.calculatedAt).toISOString()===body.calculatedAt&&
  Array.isArray(body.events)&&body.events.length>0&&body.events.length<=256,
  'D05_PRIVATE_EVENT_ENVELOPE_INVALID');
 const events=mergeFinalScoreEvents([],body.events);
 require_(events.length===body.events.length&&events.every(e=>
  e.scoreId.startsWith('theme:')&&e.phase==='CONFIRMED'&&
  e.calculatedAt===body.calculatedAt&&e.asOfDate===body.confirmedObservationDate),
  'D05_PRIVATE_EVENT_PAYLOAD_INVALID');
 return events;
}

/** The actual paid-cycle clock is the only source of calculatedAt. */
export function storeVerifiedPrivateThemeFinalEvents({
 directory,privateStored,sourceVersion,registrySha256,confirmedDate,
 calculatedAtMs,now=Date.now(),fileSystem=fs
}={}){
 require_(typeof directory==='string'&&path.isAbsolute(directory)&&
  privateStored?.status==='PRIVATE_STORED_READBACK_VERIFIED'&&
  Number.isInteger(privateStored.count)&&privateStored.count>0&&privateStored.count<=256&&
  SHA.test(privateStored.bodySha256??'')&&SHA.test(sourceVersion??'')&&
  SHA.test(registrySha256??'')&&validDay(confirmedDate)&&
  validClock(calculatedAtMs)&&validClock(now)&&calculatedAtMs<=now,
  'D05_PRIVATE_STORED_RECEIPT_INVALID');
 const filename=path.join(directory,'private-theme-'+privateStored.bodySha256+'.json');
 const source=readHashed(filename,privateStored.bodySha256,MAX_SOURCE,fileSystem);
 require_(source?.schema==='ZGMINI_PAID_PRIVATE_DERIVED_V1'&&
  source.sourceVersion===sourceVersion&&source.registrySha256===registrySha256&&
  source.confirmedDate===confirmedDate&&Array.isArray(source.themes)&&
  source.themes.length===privateStored.count&&source.themes.every(t=>
   t?.configured===true&&t.confirmedObservationDate===confirmedDate&&
   Array.isArray(t.history)&&t.history.length>0&&
   t.history.at(-1)?.date===confirmedDate&&t.history.at(-1)?.score===t.score),
  'D05_PRIVATE_SOURCE_MISMATCH');
 const calculatedAt=new Date(calculatedAtMs).toISOString();
 const events=captureFinalScoreOutputs({group:'theme',calculatedAt,
  body:{status:'READY',phase:'CONFIRMED',observationDate:confirmedDate,
   confirmedObservationDate:confirmedDate,themes:source.themes}});
 require_(events.length===source.themes.length&&
  events.every(e=>e.phase==='CONFIRMED'&&e.asOfDate===confirmedDate),
  'D05_PRIVATE_OUTPUT_INVALID');
 const envelope={schema:PRIVATE_EVENT_SCHEMA,
  privateBodySha256:privateStored.bodySha256,sourceVersion,registrySha256,
  confirmedObservationDate:confirmedDate,calculatedAt,events};
 validatedEvents(envelope);
 const bytes=Buffer.from(JSON.stringify(envelope));
 require_(bytes.length<=MAX_EVENT,'D05_PRIVATE_OUTPUT_BYTES_LIMIT');
 const fileSha=sha(bytes);
 const dest=path.join(directory,'d05-private-final-theme-'+fileSha+'.json');
 try{fileSystem.writeFileSync(dest,bytes,{flag:'wx'})}
 catch(e){if(e?.code!=='EEXIST')throw e}
 const after=fileSystem.readFileSync(dest);
 require_(Buffer.isBuffer(after)&&after.equals(bytes)&&sha(after)===fileSha,
  'D05_PRIVATE_OUTPUT_READBACK_MISMATCH');
 validatedEvents(readHashed(dest,fileSha,MAX_EVENT,fileSystem));
 return Object.freeze({status:'LOCAL_PRIVATE_FINAL_THEME_EVENTS_VERIFIED',
  calculatedAt,confirmedObservationDate:confirmedDate,
  scoreCount:events.length,privateBodySha256:privateStored.bodySha256,
  finalEventBodySha256:fileSha});
}

/** Private only. Does not turn price-model history[] into real calculation events. */
export function readStoredPrivateThemeFinalScoreDays({directory,fromDay,toDay,
 now=Date.now(),fileSystem=fs}={}){
 require_(typeof directory==='string'&&path.isAbsolute(directory)&&
  validDay(fromDay)&&validDay(toDay)&&fromDay<=toDay&&
  (Date.parse(toDay+'T00:00:00Z')-Date.parse(fromDay+'T00:00:00Z'))<=370*86400000&&
  validClock(now),'D05_PRIVATE_DATE_RANGE_INVALID');
 const names=fileSystem.readdirSync(directory).filter(n=>NAME.test(n)).sort();
 require_(names.length<=10000,'D05_PRIVATE_ARCHIVE_LIMIT');
 let all=[];
 for(const name of names){
  const data=readHashed(path.join(directory,name),NAME.exec(name)[1],MAX_EVENT,fileSystem);
  require_(Date.parse(data.calculatedAt)<=now,'D05_PRIVATE_FUTURE_EVENT');
  all=mergeFinalScoreEvents(all,validatedEvents(data));
 }
 const points=finalScoreDailySnapshots(all,{fromDay,toDay});
 return Object.freeze({status:'STORED_PRIVATE_FINAL_THEME_DAILY_READONLY',
  candidateFiles:names.length,actualOutputEvents:all.length,
  dailyFinalScorePoints:points.length,points});
}
