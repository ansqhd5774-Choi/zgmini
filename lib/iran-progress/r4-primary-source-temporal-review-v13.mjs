/**
 * Public-primary-source research register only. Research now is NOT an
 * independently verified PC R4 event or a historical as-of-day receipt.
 * No provider calls, storage mutations, scores or publication.
 */
export const IRAN_R4_V13_VERSION='IRAN_R4_PRIMARY_SOURCE_TEMPORAL_REVIEW_V13';
const first='2026-10-05',last='2026-10-18',prior='2026-09-07',reviewDay='2026-10-19';
const DAY=86400000;
const DAY_TYPES=new Set(['INCIDENT_REPORT','PHASE_ASSESSMENT','MEDIATION_STATEMENT','ACTIVE_ADVISORY']);
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const dates=()=>Array.from({length:14},(_,i)=>new Date(Date.parse(first+'T00:00:00Z')+i*DAY).toISOString().slice(0,10));
const row=(id,kind,eventDate,publicationDate,url,statement,object,sourcePCStoredDay=null,actorClaim=null)=>({
 id,kind,eventDate,publicationDate,url,statement,object,sourcePCStoredDay,actorClaim,
 checkedByResearchOn:reviewDay,sourcePageChecked:true,
 independentlyVerifiedR4Event:false,sourceOriginalPcProof:false,
 incidentActorVerifiedForR4:false,scoreEligible:false
});
export const IRAN_R4_V13_PUBLIC_SOURCE_RECORDS=Object.freeze([
 row('QATAR_MEDIATION_1006','MEDIATION_STATEMENT','2026-10-06','2026-10-06',
  'https://mofa.gov.qa/en/qatar/latest-articles/latest-news/details/2026/10/06/foreign-ministry--mediation-efforts-between-washington-and-tehran-continue',
  'Qatar reported ongoing United States-Iran mediation; no ceasefire implementation established',null,'2026-10-08'),
 row('RIYADH_AIRPORT_FACILITIES_1008','INCIDENT_REPORT','2026-10-08','2026-10-09',
  'https://www.spa.gov.sa/en/w2697151','Saudi GACA reported attack on King Khalid International Airport facilities','RIYADH_AIRPORT_FACILITIES_1008'),
 row('RIYADH_SAUDIA_AIRCRAFT_1008','INCIDENT_REPORT','2026-10-08','2026-10-09',
  'https://www.spa.gov.sa/en/w2697151','Saudi GACA reported a second separate attack targeting a Saudia aircraft','SAUDIA_AIRCRAFT_1008'),
 row('YEMEN_WAR_PHASE_1009','PHASE_ASSESSMENT',null,'2026-10-09',
  'https://dppa.un.org/en/news/yemen-has-returned-to-full-scale-war-special-envoy-warns',
  'UN Special Envoy assessed Yemen returned to full-scale war over recent weeks; not a new attack on October 9',null),
 row('RIYADH_KKIA_STRIKE_1010','INCIDENT_REPORT','2026-10-10','2026-10-11',
  'https://dppa.un.org/en/news/these-attacks-must-cease-immediately-guterres-condemns-deadly-houthi-strike-on-riyadh',
  'UN October 11 report about deadly Riyadh airport attack condemned in statement late Saturday; do not double-count 11 October as new incident','RIYADH_KKIA_STRIKE_1010',null,'HOUTHI_REPORTED_BY_UN'),
 row('GFS_PRIDE_1013','INCIDENT_REPORT','2026-10-13','2026-10-14',
  'https://www.mpa.gov.sg/media-centre/details/two-singapore-registered-vessels-struck-in-strait-of-hormuz',
  'Singapore MPA reported GFS PRIDE struck October 13 and sunk; attacker not established','GFS_PRIDE'),
 row('GFS_GISELLE_1014','INCIDENT_REPORT','2026-10-14','2026-10-14',
  'https://www.mpa.gov.sg/media-centre/details/two-singapore-registered-vessels-struck-in-strait-of-hormuz',
  'Singapore MPA reported GFS GISELLE struck October 14, damaged and subsequently safe; not sunk','GFS_GISELLE'),
 row('MARAD_HORMUZ_2026_011','ACTIVE_ADVISORY',null,'2026-09-09',
  'https://www.maritime.dot.gov/msci/2026-011-persian-gulf-strait-hormuz-and-gulf-oman-iranian-attacks-commercial-vessels',
  'US MARAD advisory effective September 9 concerning Hormuz navigation risks; not a daily incident','HORMUZ_ADVISORY'),
 row('MARAD_REDSEA_2026_013','ACTIVE_ADVISORY',null,'2026-09-23',
  'https://www.maritime.dot.gov/msci/2026-013-red-sea-bab-el-mandeb-strait-gulf-aden-arabian-sea-and-somali-basin-houthi-attacks',
  'US MARAD advisory effective September 23 concerning Houthi Red Sea navigation risks; not a daily incident','RED_SEA_ADVISORY')
].map(r=>Object.freeze(r)));

