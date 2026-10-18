/** Fourteen-day, non-mutating diagnostic of ACTUAL PC SQLite.
 * Keeps per-calendar-day reporting, local verified events and full-R4 score separate.
 * Never calls providers, writes SQLite, changes TTL/scheduler or publishes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {auditR4FourteenDayResearch} from '../../lib/iran-progress/fourteen-day-evidence-r4.mjs';
import {calculateIranR4RealityShadow} from '../../lib/iran-progress/reality-shadow-r4.mjs';
import {auditR4MilitaryWindow} from './reality-event-window-r4.mjs';
const DAY=86400000;
const DB='E:\\ZGmini\\data\\iran-progress-r13\\iran.sqlite';
const dateMs=date=>Date.parse(date+'T00:00:00Z');
const safeJson=(db,key)=>{try{const r=db.prepare('SELECT body FROM checkpoints WHERE name=?').get(key);
 return r?JSON.parse(r.body):null;}catch{return null;}};
const AXES=['IRN_USA','IRN_ISR','YEMEN_HOUTHI','LINKED','UNCLASSIFIED'];
export function auditIranR4FourteenDayLocal(db,{now=Date.now(),through='2026-10-18'}={}){
 if(!Number.isSafeInteger(now)||now<=0||dateMs(through)>now)throw Error('R4_14D_ASOF_INVALID');
 const publicReview=auditR4FourteenDayResearch({asOfDate:through});
 const result=[];
 for(const day of publicReview.days){
  const start=dateMs(day.date),asOf=Math.min(now,start+DAY-1);
  const military=auditR4MilitaryWindow(db,asOf);
  const observed=Object.fromEntries(AXES.map(a=>[a,{verifiedThatDay:0,severityThatDay:0,
   pendingThatDay:0,unverifiedThatDay:0}]));
  let exactSource='EVENT_REVISION_SCHEMA_UNAVAILABLE';
  // Revision must have been verified by that date, not retroactively today.
  try{
   const rows=db.prepare(`SELECT json_extract(e.body,'$.axis') axis,
    json_extract(e.body,'$.status') status, json_extract(e.body,'$.eventAt') eventAt,
    json_extract(e.body,'$.severity') severity,
    json_extract(e.body,'$.occurrenceVerified') occurrenceVerified,
    json_extract(e.body,'$.actorVerified') actorVerified,
    json_extract(e.body,'$.connectionVerified') connectionVerified,
    json_extract(e.body,'$.severityVerified') severityVerified
    FROM event_revisions e JOIN
      (SELECT event_id,MAX(revision) revision FROM event_revisions WHERE verified_at<=?
       GROUP BY event_id) v ON e.event_id=v.event_id AND e.revision=v.revision
    WHERE json_extract(e.body,'$.eventAt')>=? AND json_extract(e.body,'$.eventAt')<=?`)
    .all(asOf,start,asOf);
   for(const row of rows){
    const group=observed[AXES.includes(row.axis)?row.axis:'UNCLASSIFIED'];
    if(row.status==='PENDING_REVIEW'){group.pendingThatDay++;continue;}
    if(row.status!=='VERIFIED')continue;
    if(Number.isSafeInteger(row.eventAt)&&[1,3,10].includes(row.severity)&&
      ['occurrenceVerified','actorVerified','connectionVerified','severityVerified']
        .every(k=>row[k]===1)&&row.axis!=='UNCLASSIFIED'){
     group.verifiedThatDay++;group.severityThatDay+=row.severity;
    }else group.unverifiedThatDay++;
   }
   exactSource='EVENT_REVISIONS_AS_OF_DATE';
  }catch{ /* Table absent/unsupported. Never invent zero to mean success. */ }
  const checkpoint=safeJson(db,'r4-shadow-verified-asof-v1:'+day.date);
  let score=null,scoreStatus='R4_VERIFIED_DAILY_CHECKPOINT_MISSING',phase=null;
  if(checkpoint){
   const asOfInput=checkpoint?.asOf,input=checkpoint?.input;
   if(Number.isSafeInteger(asOfInput)&&asOfInput>=start&&asOfInput<=asOf){
    const computed=calculateIranR4RealityShadow(input,asOfInput);
    scoreStatus=computed.status;
    if(computed.status==='SHADOW_READY'){score=computed.score;phase=computed.phase;}
   }else scoreStatus='R4_ASOF_CHECKPOINT_DATE_INVALID';
  }
  result.push({date:day.date,sourceResearch:day.classification,
   publicEvidenceSourceCount:day.knownOnDateSourceCount,
   pcEventRevisionStatus:exactSource,
   localVerifiedThatDay:exactSource==='EVENT_REVISIONS_AS_OF_DATE'?observed:null,
   military28DayCoverageProven:military.completeCoverageProven===true,
   r4Score:score,r4ScoreStatus:scoreStatus,phase,
   analystAnchorApplied:false,legacyR3SeedApplied:false,productionReady:false});
 }
 const complete=result.length===14&&result.every(r=>r.r4Score!==null&&r.military28DayCoverageProven);
 return {status:complete?'SHADOW_14D_OBSERVATION_AVAILABLE':'SHADOW_14D_PARTIAL',
   period:{from:'2026-10-05',through},daysChecked:result.length,
   dailyR4Scored:result.filter(r=>r.r4Score!==null).length,
   unscoredDays:result.filter(r=>r.r4Score===null).map(r=>r.date),
   missingDataIsNotZero:true,publicPublishedAtIsNotEventAt:true,
   pcSource:'APPROVED_IRAN_SQLITE_READ_ONLY',providerCalls:0,ollamaCalls:0,dbWrites:0,published:false,
   days:result};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!fs.existsSync(DB)) {console.log(JSON.stringify({status:'AUTOMATION_BLOCKED',reason:'PC_APPROVED_IRAN_SQLITE_NOT_FOUND',
  missing:'E_DRIVE',daysChecked:0}));process.exitCode=2;}
 else{
  let db;
  try{db=new DatabaseSync(DB,{readOnly:true});
   console.log(JSON.stringify(auditIranR4FourteenDayLocal(db)));
  }catch(e){console.log(JSON.stringify({status:'STATE_UNKNOWN',reason:e?.code??'R4_14D_READ_ERROR'}));process.exitCode=1;
  }finally{db?.close();}
 }
}
