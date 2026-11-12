/** Public-index only, audit assistance; never a PC-verified incident or score input. */
export const VERSION='IRAN_R4_UKMTO_PUBLIC_INDEX_CORRECTIONS_V31';
const URL='https://www.ukmto.org/recent-incidents';
const KINDS=new Set(['ATTACK','SUSPICIOUS_ACTIVITY']);
const LOCATIONS=new Set(['STRAIT_OF_HORMUZ','GULF_OF_OMAN','OTHER_GULF','YEMEN_OFFSHORE','UNKNOWN']);
const METHODS=new Set(['UNKNOWN_PROJECTILE','RPG_FROM_SMALL_BOAT','SKIFF_GUNFIRE','OTHER_OR_UNKNOWN']);
const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
 Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const source=(number,indexDay,location,reportedMethod,fields={})=>Object.freeze({
 id:`UKMTO_${number}_26`,publicIndexDay:indexDay,sourceUrl:URL,location,reportedMethod,
 reportedIncidentDay:null,sourceRevisionHistory:[{kind:'ATTACK',effectiveDay:null}],
 distanceNm:null,shipClass:'UNSPECIFIED',...fields,
 // A public index is neither a preserved PC original nor independently verified R4 actor or incident.
 pcSourceReceiptVerified:false,attackActorVerified:false,incidentIdentityResolved:false,
 r4FrontLinkVerified:false,complete28DayCoverage:false,scoreEligible:false
});
/** Explicitly bounded subset from public UKMTO index, inspected 2026-10-19.
 * publicIndexDay may not be original publish date or incident date.
 * Revisions without published times MUST remain undated.
 */
