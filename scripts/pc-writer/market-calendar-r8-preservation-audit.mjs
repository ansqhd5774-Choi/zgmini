// Read-only audit of the exact historical records missing from the expanded calendar.
// PC-saved inputs only: no provider calls, writes to SQLite, publication or task changes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {parseReleaseCalendar,RELEASE_SOURCES} from '../../lib/release-calendar.mjs';

const sources=Object.keys(RELEASE_SOURCES);
const key=item=>JSON.stringify([item.source,item.id,item.date]);
const cleanTitle=value=>String(value??'').normalize('NFKC').replace(/[\r\n\t]/g,' ').replace(/\s+/g,' ').trim().slice(0,150);
const titleKey=value=>cleanTitle(value).toLowerCase().replace(/[^a-z0-9]+/g,'');
const safeCode=value=>typeof value==='string'&&/^[A-Za-z0-9_.:-]{1,80}$/.test(value)?value:'UNKNOWN';
const safeEvent=item=>({source:safeCode(item.source),id:safeCode(item.id),date:/^\d{4}-\d{2}-\d{2}$/.test(item.date)?item.date:null,title:cleanTitle(item.title)});
const bySource=events=>Object.fromEntries(sources.map(source=>[source,events.filter(item=>item.source===source).length]));
const byYear=events=>Object.fromEntries([...new Set(events.map(item=>item.date.slice(0,4)))].sort().map(year=>[year,events.filter(item=>item.date.startsWith(year)).length]));

function missingReason(oldEvent,candidates){
 const sameSource=candidates.filter(item=>item.source===oldEvent.source);
 const sameDay=sameSource.filter(item=>item.date===oldEvent.date);
 const sameTitle=sameSource.filter(item=>titleKey(item.title)===titleKey(oldEvent.title));
 const sameDayTitle=sameDay.filter(item=>titleKey(item.title)===titleKey(oldEvent.title));
 const sameId=sameSource.filter(item=>item.id===oldEvent.id);
 const related=sameDayTitle.length?sameDayTitle:sameId.length?sameId:sameTitle.length?sameTitle:sameDay;
 let reason='NO_MATCH_IN_CURRENT_SAVED_INPUT';
 if(sameDayTitle.length)reason='SAME_DATE_TITLE_ID_CHANGED';
 else if(sameId.length)reason='SAME_ID_OTHER_DATE';
 else if(sameTitle.length)reason='SAME_TITLE_OTHER_DATE';
 else if(sameDay.length)reason='SAME_DATE_OTHER_RELEASE_ONLY';
 return {...safeEvent(oldEvent),reason,related:related.slice(0,5).map(safeEvent)};
}

export function auditSavedCalendar(file,{today=new Date(Date.now()+9*3600000).toISOString().slice(0,10)}={}){
 if(!fs.existsSync(file))return {status:'LOCAL_DB_MISSING'};
 let db;
 try{
  db=new DatabaseSync(file,{readOnly:true});
  const row=db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key='release-calendar' AND snapshot_key='current'").get();
  if(!row)return {status:'SAVED_OUTPUT_MISSING'};
  const previous=JSON.parse(row.body);
  if(!Array.isArray(previous?.events))return {status:'SAVED_OUTPUT_INVALID'};
  const original=previous.events;
  const inputs={},candidate=[];
  for(const source of sources){
   const input=db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='input' AND feed_key=? AND snapshot_key='current'").get(`release-calendar:${source}`);
   if(!input){inputs[source]='SAVED_INPUT_MISSING';continue;}
   try{
    const parsed=JSON.parse(input.body);
    if(typeof parsed?.text!=='string')throw Error('STORED_TEXT_MISSING');
    candidate.push(...parseReleaseCalendar(parsed.text,source));
    inputs[source]='PARSED';
   }catch{inputs[source]='PARSE_FAILED';}
  }
  if(sources.some(source=>inputs[source]!=='PARSED'))return {status:'PARTIAL_NO_COMPARE',inputs,gate:'NO_CHANGES_ALLOWED'};
  const originalKeys=new Set(original.map(key));
  const candidateKeys=new Set(candidate.map(key));
  const notPreserved=original.filter(item=>!candidateKeys.has(key(item))).map(item=>missingReason(item,candidate));
  const newEvents=candidate.filter(item=>!originalKeys.has(key(item)));
  const next90=new Date(Date.parse(today+'T00:00:00Z')+90*86400000).toISOString().slice(0,10);
  const upcoming=events=>events.filter(item=>item.date>=today&&item.date<next90);
  const dates=candidate.map(item=>item.date).sort();
  return {
   status:'FULL_AUDIT',readMode:'SQLITE_READ_ONLY',sourcePolicy:'EXISTING_BLS_BEA_FED_CENSUS_ONLY',
   inputs,comparison:{today,upcomingEndExclusive:next90,
    originalCount:original.length,candidateCount:candidate.length,originalDuplicateKeys:original.length-originalKeys.size,
    candidateDuplicateKeys:candidate.length-candidateKeys.size,
    originalBySource:bySource(original),candidateBySource:bySource(candidate),
    candidateByYear:byYear(candidate),candidateDateSpan:{first:dates[0]??null,last:dates.at(-1)??null},
    next90Days:{original:upcoming(original).length,candidate:upcoming(candidate).length,new:upcoming(newEvents).length,newBySource:bySource(upcoming(newEvents))},
    newlyIdentified:newEvents.length,notPreservedCount:notPreserved.length,notPreserved,
   },gate:notPreserved.length?'REVIEW_EXISTING_EVENT_PRESERVATION':'NO_EXISTING_KEYS_LOST',
  };
 }catch(error){return {status:'DB_READ_FAILED',code:safeCode(error?.code)};}
 finally{try{db?.close();}catch{}}
}

export function runAudit({base=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`}={}){
 const parserPath=fileURLToPath(new URL('../../lib/release-calendar.mjs',import.meta.url));
 return {
  audit:'MARKET_CALENDAR_R8_PRESERVATION_AUDIT',ranAt:new Date().toISOString(),
  policy:'READ_ONLY_NO_PROVIDER_CALLS_NO_PUBLISH',
  parserSha256:createHash('sha256').update(fs.readFileSync(parserPath)).digest('hex'),
  ...auditSavedCalendar(path.join(base,'storage','core.sqlite')),
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output){console.error('MISSING_OUTPUT_PATH');process.exitCode=2;}
 else{
  try{fs.writeFileSync(output,JSON.stringify(runAudit(),null,2)+'\n',{encoding:'utf8',flag:'w'});console.log('READONLY_AUDIT_REPORT_WRITTEN');}
  catch{console.error('REPORT_WRITE_FAILED');process.exitCode=2;}
 }
}
