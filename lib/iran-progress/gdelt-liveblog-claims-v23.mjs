/** Research-only claim separation from a composite 2026-10-05 Al Jazeera liveblog.
 * A news statement is not an independently verified combat incident or PC as-of receipt.
 * Pure function: no API, DB, score, weights, scheduler or publication.
 */
export const R4_V23_LIVEBLOG='IRAN_R4_V23_LIVEBLOG_REPORTED_CLAIMS';
export const R4_V23_OCT05_SOURCE='https://www.aljazeera.com/news/liveblog/2026/10/5/iran-war-live-fighting-in-yemen-intensifies-tehran-says-ready-for-us-war';
const types=new Set(['ATTACK_CLAIM','MILITARY_OPERATION_CLAIM','NAVAL_INCIDENT_REPORT','DIPLOMATIC_STATEMENT','DEFENCE_POSTURE']);
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
export const R4_V23_PUBLIC_SUBCLAIMS=Object.freeze([
 {id:'AJ_1005_YEMEN_COALITION_HODEIDAH',kind:'MILITARY_OPERATION_CLAIM',sourceClaimAt:'2026-10-05T20:15:00Z',claimant:'SAUDI_LED_COALITION_SPOKESPERSON',reportedTarget:'HODEIDAH_MILITARY_SITES',frontHint:'YEMEN_HOUTHI',groupHint:'YEMEN_COALITION_HODEIDAH',claimText:'Saudi-led coalition says it carried out a naval operation in Hodeidah'},
 {id:'AJ_1005_HOUTHI_RIYADH',kind:'ATTACK_CLAIM',sourceClaimAt:'2026-10-05T20:21:00Z',claimant:'HOUTHI_MILITARY_SPOKESPERSON',reportedTarget:'KING_KHALID_AIRPORT',frontHint:'YEMEN_HOUTHI',groupHint:'OCT05_HOUTHI_ATTACK_STATEMENT',claimText:'Houthi military spokesperson said it targeted Riyadh airport'},
 {id:'AJ_1005_HOUTHI_RABIGH',kind:'ATTACK_CLAIM',sourceClaimAt:'2026-10-05T20:21:00Z',claimant:'HOUTHI_MILITARY_SPOKESPERSON',reportedTarget:'RABIGH_ARAMCO_REFINERY',frontHint:'YEMEN_HOUTHI',groupHint:'OCT05_HOUTHI_ATTACK_STATEMENT',claimText:'Houthi military spokesperson said it targeted Rabigh refinery'},
 {id:'AJ_1005_YEMEN_GOV_MOCHA',kind:'MILITARY_OPERATION_CLAIM',sourceClaimAt:null,claimant:'YEMEN_GOVERNMENT_FORCES',reportedTarget:'MOCHA',frontHint:'YEMEN_HOUTHI',groupHint:'OCT05_YEMEN_GOV_OFFENSIVE',claimText:'Yemen government forces confirm retaking Mocha after clashes'},
 {id:'AJ_1005_UKMTO_TANKER',kind:'NAVAL_INCIDENT_REPORT',sourceClaimAt:null,claimant:'UKMTO_REPORT_CITED_BY_NEWS',reportedTarget:'HORMUZ_UNNAMED_TANKER',frontHint:'MARITIME_HORMUZ',groupHint:'UKMTO_156_OR_157_UNRESOLVED',claimText:'UKMTO reported tanker struck by unknown projectile in Hormuz'},
 {id:'AJ_1005_IRAN_NEGOTIATOR',kind:'DIPLOMATIC_STATEMENT',sourceClaimAt:'2026-10-05T20:05:00Z',claimant:'IRAN_NEGOTIATOR',reportedTarget:'US_POLICY_ASSESSMENT',frontHint:'IRN_USA',groupHint:null,claimText:'Iranian negotiator argued US failed to achieve military goals'},
 {id:'AJ_1005_MECCA_PACT',kind:'DEFENCE_POSTURE',sourceClaimAt:null,claimant:'TURKIYE_PAKISTAN',reportedTarget:'SAUDI_DEFENCE_DEPLOYMENT',frontHint:'YEMEN_HOUTHI',groupHint:'MECCA_DEFENCE_ALLIANCE',claimText:'Turkiye and Pakistan agreed troop deployment to Saudi Arabia'}
].map(x=>Object.freeze({...x,sourceUrl:R4_V23_OCT05_SOURCE,sourcePublicationDay:'2026-10-05',eventOccurrenceDay:null,independentOccurrenceVerified:false,attackActorVerified:false,duplicateResolved:false,pcVerifiedSourceReceipt:false,r4ScoreEligible:false})));
function validate(r){
 if(!r||typeof r.id!=='string'||!/^AJ_1005_[A-Z0-9_]+$/.test(r.id)||!types.has(r.kind)||r.sourceUrl!==R4_V23_OCT05_SOURCE||
  r.sourcePublicationDay!=='2026-10-05'||!day(r.sourcePublicationDay)||r.eventOccurrenceDay!==null||
  typeof r.claimText!=='string'||r.claimText.length<16||typeof r.claimant!=='string'||!r.claimant||
  typeof r.reportedTarget!=='string'||!r.reportedTarget||
  r.sourceClaimAt!==null&&(typeof r.sourceClaimAt!=='string'||!Number.isFinite(Date.parse(r.sourceClaimAt))||!r.sourceClaimAt.startsWith('2026-10-05'))||
  r.independentOccurrenceVerified!==false||r.attackActorVerified!==false||r.duplicateResolved!==false||
  r.pcVerifiedSourceReceipt!==false||r.r4ScoreEligible!==false)
  throw Error('V23_REPORTED_CLAIM_CONTRACT_INVALID');
 if(r.groupHint!==null&&(typeof r.groupHint!=='string'||!r.groupHint))throw Error('V23_GROUP_INVALID');
}
export function auditR4LiveblogClaimsV23(input=R4_V23_PUBLIC_SUBCLAIMS){
 if(!Array.isArray(input)||input.length===0||input.length>100)throw Error('V23_CLAIMS_INVALID');
 const seen=new Set();for(const claim of input){validate(claim);if(seen.has(claim.id))throw Error('V23_DUPLICATE_CLAIM_ID');seen.add(claim.id);}
 const groups={};for(const r of input)groups[r.kind]=(groups[r.kind]??0)+1;
 const grouped=new Map();for(const r of input){if(r.groupHint){const a=grouped.get(r.groupHint)??[];a.push(r.id);grouped.set(r.groupHint,a);}}
 return {version:R4_V23_LIVEBLOG,status:'MULTI_CLAIM_RESEARCH_NOT_VERIFIED_EVENTS',
  sourceArticleCount:1,subclaimCount:input.length,reportedClaimTypes:groups,
  candidateDuplicateGroups:[...grouped.entries()].map(([key,ids])=>({key,claimIds:ids,actualIncidentCount:null})),
  explicitlyVerifiedEventDates:0,verifiedR4Events:0,full28DayCoverageVerified:false,r4DailyScores:null,
  researchOnly:true,dbWrites:0,providerCalls:0,published:false,claims:input.map(r=>({...r})),
  note:'One liveblog has multiple claims; 7 subclaims are not 7 independently verified attacks.'};
}