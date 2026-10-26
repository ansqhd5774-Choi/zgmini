// Standalone read-only projection of the expanded official release parser over PC-stored inputs.
// Does not collect from providers, change a DB, schedule work, recalculate market scores or publish.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {parseReleaseCalendar,RELEASE_SOURCES} from '../../lib/release-calendar.mjs';

const sourceIds=Object.keys(RELEASE_SOURCES);
const safeTime=value=>{
 const ms=typeof value==='number'?value:Date.parse(value);
 return Number.isFinite(ms)&&ms>0?new Date(ms).toISOString():null;
};
const safeCode=value=>typeof value==='string'&&/^[A-Za-z0-9_.:-]{1,80}$/.test(value)?value:'UNKNOWN';
const countBySource=events=>Object.fromEntries(sourceIds.map(id=>[id,events.filter(item=>item.source===id).length]));
const digest=events=>createHash('sha256').update(events.map(e=>JSON.stringify([e.source,e.id,e.date,e.title,e.sourceUrl])).sort().join('\n')).digest('hex');

export function projectFromSavedDb(file){
 if(!fs.existsSync(file))return {status:'LOCAL_DB_MISSING'};
 let db;
 try{
  db=new DatabaseSync(file,{readOnly:true});
  const output=db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key='release-calendar' AND snapshot_key='current'").get();
  const existing=output?JSON.parse(output.body):null;
  const oldEvents=Array.isArray(existing?.events)?existing.events:[];
  const original={status:safeCode(existing?.status),storedAt:safeTime(output?.stored_at),updatedAt:safeTime(existing?.updatedAt),count:oldEvents.length,bySource:countBySource(oldEvents),hash:digest(oldEvents)};
  const sources={},candidate=[];
  for(const id of sourceIds){
   const row=db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='input' AND feed_key=? AND snapshot_key='current'").get(`release-calendar:${id}`);
   if(!row){sources[id]={status:'SAVED_INPUT_MISSING'};continue;}
   try{
    const body=JSON.parse(row.body);
    if(typeof body?.text!=='string')throw Error('STORED_TEXT_MISSING');
    const rows=parseReleaseCalendar(body.text,id);
    sources[id]={status:'PARSED',storedAt:safeTime(row.stored_at),count:rows.length,uniqueIds:new Set(rows.map(e=>e.id)).size};
    candidate.push(...rows);
   }catch(error){sources[id]={status:'PARSE_FAILED',code:safeCode(error?.message)};}
  }
  const complete=sourceIds.every(id=>sources[id].status==='PARSED');
  const beforeKeys=new Set(oldEvents.map(e=>JSON.stringify([e.source,e.id,e.date])));
  const candidateKeys=new Set(candidate.map(e=>JSON.stringify([e.source,e.id,e.date])));
  const newlyIdentified=[...candidateKeys].filter(key=>!beforeKeys.has(key)).length;
  const previouslyOnly=[...beforeKeys].filter(key=>!candidateKeys.has(key)).length;
  return {status:complete?'FULL_SHADOW':'PARTIAL_SHADOW',readMode:'SQLITE_READ_ONLY',sourcePolicy:'EXISTING_BLS_BEA_FED_CENSUS_ONLY',original,sources,candidate:{count:candidate.length,bySource:countBySource(candidate),hash:digest(candidate),duplicateKeys:candidate.length-candidateKeys.size,newlyIdentified,previouslyOnly,delta:candidate.length-oldEvents.length},gate:complete?'CANDIDATE_NOT_PUBLISHED':'INCOMPLETE_NO_COMPARE'};
 }catch(error){return {status:'DB_READ_FAILED',code:safeCode(error?.code)};}
 finally{try{db?.close();}catch{}}
}

export function runShadow({base=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`}={}){
 const parserFile=fileURLToPath(new URL('../../lib/release-calendar.mjs',import.meta.url));
 const parserSha256=createHash('sha256').update(fs.readFileSync(parserFile)).digest('hex');
 return {audit:'MARKET_CALENDAR_R7_SAVED_RAW_SHADOW',ranAt:new Date().toISOString(),policy:'READ_ONLY_NO_PROVIDER_CALLS_NO_PUBLISH',parserSha256,...projectFromSavedDb(path.join(base,'storage','core.sqlite'))};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output){console.error('MISSING_OUTPUT_PATH');process.exitCode=2;}
 else{
  const report=runShadow();
  try{fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',flag:'w'});console.log('READONLY_SHADOW_REPORT_WRITTEN');}
  catch{console.error('REPORT_WRITE_FAILED');process.exitCode=2;}
 }
}
