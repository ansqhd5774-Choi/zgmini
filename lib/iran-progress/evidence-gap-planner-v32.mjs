/**
 * V32: pure research-only 42-day evidence-gap planner; not an R4 input contract.
 * Summaries and news warnings are candidate discovery, never complete day coverage.
 */
export const VERSION='IRAN_R4_42_DAY_COVERAGE_GAP_RESEARCH_V32';
export const R4_LANES=Object.freeze(['IRN_USA','IRN_ISR','YEMEN_HOUTHI','HORMUZ','RED_SEA']);
const DAY=86400000;
const TYPES=new Set(['OFFICIAL_WARNING','OFFICIAL_DAILY_SUMMARY','OFFICIAL_WEEKLY_SUMMARY',
  'OFFICIAL_ADVISORY','OFFICIAL_FRONT_STATEMENT']);
function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const t=Date.parse(s+'T00:00:00Z');
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===s;}
function dayNumber(x){return Date.parse(x+'T00:00:00Z')/DAY;}
function dayString(n){return new Date(n*DAY).toISOString().slice(0,10);}
function validUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&
 !u.port&&!['localhost','127.0.0.1'].includes(u.hostname);}catch{return false;}}
function intervals(dayNums){const chunks=[];for(const n of dayNums){
 const last=chunks.at(-1);
 if(last&&last.endNumber+1===n){last.endNumber=n;last.days++;}
 else chunks.push({startNumber:n,endNumber:n,days:1});
 }return chunks.map(x=>({from:dayString(x.startNumber),through:dayString(x.endNumber),days:x.days}));}
const allDays=(from,through)=>Array.from({length:dayNumber(through)-dayNumber(from)+1},
 (_,i)=>dayNumber(from)+i);
export function auditIranR4EvidenceGapsV32(records=[],{
 from='2026-09-07',through='2026-10-18',checkedOn='2026-10-19'}={}){
 if(!Array.isArray(records)||records.length>1000||!validDate(from)||!validDate(through)||
 !validDate(checkedOn)||from>through||through>checkedOn||dayNumber(through)-dayNumber(from)>91)
  throw Error('R4_V32_INPUT_INVALID');
 const days=allDays(from,through),hints=Object.fromEntries(R4_LANES.map(id=>[id,new Set()]));
 const docs=new Set(),kindCounts={};
 for(const r of records){
  if(!r||typeof r.id!=='string'||!/^[A-Z0-9_-]{4,100}$/.test(r.id)||docs.has(r.id)||
  !R4_LANES.includes(r.lane)||!TYPES.has(r.kind)||
  !validDate(r.documentDay)||r.documentDay>checkedOn||
  !validDate(r.claimFrom)||!validDate(r.claimThrough)||r.claimFrom>r.claimThrough||
  r.claimThrough>r.documentDay||!validUrl(r.sourceUrl)||
  (r.pcOriginalStoredDay!==null&&(!validDate(r.pcOriginalStoredDay)||
    r.pcOriginalStoredDay<r.documentDay||r.pcOriginalStoredDay>checkedOn))||
  r.independentFullCoverageVerified!==false||r.scoreEligible!==false||
  (r.kind==='OFFICIAL_WEEKLY_SUMMARY'&&dayNumber(r.claimThrough)-dayNumber(r.claimFrom)>7)||
  (r.kind==='OFFICIAL_DAILY_SUMMARY'&&r.claimFrom!==r.claimThrough))
    throw Error('R4_V32_EVIDENCE_INVALID');
  // UKMTO-only material cannot certify land/front military observation coverage.
  const ukmtoHost=new URL(r.sourceUrl).hostname.replace(/^www\./,'');
  if(ukmtoHost==='ukmto.org'&&!['HORMUZ','RED_SEA'].includes(r.lane))
    throw Error('R4_V32_SOURCE_SCOPE_INVALID');
  docs.add(r.id);kindCounts[r.kind]=(kindCounts[r.kind]??0)+1;
  // Coverage summaries only identify investigation candidates; they do not attest zero attacks.
  const s=Math.max(dayNumber(from),dayNumber(r.claimFrom));
  const e=Math.min(dayNumber(through),dayNumber(r.claimThrough));
  if(s<=e)for(let d=s;d<=e;d++)hints[r.lane].add(d);
 }
 const lanes=Object.fromEntries(R4_LANES.map(id=>{
  const candidates=[...hints[id]].sort((a,b)=>a-b);
  const without=days.filter(n=>!hints[id].has(n));
  return [id,{
   candidateDocumentDays:candidates.length,
   datesWithNoDocumentCandidate:without.length,
   candidateDateIntervals:intervals(candidates),
   missingCandidateDateIntervals:intervals(without),
   independentlyVerifiedCoverageDays:0,
   fullDayCompletenessVerified:false
  }];
 }));
 return {version:VERSION,status:'DISCOVERY_GAPS_NOT_R4_COVERAGE',
  period:{from,through,days:days.length},lanes,
  laneDaySlots:days.length*R4_LANES.length,
  laneDaySlotsWithCandidateDocuments:Object.values(lanes).reduce((n,x)=>n+x.candidateDocumentDays,0),
  laneDaySlotsWithoutCandidateDocuments:Object.values(lanes).reduce((n,x)=>n+x.datesWithNoDocumentCandidate,0),
  sourceCandidateCount:records.length,kindCounts,
  sparseWarningsNotProofOfZeroAttacks:true,
  websiteSayingZeroReportsNotProofOfZeroAttacks:true,
  latestRevisionCannotBeBackdated:true,
  pcOriginalReceiptMissingForAnySourceDoesNotBecomeAsOfEvidence:true,
  weeklySummaryDoesNotVerifyUnreportedIranFronts:true,
  fullCoverageProven:false,verifiedR4EventsPromoted:0,computedR4Days:0,score:null,
  noFetch:true,noWrite:true,productionReady:false};
}