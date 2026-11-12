/** Public UKMTO notice index, NOT verified R4 military/event coverage.
 * Indexed notice card date is NOT always incident day or historical PC as-of.
 * Claims are metadata, not reproduced provider raw documents.
 */
export const V14_VERSION='IRAN_UKMTO_NOTICE_RESEARCH_V14';
const DAY=86400000,START='2026-10-05',END='2026-10-18';
const BOARD_URL='https://www.ukmto.org/recent-incidents';
const days=()=>Array.from({length:14},(_,i)=>new Date(Date.parse(START+'T00:00:00Z')+DAY*i).toISOString().slice(0,10));
const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
// id, board listing date, explicit date of incident only, status, subtype, details
const NOTICES=[
 [152,'2026-10-05','2026-10-05','SUSPICIOUS_ACTIVITY','IRGC_HAILING','Tanker warned off Hormuz; no projectile impact established'],
 [156,'2026-10-05','2026-10-05','ATTACK','TANKER_PROJECTILE_FIRE','Hormuz tanker hit; fire reported'],
 [157,'2026-10-05','2026-10-05','ATTACK','TANKER_UNKNOWN_PROJECTILE','Time-late report; possibly same vessel as another notice'],
 [159,'2026-10-06','2026-10-06','ATTACK','TANKER_UNKNOWN_PROJECTILE','Late report of crude tanker impact'],
 [158,'2026-10-07','2026-10-07','ATTACK','TANKER_MULTIPLE_PROJECTILES','Tanker reported hit north of Qatar'],
 [160,'2026-10-09',null,'ATTACK','SHIP_UNKNOWN_PROJECTILE_FIRE','Near Al Jazeera, UAE; incident date not explicitly shown'],
 [161,'2026-10-09',null,'ADVISORY','GENERAL_WARNING','Advisory only; not verified impact'],
 [162,'2026-10-10',null,'ATTACK','TANKER_PROJECTILE_FIRE','Outbound Hormuz tanker struck; event date from board is unproven'],
 [163,'2026-10-10',null,'ADVISORY','MILITARY_ACTIVITY','Gulf of Oman military activity warning; not classified as impact'],
 [164,'2026-10-11',null,'ATTACK','TANKER_PROJECTILE_DAMAGE','Tanker reported hit outbound Hormuz'],
 [165,'2026-10-11',null,'ATTACK_RECLASSIFIED','TANKER_UAV_STRIKE','Initially suspicious activity, later reclassified to confirmed UAV impact'],
 [166,'2026-10-12','2026-10-11','ATTACK','TANKER_UNKNOWN_PROJECTILE','Report board Oct 12; explicit incident Oct 11'],
 [167,'2026-10-12',null,'ATTACK','CONTAINER_SHIP_PROJECTILE','Time-late report; occurrence day not explicitly established'],
 [168,'2026-10-12',null,'ATTACK','PRODUCT_TANKER_PROJECTILE','Time-late report; occurrence day not explicitly established'],
 [169,'2026-10-12',null,'ATTACK','CRUDE_TANKER_PROJECTILE','Time-late report; occurrence day not explicitly established'],
 [170,'2026-10-13',null,'ATTACK','CONTAINER_SHIP_PROJECTILE','Could overlap named MPA vessels, pending vessel identity'],
 [171,'2026-10-13',null,'ATTACK','TANKER_UNKNOWN_PROJECTILE','Tanker near Hormuz; no proven perpetrator'],
 [172,'2026-10-14',null,'ATTACK','CONTAINER_SHIP_PROJECTILE','Inbound container vessel; time-late report'],
 [173,'2026-10-14',null,'ATTACK','CONTAINER_SHIP_PROJECTILE','Outbound container vessel; time-late report'],
 [174,'2026-10-16',null,'ATTACK','TANKER_PROJECTILE','Time-late report northeast of Al Jubayl'],
 [175,'2026-10-16',null,'ATTACK','TANKER_RPG','Tanker RPG fired from boat northeast of Al Jubayl'],
 [176,'2026-10-17',null,'ATTACK','SMALL_BOAT_GUNFIRE','Skiff exchanged shots with armed team southwest of Al Mukalla'],
 [177,'2026-10-18','2026-10-18','ATTACK','TUG_PROJECTILE','Khor Fakkan tug hit; one minor casualty reported']
];
const prev=[ [134,'2026-09-12',null],[135,'2026-09-15',null],[136,'2026-09-17','2026-09-17'],[137,'2026-09-17',null],[138,'2026-09-18',null],[139,'2026-09-18','2026-09-16'],[140,'2026-09-21',null],[141,'2026-09-21',null] ];
const kinds=new Set(['ATTACK','ATTACK_RECLASSIFIED','ADVISORY','SUSPICIOUS_ACTIVITY']);
const notice=([number,boardDate,explicitIncidentDate,kind,descriptionClass,note])=>({
 noticeId:'UKMTO_'+number+'_26',number,boardDate,
 explicitIncidentDate,kind,descriptionClass,note,
 boardUrl:BOARD_URL,exactProductURL:null,
 noticeArchivedFromIndexedPublicCard:true,
 originalDocumentVerifiedLocally:false,
 incidentOccurrenceConfirmedByPc:false,
 attackActor:'UNKNOWN',r4ActorVerified:false,
 duplicateResolved:false,severityVerified:false,
 r4VerifiedEvent:false,scoringEligible:false
});
function validate(x){
 if(!Number.isInteger(x.number)||x.number<1||x.number>999||!valid(x.boardDate)||!kinds.has(x.kind))throw Error('V14_NOTICE_SCHEMA_INVALID');
 if(x.explicitIncidentDate!==null&&(!valid(x.explicitIncidentDate)||x.explicitIncidentDate>x.boardDate))throw Error('V14_INCIDENT_DATE_INVALID');
 if(x.exactProductURL!==null||x.attackActor!=='UNKNOWN'||x.r4ActorVerified||x.duplicateResolved||x.r4VerifiedEvent||x.scoringEligible||x.severityVerified||x.incidentOccurrenceConfirmedByPc)throw Error('V14_UNVERIFIED_PROMOTION_FORBIDDEN');
 if(x.boardUrl!==BOARD_URL||x.originalDocumentVerifiedLocally!==false||x.noticeArchivedFromIndexedPublicCard!==true)throw Error('V14_SOURCE_CONTRACT_INVALID');
}
export function buildUKMTOResearchIndex(input=NOTICES.map(notice)){
 if(!Array.isArray(input)||!input.length||input.length>200)throw Error('V14_INPUT_INVALID');
 const seen=new Set();
 for(const x of input){validate(x);if(seen.has(x.number))throw Error('V14_DUPLICATE_NOTICE_NUMBER');seen.add(x.number);}
 const listing=days().map(day=>{
  const r=input.filter(x=>x.boardDate===day);
  const e=input.filter(x=>x.explicitIncidentDate===day&&['ATTACK','ATTACK_RECLASSIFIED'].includes(x.kind));
  return {day,listedOnDay:r.length,listedAttackReports:r.filter(x=>x.kind==='ATTACK'||x.kind==='ATTACK_RECLASSIFIED').length,
   explicitlyDatedIncidentCandidates:e.map(x=>x.noticeId),
   incidentDateUnresolved:r.filter(x=>x.explicitIncidentDate===null).map(x=>x.noticeId),
   asOfDayPcKnown:false,independentlyVerifiedR4Events:0,fullPrior28DaysVerified:false,r4Score:null};
 });
 const prewindow=prev.map(([id,boardDate,incidentDate])=>({id:'UKMTO_'+id+'_26',boardDate,explicitIncidentDate:incidentDate,
  prewindowContextOnly:true,fullyObserved28Days:false}));
 return {version:V14_VERSION,status:'INDEXED_UKMTO_REVIEW_LEADS_ONLY',
  period:{first:START,last:END,days:14,requiredPriorStart:'2026-09-07'},
  noticeCount:input.length,
  attackNotices:input.filter(x=>['ATTACK','ATTACK_RECLASSIFIED'].includes(x.kind)).length,
  nonAttackNotices:input.filter(x=>!['ATTACK','ATTACK_RECLASSIFIED'].includes(x.kind)).length,
  explicitlyDatedAttackNotices:input.filter(x=>['ATTACK','ATTACK_RECLASSIFIED'].includes(x.kind)&&x.explicitIncidentDate!==null).length,
  withoutExplicitOccurrenceDay:input.filter(x=>x.explicitIncidentDate===null).length,
  priorWindowExamples:prewindow,listing,
  duplicateRisks:[
   {a:'UKMTO_156_26',b:'UKMTO_157_26',reason:'SAME_DAY_TANKER_IDS_UNCONFIRMED'},
   {a:'UKMTO_170_26',b:'MPA_GFS_PRIDE',reason:'VESSEL_MATCH_UNCONFIRMED'},
   {a:'UKMTO_172_26',b:'MPA_GFS_GISELLE',reason:'VESSEL_MATCH_UNCONFIRMED'},
   {a:'UKMTO_173_26',b:'MPA_GFS_GISELLE',reason:'VESSEL_MATCH_UNCONFIRMED'}
  ],
  notices:input,independentR4EventCount:0,dailyR4Computed:0,all28DayObservationCoverageProven:false,
  sourcePageLiveFullHistoryReadback:false,sourceCardsAreNotLocalPCVerifiedEvents:true,
  summary:'Public-indexed UKMTO board-card dates, not a historical proof of PC receipt times, event-day continuity, actor or severity.',
  productionReady:false,autoPublish:false};
}
