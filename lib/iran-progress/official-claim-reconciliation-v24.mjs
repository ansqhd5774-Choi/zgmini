/** V24 research-only public-source reconciliation. No provider, PC receipt, DB or score access. */
export const R4_V24_RESEARCH_VERSION='IRAN_R4_OFFICIAL_CLAIM_RECONCILIATION_V24';
const KINDS=new Set(['ATTACK_REPORT','SUSPICIOUS_ACTIVITY','CAMPAIGN_TARGET_AGGREGATE',
 'WAR_STATE_SUMMARY','INTERCEPT_REPORT','CONTESTED_TERRITORY_CLAIM']);
const SOURCES=new Set(['UKMTO','SPA','UN_DPPA','NEWS_REPORT']);
const DAY=86400000;
function date(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const n=Date.parse(s+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s;}
function https(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
 u.hostname!=='localhost'&&!u.hostname.endsWith('.localhost');}catch{return false;}}
const entry=(id,source,kind,day,occurrence,reference,url,cluster,extra={})=>Object.freeze({
 id,source,kind,reportDay:day,occurrenceDay:occurrence,reference,url,provisionalCluster:cluster,
 reportedActor:null,reportedTargetCount:null,reportedTargetUnit:null,
 incidentIdentityIndependentlyResolved:false,actorIndependentlyVerified:false,
 pcOriginalReceiptVerified:false,scoreEligible:false,...extra});
