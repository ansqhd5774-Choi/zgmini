/** Research-only official warning index. No API, database, event scoring or publication. */
export const R4_V30_VERSION='IRAN_R4_OFFICIAL_MARITIME_CASEBOOK_V30';
const SOURCE='https://www.ukmto.org/recent-incidents';
const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const ROUTES=new Set(['HORMUZ','RED_SEA','OTHER_GULF','YEMEN_OFFSHORE','UNRESOLVED']);
const TYPES=new Set(['ATTACK_REPORT','SUSPICIOUS_ACTIVITY']);
const warning=(number,listingDay,occurrenceDay,routeHint,kind,cluster)=>Object.freeze({
  reference:`UKMTO_${number}_26`,sourceUrl:SOURCE,listingDay,occurrenceDay,routeHint,kind,
  duplicateReviewCluster:cluster,claimant:'UKMTO',
  actorIndependentlyVerified:false,occurrenceIndependentlyVerified:false,
  eventIdentityIndependentlyVerified:false,pcHistoricalReceiptVerified:false,
  routeCoverageVerified:false,scoreEligible:false
});
/** The public index is a finding aid, not official event-number PDFs stored on the PC. */
export const V30_UKMTO_LEADS=Object.freeze([
 warning(152,'2026-10-05','2026-10-05','HORMUZ','SUSPICIOUS_ACTIVITY','HORMUZ_1005_SUSPICIOUS'),
 warning(154,'2026-10-04','2026-10-04','HORMUZ','ATTACK_REPORT','HORMUZ_1004_ATTACK'),
 warning(156,'2026-10-05','2026-10-05','HORMUZ','ATTACK_REPORT','HORMUZ_1005_DUP_UNRESOLVED'),
 warning(157,'2026-10-05','2026-10-05','HORMUZ','ATTACK_REPORT','HORMUZ_1005_DUP_UNRESOLVED'),
 warning(158,'2026-10-07','2026-10-07','OTHER_GULF','ATTACK_REPORT','OTHER_GULF_1007'),
 warning(159,'2026-10-06','2026-10-06','HORMUZ','ATTACK_REPORT','HORMUZ_1006'),
 warning(160,'2026-10-09',null,'UNRESOLVED','ATTACK_REPORT','UAE_1009_UNRESOLVED'),
 warning(174,'2026-10-16',null,'OTHER_GULF','ATTACK_REPORT','JUBAYL_1016_DUP_UNRESOLVED'),
 warning(175,'2026-10-16',null,'OTHER_GULF','ATTACK_REPORT','JUBAYL_1016_DUP_UNRESOLVED'),
 warning(176,'2026-10-17',null,'YEMEN_OFFSHORE','ATTACK_REPORT','YEMEN_OFFSHORE_1017'),
]);
export function auditOfficialMaritimeCasebookV30(rows=V30_UKMTO_LEADS,{start='2026-09-07',end='2026-10-18',reviewedOn='2026-10-19'}={}){
 if(!Array.isArray(rows)||rows.length>100||!iso(start)||!iso(end)||!iso(reviewedOn)||start>end||end>reviewedOn)
  throw Error('V30_WINDOW_INVALID');
 const seen=new Set(),clusters=new Map(),kinds={ATTACK_REPORT:0,SUSPICIOUS_ACTIVITY:0},routes={};
 let withinListing=0,explicitOccurrenceDay=0;
 for(const r of rows){
  if(!r||typeof r.reference!=='string'||!/^UKMTO_\d{3}_26$/.test(r.reference)||seen.has(r.reference)||
   r.sourceUrl!==SOURCE||!iso(r.listingDay)||r.listingDay>reviewedOn||
   r.occurrenceDay!==null&&(!iso(r.occurrenceDay)||r.occurrenceDay>r.listingDay)||
   !ROUTES.has(r.routeHint)||!TYPES.has(r.kind)||
   typeof r.duplicateReviewCluster!=='string'||!/^[A-Z0-9_]{8,80}$/.test(r.duplicateReviewCluster)||
   r.actorIndependentlyVerified!==false||r.occurrenceIndependentlyVerified!==false||
   r.eventIdentityIndependentlyVerified!==false||r.pcHistoricalReceiptVerified!==false||
   r.routeCoverageVerified!==false||r.scoreEligible!==false)
   throw Error('V30_LEAD_INVALID');
  seen.add(r.reference);kinds[r.kind]++;routes[r.routeHint]=(routes[r.routeHint]??0)+1;
  if(r.listingDay>=start&&r.listingDay<=end)withinListing++;
  if(r.occurrenceDay!==null)explicitOccurrenceDay++;
  const a=clusters.get(r.duplicateReviewCluster)??[];a.push(r.reference);clusters.set(r.duplicateReviewCluster,a);
 }
 return {
  version:R4_V30_VERSION,status:'PUBLIC_UKMTO_WARNINGS_ONLY',
  indexEntryCount:rows.length,kinds,routeHints:routes,withinListingWindow:withinListing,
  explicitIncidentDatesInPublicIndex:explicitOccurrenceDay,
  unresolvedIdentityClusters:[...clusters].filter(([,ids])=>ids.length>1).map(([id,refs])=>({
   reviewCluster:id,warningReferences:refs.sort(),independentIncidentCount:null,
   duplicateResolved:false
  })).sort((a,b)=>a.reviewCluster.localeCompare(b.reviewCluster)),
  missingInputs:['OFFICIAL_REPORT_ORIGINAL_PC_RECEIPT','ACTOR_INDEPENDENTLY_VERIFIED',
   'EVENT_OCCURRENCE_AND_DUPLICATE_RESOLUTION','FRONT_SPECIFIC_28_DAY_COVERAGE',
   'HORMUZ_AND_RED_SEA_28_DAY_COVERAGE','PHASE_CEASEFIRE_NUCLEAR_INPUTS'],
  unknownActorsMayNotBeAssignedToIranFronts:true,
  outOfWindowOrUnobservedDaysAreNotZeroAttacks:true,
  retrospectivelyDiscoveredIsNotHistoricallyStored:true,
  verifiedR4Events:0,complete28DayCoverage:false,computedR4Days:0,score:null,
  researchOnly:true,productionReady:false,providerCalls:0,dbWrites:0,published:false
 };
}
