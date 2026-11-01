/** Read-only aggregate audit, never an attack coverage attestation.
 * Queries only selected JSON attributes of latest event revisions; no raw article text or URLs.
 */
const DAY=86400000;
const AXES=['IRN_USA','IRN_ISR','YEMEN_HOUTHI','LINKED','UNCLASSIFIED'];
function blank(){return {verifiedRecentCount:0,verifiedPreviousCount:0,
 verifiedRecentSeverity:0,verifiedPreviousSeverity:0,pendingReviewCount:0,
 retractedCount:0,missingEventDateCount:0,invalidVerifiedCount:0};}
export function auditR4MilitaryWindow(db,asOf){
 if(!Number.isSafeInteger(asOf)||asOf<=0)return {status:'INVALID_AS_OF',axes:null,completeCoverageProven:false};
 let rows;
 try{
  rows=db.prepare(`SELECT
     json_extract(e.body,'$.axis') axis,
     json_extract(e.body,'$.status') status,
     json_extract(e.body,'$.eventAt') eventAt,
     json_extract(e.body,'$.severity') severity,
     json_extract(e.body,'$.occurrenceVerified') occurrenceVerified,
     json_extract(e.body,'$.actorVerified') actorVerified,
     json_extract(e.body,'$.connectionVerified') connectionVerified,
     json_extract(e.body,'$.severityVerified') severityVerified,
     e.verified_at verifiedAt
    FROM event_revisions e
    JOIN (SELECT event_id,MAX(revision) revision FROM event_revisions
      WHERE verified_at<=? GROUP BY event_id) last
      ON e.event_id=last.event_id AND e.revision=last.revision`).all(asOf);
 }catch{
  return {status:'EVENT_REVISION_SCHEMA_UNAVAILABLE',axes:null,completeCoverageProven:false};
 }
 const groups=Object.fromEntries(AXES.map(id=>[id,blank()]));
 const recentStart=asOf-7*DAY,priorStart=asOf-28*DAY;
 for(const e of rows){
  const a=AXES.includes(e.axis)?e.axis:'UNCLASSIFIED';
  const g=groups[a];
  if(e.status==='RETRACTED'){g.retractedCount++;continue;}
  if(e.status==='PENDING_REVIEW'){g.pendingReviewCount++;continue;}
  if(e.status!=='VERIFIED')continue;
  const valid=Number.isSafeInteger(e.eventAt)&&e.eventAt>0
   &&e.eventAt<=asOf&&[1,3,10].includes(e.severity)
   &&e.occurrenceVerified===1&&e.actorVerified===1&&e.connectionVerified===1&&e.severityVerified===1
   &&a!=='UNCLASSIFIED';
  if(!Number.isSafeInteger(e.eventAt)||e.eventAt<=0)g.missingEventDateCount++;
  if(!valid){g.invalidVerifiedCount++;continue;}
  if(e.eventAt>=recentStart&&e.eventAt<asOf){g.verifiedRecentCount++;g.verifiedRecentSeverity+=e.severity;}
  else if(e.eventAt>=priorStart&&e.eventAt<recentStart){
   g.verifiedPreviousCount++;g.verifiedPreviousSeverity+=e.severity;
  }
 }
 return {status:'EVENT_COUNTS_ONLY',asOf,axes:groups,latestRevisionCount:rows.length,
  completeCoverageProven:false,zeroEventsDoNotProvePeace:true,
  note:'This audit counts stored verified events only; source and 28-day observation coverage must be independently verified.'};
}