/** Public source index checked 2026-10-19; NOT a recovered PC observation ledger. */
export const R4_V24_PUBLIC_SOURCE_LEADS=Object.freeze([
 entry('UKMTO_152_26','UKMTO','SUSPICIOUS_ACTIVITY','2026-10-05','2026-10-05','152-26',
  'https://www.ukmto.org/recent-incidents','UKMTO_152_REVIEW'),
 entry('UKMTO_156_26','UKMTO','ATTACK_REPORT','2026-10-05','2026-10-05','156-26',
  'https://www.ukmto.org/recent-incidents','HORMUZ_OCT05_TWO_WARNINGS_UNRESOLVED'),
 entry('UKMTO_157_26','UKMTO','ATTACK_REPORT','2026-10-05','2026-10-05','157-26',
  'https://www.ukmto.org/recent-incidents','HORMUZ_OCT05_TWO_WARNINGS_UNRESOLVED'),
 entry('UKMTO_159_26','UKMTO','ATTACK_REPORT','2026-10-06','2026-10-06','159-26',
  'https://www.ukmto.org/recent-incidents','UKMTO_159_REVIEW'),
 entry('UKMTO_158_26','UKMTO','ATTACK_REPORT','2026-10-07','2026-10-07','158-26',
  'https://www.ukmto.org/recent-incidents','UKMTO_158_REVIEW'),
 entry('UKMTO_160_26','UKMTO','ATTACK_REPORT','2026-10-09','2026-10-09','160-26',
  'https://www.ukmto.org/recent-incidents','UKMTO_160_REVIEW'),
 entry('DPPA_YEMEN_1009','UN_DPPA','WAR_STATE_SUMMARY','2026-10-09',null,'DPPA_20261009_YEMEN',
  'https://dppa.un.org/en/news/yemen-has-returned-to-full-scale-war-Special-Envoy-warns','YEMEN_OFFENSIVE_CONTEXT'),
 entry('SPA_HOUTHI_TARGETS_1010','SPA','CAMPAIGN_TARGET_AGGREGATE','2026-10-10',null,'SPA_N2697547',
  'https://spa.gov.sa/en/N2697547','COALITION_CAMPAIGN_CONTEXT',
  {reportedTargetCount:136,reportedTargetUnit:'MILITARY_TARGETS'}),
 entry('SPA_RIYADH_INTERCEPT_1011','SPA','INTERCEPT_REPORT','2026-10-11',null,'SPA_N2698603',
  'https://www.spa.gov.sa/en/N2698603','RIYADH_INTERCEPT_CONTEXT'),
 entry('ALJ_MOCHA_CONTESTED_1005','NEWS_REPORT','CONTESTED_TERRITORY_CLAIM','2026-10-06',null,
  'ALJ_20261005_UPDATED_20261006','https://www.aljazeera.com/news/2026/10/5/yemen-forces-claim-to-seize-dhubab-sites-near-bab-al-mandeb-from-houthis',
  'YEMEN_OFFENSIVE_CONTEXT')
]);
export function auditR4OfficialSourceLeadsV24(rows=R4_V24_PUBLIC_SOURCE_LEADS,{asOf='2026-10-19',start='2026-09-07',end='2026-10-18'}={}){
 if(!Array.isArray(rows)||rows.length>1000||!date(asOf)||!date(start)||!date(end)||end<start||end>asOf)
  throw Error('R4_V24_INPUT_INVALID');
 const ids=new Set(),refs=new Set(),groups=new Map(),kindCounts={},sourceCounts={},reportedAttackDays=new Set();
 for(const r of rows){
  if(!r||typeof r.id!=='string'||!/^[A-Z0-9_]{5,100}$/.test(r.id)||ids.has(r.id)||
   !SOURCES.has(r.source)||!KINDS.has(r.kind)||!date(r.reportDay)||r.reportDay>asOf||
   r.occurrenceDay!==null&&(!date(r.occurrenceDay)||r.occurrenceDay>r.reportDay)||
   typeof r.reference!=='string'||!/^[A-Z0-9_-]{4,100}$/.test(r.reference)||
   !https(r.url)||typeof r.provisionalCluster!=='string'||!/^[A-Z0-9_]{5,100}$/.test(r.provisionalCluster)||
   r.actorIndependentlyVerified!==false||r.incidentIdentityIndependentlyResolved!==false||
   r.pcOriginalReceiptVerified!==false||r.scoreEligible!==false||
   (r.reportedTargetCount!==null&&(r.kind!=='CAMPAIGN_TARGET_AGGREGATE'||
     !Number.isSafeInteger(r.reportedTargetCount)||r.reportedTargetCount<1||r.reportedTargetUnit!=='MILITARY_TARGETS'))||
   (r.kind!=='CAMPAIGN_TARGET_AGGREGATE'&&r.reportedTargetUnit!==null))
   throw Error('R4_V24_SOURCE_INVALID');
  ids.add(r.id);
  const rk=r.source+'|'+r.reference;
  if(refs.has(rk))throw Error('R4_V24_DUPLICATE_REFERENCE');
  refs.add(rk);
  kindCounts[r.kind]=(kindCounts[r.kind]??0)+1;
  sourceCounts[r.source]=(sourceCounts[r.source]??0)+1;
  const items=groups.get(r.provisionalCluster)??[];items.push(r.id);groups.set(r.provisionalCluster,items);
  if(r.kind==='ATTACK_REPORT'&&r.occurrenceDay&&r.occurrenceDay>=start&&r.occurrenceDay<=end)
   reportedAttackDays.add(r.occurrenceDay);
 }
 const consideredDays=(Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/DAY+1;
 return {version:R4_V24_RESEARCH_VERSION,status:'PUBLIC_REPORTS_NOT_VERIFIED_R4_EVENTS',
  publicSourceLeads:rows.length,officialAttackWarnings:rows.filter(r=>r.source==='UKMTO'&&r.kind==='ATTACK_REPORT').length,
  suspiciousAdvisories:kindCounts.SUSPICIOUS_ACTIVITY??0,
  publicReportedAttackDays:[...reportedAttackDays].sort(),
  provisionalClusters:[...groups].map(([key,ids])=>({key,sourceIds:ids.sort(),identityResolved:false,
   numberOfIndependentAttacks:null})).sort((a,b)=>a.key.localeCompare(b.key)),
  kindCounts,sourceCounts,coverageWindow:{start,end,days:consideredDays,frontCoverageCertifiedDays:0,
   maritimeRouteCoverageCertifiedDays:0,absenceOfEventsCertified:false},
  officialTargetsAreNotAttackCounts:true,attackerAttributionEstablished:false,
  pcAsOfReceiptEstablished:false,verifiedR4Events:0,scoreDaysComputed:0,score:null,
  researchOnly:true,productionReady:false,providerCalls:0,dbWrites:0,published:false};
}