export const V31_PUBLIC_DELTA=Object.freeze([
 source(162,'2026-10-10','STRAIT_OF_HORMUZ','UNKNOWN_PROJECTILE', {shipClass:'TANKER'}),
 source(164,'2026-10-11','STRAIT_OF_HORMUZ','UNKNOWN_PROJECTILE', {shipClass:'TANKER'}),
 source(165,'2026-10-11','GULF_OF_OMAN','UNKNOWN_PROJECTILE', {
  shipClass:'TANKER',sourceRevisionHistory:[
   {kind:'SUSPICIOUS_ACTIVITY',effectiveDay:null},
   {kind:'ATTACK',effectiveDay:null,revisionLabel:'UPDATE_001'}]}),
 source(166,'2026-10-12','STRAIT_OF_HORMUZ','UNKNOWN_PROJECTILE', {
  shipClass:'TANKER',reportedIncidentDay:'2026-10-11'}),
 source(167,'2026-10-12','STRAIT_OF_HORMUZ','UNKNOWN_PROJECTILE', {shipClass:'CONTAINER'}),
 source(168,'2026-10-12','STRAIT_OF_HORMUZ','UNKNOWN_PROJECTILE', {shipClass:'PRODUCTS_TANKER'}),
 source(169,'2026-10-12','STRAIT_OF_HORMUZ','UNKNOWN_PROJECTILE', {shipClass:'CRUDE_TANKER'}),
 source(170,'2026-10-13','STRAIT_OF_HORMUZ','UNKNOWN_PROJECTILE', {shipClass:'CONTAINER'}),
 source(171,'2026-10-13','STRAIT_OF_HORMUZ','UNKNOWN_PROJECTILE', {shipClass:'TANKER'}),
 source(172,'2026-10-14','STRAIT_OF_HORMUZ','UNKNOWN_PROJECTILE', {shipClass:'CONTAINER'}),
 source(173,'2026-10-14','STRAIT_OF_HORMUZ','UNKNOWN_PROJECTILE', {shipClass:'CONTAINER'}),
 source(174,'2026-10-16','OTHER_GULF','UNKNOWN_PROJECTILE', {distanceNm:68,shipClass:'TANKER'}),
 source(175,'2026-10-16','OTHER_GULF','RPG_FROM_SMALL_BOAT', {distanceNm:78,shipClass:'TANKER'}),
 source(176,'2026-10-17','YEMEN_OFFSHORE','SKIFF_GUNFIRE', {distanceNm:140,shipClass:'LNG_TANKER'}),
]);
export function auditUkMtoPublicIndexV31(rows=V31_PUBLIC_DELTA,{asOf='2026-10-19'}={}){
 if(!Array.isArray(rows)||rows.length>100||!date(asOf))throw Error('V31_AUDIT_INPUT_INVALID');
 const ids=new Set();const dayCounts=new Map();let correctedWithoutRevisionTime=0;
 for(const r of rows){
  if(!r||typeof r.id!=='string'||!/^UKMTO_\d{3}_26$/.test(r.id)||ids.has(r.id)||
   r.sourceUrl!==URL||!date(r.publicIndexDay)||r.publicIndexDay>asOf||
   (r.reportedIncidentDay!==null&&(!date(r.reportedIncidentDay)||r.reportedIncidentDay>r.publicIndexDay))||
   !LOCATIONS.has(r.location)||!METHODS.has(r.reportedMethod)||
   !Array.isArray(r.sourceRevisionHistory)||r.sourceRevisionHistory.length<1||r.sourceRevisionHistory.length>4||
   r.sourceRevisionHistory.some((rev,i)=> (
     !rev||!KINDS.has(rev.kind)||
     (rev.effectiveDay!==null&&(!date(rev.effectiveDay)||rev.effectiveDay>asOf))||
     (i>0&&rev.kind===r.sourceRevisionHistory[i-1].kind)||
     (rev.revisionLabel!=null&&!/^UPDATE_\d{3}$/.test(rev.revisionLabel))
   ))||
   !Number.isInteger(r.distanceNm)&&r.distanceNm!==null||
   Number.isInteger(r.distanceNm)&&r.distanceNm<=0||
   typeof r.shipClass!=='string'||r.shipClass.length>40||
   r.pcSourceReceiptVerified!==false||r.attackActorVerified!==false||
   r.incidentIdentityResolved!==false||r.r4FrontLinkVerified!==false||
   r.complete28DayCoverage!==false||r.scoreEligible!==false)throw Error('V31_INDEX_LEAD_INVALID');
  ids.add(r.id);dayCounts.set(r.publicIndexDay,(dayCounts.get(r.publicIndexDay)??0)+1);
  if(r.sourceRevisionHistory.length>1&&r.sourceRevisionHistory.some(x=>x.effectiveDay===null))
   correctedWithoutRevisionTime++;
 }
 const disputed=rows.filter(r=>['UKMTO_174_26','UKMTO_175_26'].includes(r.id));
 return {version:VERSION,status:'PUBLIC_INDEX_ADDITIONAL_LEADS_NOT_R4_VERIFIED',
  additionalIndexRows:rows.length,
  newSinceV30Rows:rows.filter(r=>!['UKMTO_174_26','UKMTO_175_26','UKMTO_176_26'].includes(r.id)).length,
  v30OverlapRows:rows.filter(r=>['UKMTO_174_26','UKMTO_175_26','UKMTO_176_26'].includes(r.id)).length,
  uniqueIndexDays:dayCounts.size,
  correctionWithUnknownEffectiveDateCount:correctedWithoutRevisionTime,
  latestPublicCategories:Object.fromEntries(rows.map(r=>[r.id,r.sourceRevisionHistory.at(-1).kind])),
  explicitIncidentDays:Object.fromEntries(rows.filter(r=>r.reportedIncidentDay!==null).map(r=>[r.id,r.reportedIncidentDay])),
  jubaylWarnings:disputed.map(r=>({id:r.id,distanceNm:r.distanceNm,method:r.reportedMethod,
   independentEventCount:null,duplicateResolved:false})),
  historicalDayBackfillFromCurrentRevisionForbidden:true,
  routeMayNotBeInferredFromYemenCountryAlone:true,
  attackerMayNotBeInferredFromAttackClassification:true,
  missingDayMayNotBeZeroFilled:true,
  latestPublicWarningCount:rows.length,verifiedR4Events:0,
  daysWithVerifiedFullCoverage:0,computedR4Days:0,score:null,
  sourceOriginalPcReceipts:0,dbWrites:0,providerCalls:0,published:false,
  researchOnly:true,productionReady:false};
}
