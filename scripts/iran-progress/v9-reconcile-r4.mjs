/**
 * Reconcile a small public-source V8 CSV into *review candidates*, never
 * verified events or numerical R4 scores. No SQLite, provider or publication.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export const V9_VERSION='IRAN_R4_SOURCE_RECONCILIATION_V9';
const FIELDS=['day','front','event_date','first_public_report','description','validation_level','source_url','score_verified'];
const FRONTS=new Set(['MARITIME','IRN_USA_DIPLOMACY','YEMEN_HOUTHI','YEMEN_HOUTHI_CONTEXT']);
const LEVELS=new Set(['CONDITIONAL_SUPPORT','EVENT_DATE_UNRESOLVED','INCIDENT_REPORTED','INCIDENT_REPORTED_LATE','INDEPENDENT_INCIDENT_REPORT','OFFICIAL_INCIDENT','OFFICIAL_PHASE_ASSESSMENT','OFFICIAL_RETROSPECTIVE','OFFICIAL_STATEMENT']);
const NON_ATTACK=new Set(['CONDITIONAL_SUPPORT','OFFICIAL_PHASE_ASSESSMENT','OFFICIAL_STATEMENT']);
const START='2026-10-05',END='2026-10-18',DAY=86400000;
const dateOk=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const dates=()=>Array.from({length:14},(_,i)=>new Date(Date.parse(START+'T00:00:00Z')+i*DAY).toISOString().slice(0,10));
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,20);
function parseCSV(text){
 if(typeof text!=='string'||text.length>1000000)throw Error('V9_CSV_INPUT_INVALID');
 const s=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(quoted){
   if(c==='"'&&s[i+1]==='"'){cell+='"';i++;}
   else if(c==='"')quoted=false;else cell+=c;
  }else if(c==='"'){if(cell!=='')throw Error('V9_CSV_QUOTE_INVALID');quoted=true;}
  else if(c===','){row.push(cell);cell='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(quoted)throw Error('V9_CSV_UNTERMINATED_QUOTE');
 if(cell||row.length){row.push(cell);rows.push(row);}
 const header=rows.shift();
 if(!header||header.join(',')!==FIELDS.join(','))throw Error('V9_CSV_HEADER_INVALID');
 return rows.map(c=>{if(c.length!==FIELDS.length)throw Error('V9_CSV_FIELD_COUNT_INVALID');return Object.fromEntries(FIELDS.map((k,i)=>[k,c[i]]));});
}
function classify(x){
 if(x.validation_level==='CONDITIONAL_SUPPORT')return 'POLITICAL_SUPPORT_ONLY_NOT_COMBAT';
 if(x.validation_level==='OFFICIAL_PHASE_ASSESSMENT')return 'WAR_PHASE_REPORT_NOT_NEW_ATTACK';
 if(x.validation_level==='OFFICIAL_STATEMENT')return 'DIPLOMACY_ONLY_NOT_CEASEFIRE';
 if(x.validation_level==='EVENT_DATE_UNRESOLVED')return 'INCIDENT_DATE_UNKNOWN_NOT_DAY_EVENT';
 if(/#167\/#168\/#169|#174\/#175/.test(x.description))return 'MULTI_INCIDENT_SUMMARY_SPLIT_REQUIRED';
 return 'INCIDENT_CANDIDATE_REQUIRES_VERIFICATION';
}
function identity(x){
 if(/GFS PRIDE/i.test(x.description))return 'GFS_PRIDE';
 if(/GFS GISELLE/i.test(x.description))return 'GFS_GISELLE';
 if(/#156\b/.test(x.description))return 'UKMTO_156_26';
 if(/On Peace/i.test(x.description))return 'ON_PEACE';
 for(const id of ['158','159','166','176'])if(x.description.includes('#'+id))return 'UKMTO_'+id+'_26';
 return null;
}
export function reconcileR4CuratedCSV(csv){
 const rows=parseCSV(csv);if(rows.length>500||!rows.length)throw Error('V9_CASEBOOK_COUNT_INVALID');
 const seen=new Set(),casebook=[];
 for(const x of rows){
  if(!dateOk(x.day)||x.day<START||x.day>END||!FRONTS.has(x.front)||!LEVELS.has(x.validation_level)
   ||!dateOk(x.first_public_report)||x.first_public_report<START||x.first_public_report>END
   ||!(x.event_date==='UNKNOWN'||dateOk(x.event_date))||x.event_date!=='UNKNOWN'&&x.event_date>x.first_public_report
   ||x.score_verified!=='NO'||x.description.length<15||x.description.length>800)throw Error('V9_CASEBOOK_CONTRACT_INVALID');
  let url;try{url=new URL(x.source_url);}catch{throw Error('V9_CASEBOOK_URL_INVALID');}
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)throw Error('V9_CASEBOOK_URL_INVALID');
  const eventDate=x.event_date==='UNKNOWN'?null:x.event_date;
  if(x.day!==eventDate&&eventDate!==null&&x.day!==x.first_public_report)throw Error('V9_CASEBOOK_DAY_INCONSISTENT');
  const id=hash(JSON.stringify([x.front,x.event_date,x.description,x.source_url]));
  if(seen.has(id))throw Error('V9_CASEBOOK_DUPLICATE_ROW');seen.add(id);
  casebook.push({id,front:x.front,eventDateCandidate:eventDate,reportDay:x.first_public_report,
   researchBucketDay:x.day,sourceUrl:x.source_url,description:x.description,
   sourceReviewLevel:x.validation_level,eventNature:classify(x),eventObjectId:identity(x),
   independentEvidenceVerified:false,actorVerified:false,incidentVerified:false,
   severity:null,diplomacyStage:null,ceasefireStage:null,maritimeSafetyScore:null,nuclearScore:null,
   canonicalIncidentKey:null,sourceStoredAt:null,verificationAt:null,
   candidateEligibleForHumanReview:true,
   reportedStrikeCandidate:!NON_ATTACK.has(x.validation_level),
   actualIncidentDateResolved:eventDate!==null,
   evidencePublishedAfterIncident:eventDate!==null&&x.first_public_report>eventDate,
   productionScoreEligible:false});
 }
 const days=dates().map(date=>{
  const c=casebook.filter(x=>x.eventDateCandidate===date&&x.reportedStrikeCandidate);
  return {date,reportedOnDay:casebook.filter(x=>x.reportDay===date).length,
   provisionalEventDateCandidates:c.length,
   retrospectiveOnlyCandidates:c.filter(x=>x.evidencePublishedAfterIncident).length,
   sourceReportsFirstPubliclyAvailableByDay:casebook.filter(x=>x.reportDay<=date).length,
   independentlyVerifiedEvents:0,r4VerifiedInputReady:false,r4Score:null,domainCoverage:'NOT_PROVEN',
   missing:['IRN_USA_28DAY','IRN_ISR_28DAY','YEMEN_HOUTHI_28DAY','HORMUZ_OFFICIAL','RED_SEA_OFFICIAL','NUCLEAR_VERIFIED']};
 });
 return {version:V9_VERSION,status:'RESEARCH_REVIEW_MANIFEST_ONLY',period:{start:START,end:END,days:14},
  sourceRows:rows.length,deduplicatedRows:casebook.length,casebook,days,
  potentialDuplicateClusters:[
   {members:casebook.filter(x=>['UKMTO_156_26','ON_PEACE'].includes(x.eventObjectId)).map(x=>x.id),reason:'OCT_05_TANKER_DUPLICATION_UNRESOLVED',merged:false},
   {members:casebook.filter(x=>x.front==='YEMEN_HOUTHI'&&['2026-10-10','2026-10-11'].includes(x.eventDateCandidate)).map(x=>x.id),reason:'RIYADH_TWO_DAY_INCIDENT_DISTINCTNESS_UNRESOLVED',merged:false},
   {members:casebook.filter(x=>x.front==='YEMEN_HOUTHI_CONTEXT').map(x=>x.id),reason:'EGYPT_POLITICAL_FOLLOWUP_NOT_TWO_ATTACKS',merged:false}
  ],
  inputHistoricalMode:'EVENT_DATE_CANDIDATES_SEPARATE_FROM_PUBLICATION_KNOWLEDGE',
  full28DayCoverageVerified:false,allFrontsVerified:false,
  independentlyVerifiedR4Events:0,r4ComputedDays:0,officialR4Score:null,provisional18Used:false,
  articleCountToEventCountConversionForbidden:true,r3ScoreModified:false,
  requiresLocalEvidenceLedgerAndIndependentSourceValidation:true,autoPublish:false};
}
export function toReviewSummary(r){
 return {version:r.version,status:r.status,period:r.period,sourceRows:r.sourceRows,
  pendingIncidentReview:r.casebook.filter(x=>x.reportedStrikeCandidate).length,
  nonCombatOrPhaseCandidates:r.casebook.filter(x=>!x.reportedStrikeCandidate).length,
  unknownEventDates:r.casebook.filter(x=>!x.eventDateCandidate).length,
  lateReported:r.casebook.filter(x=>x.evidencePublishedAfterIncident).length,
  duplicateClusters:r.potentialDuplicateClusters,
  keyCases:r.casebook.filter(x=>x.eventObjectId).map(x=>({day:x.eventDateCandidate,reportDay:x.reportDay,object:x.eventObjectId,verified:x.incidentVerified})),
  days:r.days,r4ComputedDays:0,reason:'28_DAY_COVERAGE_AND_INDEPENDENT_R4_INPUTS_NOT_ATTESTED',
  productionScoreEligible:false,publicR3Changed:false};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 if(!process.argv[2])throw Error('V9_CSV_PATH_REQUIRED');
 console.log(JSON.stringify(toReviewSummary(reconcileR4CuratedCSV(readFileSync(process.argv[2],'utf8'))),null,2));
}
