/** R4 evidence research gate: no IO, no scoring, no automatic promotion. */
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const url=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.origin+u.pathname.replace(/\/$/,''):null;}catch{return null;}};
const types=new Set(['OFFICIAL_INCIDENT','INDEPENDENT_REPORT','ADVISORY','WAR_PHASE','THREAT','DIPLOMACY','EDITORIAL','UNKNOWN']);
export function auditR4EvidenceCandidateBundles(records,{start='2026-09-07',end='2026-10-18'}={}){
 if(!Array.isArray(records)||records.length>1000||!date(start)||!date(end)||end<start)throw Error('R4_V23_INPUT_INVALID');
 const ids=new Set(),bundles=new Map(),rejected=[];
 for(const r of records){
  if(!r||typeof r.id!=='string'||ids.has(r.id)||!types.has(r.kind)||!date(r.reportDay)||
   r.eventDay!==null&&(!date(r.eventDay)||r.eventDay>r.reportDay)||
   r.pcStoredDay!==null&&(!date(r.pcStoredDay)||r.pcStoredDay<r.reportDay)||
   !url(r.sourceUrl)||typeof r.incidentKey!=='string'||!r.incidentKey||
   r.verified===true||r.scoreEligible===true)throw Error('R4_V23_RECORD_INVALID');
  ids.add(r.id);
  const key=r.incidentKey,group=bundles.get(key)??{key,sourceIds:[],sourceUrls:new Set(),reportDays:new Set(),
   eventDays:new Set(),pcStoredDays:new Set(),kinds:new Set()};
  group.sourceIds.push(r.id);group.sourceUrls.add(url(r.sourceUrl));group.reportDays.add(r.reportDay);
  if(r.eventDay)group.eventDays.add(r.eventDay);if(r.pcStoredDay)group.pcStoredDays.add(r.pcStoredDay);
  group.kinds.add(r.kind);bundles.set(key,group);
 }
 const cases=[...bundles.values()].map(x=>{
  const eventDay=x.eventDays.size===1?[...x.eventDays][0]:null;
  const conflictingEventDays=x.eventDays.size>1;
  const firstPublished=[...x.reportDays].sort()[0],firstPcStored=[...x.pcStoredDays].sort()[0]??null;
  const possibleCombat=[...x.kinds].some(k=>k==='OFFICIAL_INCIDENT'||k==='INDEPENDENT_REPORT');
  const onlyContext=[...x.kinds].every(k=>!['OFFICIAL_INCIDENT','INDEPENDENT_REPORT'].includes(k));
  return {incidentKey:x.key,sourceCount:x.sourceIds.length,distinctSourceUrls:x.sourceUrls.size,
   eventDateCandidate:eventDay,firstPublished,firstPcStored,conflictingEventDays,
   possibleCombat,onlyContext,sourceIds:x.sourceIds.sort(),
   contemporaneousPCReceiptProven:false,actorVerified:false,occurrenceVerified:false,
   duplicateResolutionVerified:false,independentVerifiedR4Event:false,scoreEligible:false,
   reportAfterCandidateEvent:eventDay!==null&&firstPublished>eventDay};
 }).sort((a,b)=>a.incidentKey.localeCompare(b.incidentKey));
 const bounds=cases.filter(x=>x.eventDateCandidate===null||x.eventDateCandidate<start||x.eventDateCandidate>end);
 return {version:'R4_V23_PROVENANCE_RESEARCH_V1',status:'REVIEW_ONLY',
  sourceRows:records.length,storyBundles:cases.length,possibleCombatBundles:cases.filter(x=>x.possibleCombat).length,
  outOfWindowOrUnknownDate:bounds.length,cases,
  verifiedR4Events:0,complete28DayCoverage:false,scoreDaysComputed:0,
  score:null,productionReady:false,noWrite:true,noFetch:true,
  note:'Equal incidentKey is a research hypothesis, not independently verified event identity or proof of 28-day front coverage.'};
}