function validateRecord(r){
 if(!r||typeof r.id!=='string'||!r.id||!DAY_TYPES.has(r.kind)||!validDate(r.publicationDate)||
 !validDate(r.checkedByResearchOn)||r.checkedByResearchOn<r.publicationDate||
 r.eventDate!==null&&(!validDate(r.eventDate)||r.eventDate>r.publicationDate)||
 r.sourcePCStoredDay!==null&&(!validDate(r.sourcePCStoredDay)||r.sourcePCStoredDay<r.publicationDate)||
 r.scoreEligible!==false||r.independentlyVerifiedR4Event!==false||r.sourceOriginalPcProof!==false||
 r.incidentActorVerifiedForR4!==false)
  throw Error('V13_SOURCE_RECORD_CONTRACT_INVALID');
 let url;try{url=new URL(r.url);}catch{throw Error('V13_SOURCE_URL_INVALID');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)throw Error('V13_SOURCE_URL_INVALID');
 if(r.kind==='INCIDENT_REPORT'&&(!r.eventDate||typeof r.object!=='string'||!r.object))
  throw Error('V13_INCIDENT_IDENTITY_REQUIRED');
 if(r.kind==='PHASE_ASSESSMENT'&&r.eventDate!==null)throw Error('V13_PHASE_CANNOT_BE_INCIDENT');
 if(r.kind==='ACTIVE_ADVISORY'&&r.eventDate!==null)throw Error('V13_ADVISORY_NOT_DAILY_INCIDENT');
 if(r.kind==='MEDIATION_STATEMENT'&&r.actorClaim!==null)throw Error('V13_MEDIATION_NOT_ATTACK_ACTOR');
}
export function buildR4PrimarySourceReview(records=IRAN_R4_V13_PUBLIC_SOURCE_RECORDS){
 if(!Array.isArray(records)||!records.length||records.length>500)throw Error('V13_SOURCE_SET_INVALID');
 const ids=new Set(),objects=new Set();
 for(const r of records){
  validateRecord(r);
  if(ids.has(r.id))throw Error('V13_DUPLICATE_CLAIM_ID');
  ids.add(r.id);
  if(r.kind==='INCIDENT_REPORT'){
   if(objects.has(r.object))throw Error('V13_DUPLICATE_INCIDENT_ID');
   objects.add(r.object);
  }
 }
 const history=dates().map(day=>{
  const incidentCandidates=records.filter(r=>r.kind==='INCIDENT_REPORT'&&r.eventDate===day);
  const sourceReportsPublished=records.filter(r=>r.publicationDate===day);
  const locallyDocumentedNotVerified=records.filter(r=>r.sourcePCStoredDay!==null&&r.sourcePCStoredDay<=day&&r.publicationDate<=day);
  return {day,incidentCandidates:incidentCandidates.map(r=>({id:r.id,
    publicationDate:r.publicationDate,latePublication:r.publicationDate>day,
    sourcePcStoredDay:r.sourcePCStoredDay,localEvidenceForR4Verified:false,
    incidentActorVerifiedForR4:false})),
   sourceReportsPublished:sourceReportsPublished.length,
   localReceiptCandidatesKnownByDay:locallyDocumentedNotVerified.length,
   independentlyVerifiedR4Events:0,full28DayCoverageVerified:false,
   r4Score:null,r4InputStatus:'MISSING_VERIFIED_CONTRACT'};
 });
 const late=records.filter(r=>r.eventDate&&r.publicationDate>r.eventDate);
 const unverifiedByPc=records.filter(r=>r.sourcePCStoredDay===null);
 return {version:IRAN_R4_V13_VERSION,status:'PUBLIC_SOURCE_CROSSCHECK_ONLY',
  asOfResearch:reviewDay,period:{start:first,end:last,requiredCoverageStart:prior,days:14},
  primarySourceClaims:records.length,incidentReportCandidates:records.filter(r=>r.kind==='INCIDENT_REPORT').length,
  phaseReports:records.filter(r=>r.kind==='PHASE_ASSESSMENT').length,
  diplomaticStatements:records.filter(r=>r.kind==='MEDIATION_STATEMENT').length,
  activeRiskAdvisories:records.filter(r=>r.kind==='ACTIVE_ADVISORY').length,
  latePublicationCount:late.length,
  pcSourceReceiptUnobserved:unverifiedByPc.length,
  claims:records.map(r=>({...r,sourcePageConfirmedAsOfResearchOnly:true})),
  history,independentlyVerifiedR4Events:0,fullyCoveredR4Dates:0,r4ScoresComputed:0,
  trialOnly:true,productionReady:false,published:false,
  caveat:'PUBLIC SOURCE CLAIMS ARE NOT HISTORICAL PC-VERIFIED R4 EVENTS OR COMPLETE 28-DAY SOURCE COVERAGE'};
}
