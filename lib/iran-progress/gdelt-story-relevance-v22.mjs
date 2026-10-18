/** V22 GDELT story triage: pure research utility, no I/O, no verification or scoring. */
export const R4_V22_VERSION='IRAN_R4_GDELT_SEMANTIC_RESEARCH_V22';
const MODES=new Set(['REPORTED_COMBAT_NEEDS_PROOF','DEFENCE_POSTURE','DIPLOMATIC_STATEMENT',
 'THREAT_OR_EXPECTATION','EDITORIAL_RETROSPECTIVE','MULTI_EVENT_LIVEBLOG',
 'MILITARY_CAPABILITY','NOT_DIRECT_R4_INCIDENT','UNREVIEWED']);
const isDay=s=>{if(typeof s!=='string'||!/^\d{8}$/.test(s))return false;
 const p=s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8),t=Date.parse(p+'T00:00:00Z');
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===p;};
export const normalizeR4NewsURL=s=>{try{const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname==='localhost')return null;
 return 'https://'+u.hostname.toLowerCase().replace(/^www\./,'').replace(/^amp\./,'')+(u.pathname.replace(/\/$/,'')||'/');}catch{return null;}};
export function auditR4GdeltStoryV22(leads,reviews=[],{checkedOn='20261019'}={}){
 if(!Array.isArray(leads)||!Array.isArray(reviews)||leads.length>1000||reviews.length>1000||!isDay(checkedOn))throw Error('V22_INPUT_INVALID');
 const reviewed=new Map();
 for(const r of reviews){
  const u=normalizeR4NewsURL(r.url);
  if(!u||reviewed.has(u)||!MODES.has(r.disposition)||!isDay(r.reviewedOn)||r.reviewedOn>checkedOn
   ||typeof r.note!=='string'||r.note.length<8||r.r4Verified===true||r.scoreEligible===true||r.pcOriginalReceipt===true)
   throw Error('V22_REVIEW_INVALID');
  if(r.incidentDateCandidate!=null&&(!isDay(r.incidentDateCandidate)||r.incidentDateCandidate>r.reviewedOn
    ||r.disposition!=='REPORTED_COMBAT_NEEDS_PROOF'))throw Error('V22_EVENT_DAY_NOT_PROVEN');
  if(r.duplicateCluster!=null&&(!/^[A-Z0-9_]{4,80}$/.test(r.duplicateCluster)
    ||r.disposition!=='REPORTED_COMBAT_NEEDS_PROOF'))throw Error('V22_DUPLICATE_INVALID');
  reviewed.set(u,r);
 }
 const map=new Map();
 for(const row of leads){
  const u=normalizeR4NewsURL(row?.articleUrl);
  if(!u||row.r4Verified===true||row.scoreEligible===true||row.actorVerified===true
   ||!isDay(row.sqlDate)||!isDay(row.gdeltFirstSeenDate)||row.sqlDate>row.gdeltFirstSeenDate
   ||!['IRN_USA_CODE_PAIR','IRN_ISR_CODE_PAIR','YEM_SAU_CODE_PAIR_NOT_HOUTHI_PROOF'].includes(row.front)
   ||!['18','19','20'].includes(row.cameoRoot))throw Error('V22_GDELT_ROW_INVALID');
  const k=u+'|'+row.gdeltFirstSeenDate;
  if(!map.has(k))map.set(k,{url:u,firstSeen:row.gdeltFirstSeenDate,ids:new Set(),fronts:new Set(),sqlDays:new Set()});
  const m=map.get(k);m.ids.add(String(row.eventId));m.fronts.add(row.front);m.sqlDays.add(row.sqlDate);
 }
 const stories=[...map.values()].map(x=>{
  const r=reviewed.get(x.url);
  return {url:x.url,firstSeenDay:x.firstSeen,gdeltIds:x.ids.size,gdeltFrontHints:[...x.fronts].sort(),gdeltSqlDates:[...x.sqlDays].sort(),
   reviewedOn:r?.reviewedOn??null,disposition:r?.disposition??'UNREVIEWED',
   note:r?.note??'Source content not yet independently reviewed.',
   incidentDateCandidate:r?.incidentDateCandidate??null,duplicateCluster:r?.duplicateCluster??null,
   pcReceiptVerified:false,attackOccurrenceVerified:false,actorVerified:false,
   independentR4EventVerified:false,scoreEligible:false};
 }).sort((a,b)=>a.firstSeenDay.localeCompare(b.firstSeenDay)||a.url.localeCompare(b.url));
 const dispositions={};for(const x of stories)dispositions[x.disposition]=(dispositions[x.disposition]??0)+1;
 const possible=stories.filter(x=>x.disposition==='REPORTED_COMBAT_NEEDS_PROOF');
 return {version:R4_V22_VERSION,status:'STORY_REVIEW_NOT_EVENT_VERIFICATION',
  inputRows:leads.length,distinctNewsStories:stories.length,
  manuallyReviewedStories:stories.filter(x=>x.disposition!=='UNREVIEWED').length,
  dispositions,combatReportReviewLinks:possible.length,
  possibleDistinctCampaignClusters:new Set(possible.map(x=>x.duplicateCluster??x.url)).size,
  stories,verifiedR4Events:0,complete28DayCoverage:false,r4Score:null,r4ComputedDays:0,
  researchOnly:true,productionReady:false,dbWrites:0,
  note:'A reputable article and CAMEO pair cannot prove a direct attack, its actor, contemporaneous PC receipt, or 28-day coverage.'};
}