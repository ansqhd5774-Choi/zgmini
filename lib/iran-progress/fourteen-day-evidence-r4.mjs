/** Public-source *discovery* record, not verified local incident or score data.
 * All dates are research UTC reporting days. Never infer a quiet day from 0 items.
 * These metadata are NOT the PC-verified receipts required by the R4 model.
 */
export const IRAN_R4_14D_PERIOD=Object.freeze({from:'2026-10-05',through:'2026-10-18',days:14});
export const IRAN_R4_14D_CASEBOOK=Object.freeze([
  {
    "date": "2026-10-05",
    "classification": "ATTACKS_REPORTED",
    "summary": "사우디 지원 예멘군의 바브엘만데브 해안 공세와 교전 보도",
    "sourceIds": [
      "REUTERS_YEMEN_COAST_1005"
    ]
  },
  {
    "date": "2026-10-06",
    "classification": "EARLIER_EVENT_REPORTED",
    "summary": "연합군 후데이다 공습 보도는 전날 사건을 설명. 6일 신규 사건일 미확정",
    "sourceIds": [
      "SAUDI_GAZETTE_HODEIDAH_1006"
    ]
  },
  {
    "date": "2026-10-07",
    "classification": "ATTACKS_REPORTED",
    "summary": "사우디 공항 피격·미사일 요격 및 예멘 전선 교전 보도. 개별 사건일은 6~7일 혼재",
    "sourceIds": [
      "REUTERS_SAUDI_AIRPORTS_1007"
    ]
  },
  {
    "date": "2026-10-08",
    "classification": "ATTACKS_REPORTED",
    "summary": "연합군의 후티 미사일 3발 요격 발표",
    "sourceIds": [
      "ALJAZEERA_1008_INTERCEPT"
    ]
  },
  {
    "date": "2026-10-09",
    "classification": "OFFICIAL_FULL_WAR_ASSESSMENT",
    "summary": "유엔 예멘 특사 다수 전선 전면전 재개 공식 평가. 9일 발생한 신규 공격 1건으로 취급 금지",
    "sourceIds": [
      "UN_YEMEN_FULL_WAR_1009"
    ]
  },
  {
    "date": "2026-10-10",
    "classification": "ATTACKS_REPORTED",
    "summary": "리야드 공항 공격에 대한 미 대사관 당일 안전 경보",
    "sourceIds": [
      "US_EMBASSY_RIYADH_1010"
    ]
  },
  {
    "date": "2026-10-11",
    "classification": "ATTACKS_AND_DIPLOMACY",
    "summary": "리야드 공항 추가 공격 보도와 사우디·이란 외교 접촉. 별도 사건으로 취급",
    "sourceIds": [
      "REUTERS_RIYADH_REPEAT_1011",
      "REUTERS_SAUDI_IRAN_TALKS_1011"
    ]
  },
  {
    "date": "2026-10-12",
    "classification": "DIPLOMACY_STALLED",
    "summary": "이란이 미국의 호르무즈 제안을 검토 중이나 합의·휴전 발효 없음",
    "sourceIds": [
      "REUTERS_HORMUZ_RESPONSE_1012"
    ]
  },
  {
    "date": "2026-10-13",
    "classification": "ATTACKS_REPORTED",
    "summary": "후티의 사우디 아람코 본사 공격과 연합군의 예멘 표적 보도",
    "sourceIds": [
      "REUTERS_ARAMCO_1013"
    ]
  },
  {
    "date": "2026-10-14",
    "classification": "MARITIME_AND_MILITARY",
    "summary": "이란 해상 공격 전술 확대 보도·호르무즈 선박 피격 보도. 기존 사건 재보도 중복 주의",
    "sourceIds": [
      "REUTERS_SHIPPING_TACTICS_1014",
      "REUTERS_HOUTHI_RIYADH_1014"
    ]
  },
  {
    "date": "2026-10-15",
    "classification": "ATTACKS_REPORTED",
    "summary": "후티의 아덴 대통령궁 공격 및 연합군 대응",
    "sourceIds": [
      "REUTERS_ADEN_PALACE_1015"
    ]
  },
  {
    "date": "2026-10-16",
    "classification": "ATTACKS_REPORTED",
    "summary": "아덴 공항 미사일 피격·사우디 연합군의 미사일 요격",
    "sourceIds": [
      "REUTERS_ADEN_AIRPORT_1016"
    ]
  },
  {
    "date": "2026-10-17",
    "classification": "CONDITIONAL_RESPONSE",
    "summary": "이집트의 사우디 방어 지원 의사: 실제 참전으로 처리 금지",
    "sourceIds": [
      "REUTERS_EGYPT_CONDITIONAL_1017"
    ]
  },
  {
    "date": "2026-10-18",
    "classification": "ATTACK_REPORT_WITH_UNKNOWN_ACTOR",
    "summary": "걸프 연안 예인선 피격 보도, 공격 주체 미확정. 이집트 지원 재확인 보도는 신규 참전으로 금지",
    "sourceIds": [
      "AP_UAE_TUG_1018",
      "REUTERS_EGYPT_1018"
    ]
  }
]);
export const IRAN_R4_14D_SOURCES=Object.freeze([
  {
    "id": "REUTERS_YEMEN_COAST_1005",
    "publishedDate": "2026-10-05",
    "eventDate": "2026-10-05",
    "front": "YEMEN_HOUTHI",
    "kind": "OFFENSIVE_REPORT",
    "url": "https://www.reuters.com/world/yemeni-government-forces-seize-district-by-bab-el-mandeb-military-sources-say-2026-10-05/"
  },
  {
    "id": "SAUDI_GAZETTE_HODEIDAH_1006",
    "publishedDate": "2026-10-06",
    "eventDate": "2026-10-05",
    "front": "YEMEN_HOUTHI",
    "kind": "PRIOR_DAY_REPORT",
    "url": "https://saudigazette.com.sa/article/665152/saudi-arabia/coalition-naval-forces-strike-houthi-targets-in-hodeidah-thwart-red-sea-attacks"
  },
  {
    "id": "REUTERS_SAUDI_AIRPORTS_1007",
    "publishedDate": "2026-10-07",
    "eventDate": null,
    "front": "YEMEN_HOUTHI",
    "kind": "MULTIDAY_REPORT",
    "url": "https://www.reuters.com/world/middle-east/houthis-launch-missiles-yemens-aden-airport-fighting-intensifies-2026-10-07/"
  },
  {
    "id": "ALJAZEERA_1008_INTERCEPT",
    "publishedDate": "2026-10-08",
    "eventDate": "2026-10-08",
    "front": "YEMEN_HOUTHI",
    "kind": "INTERCEPTION_REPORT",
    "url": "https://www.aljazeera.com/news/2026/10/8/saudi-led-coalition-says-it-intercepts-three-houthi-ballistic-missiles"
  },
  {
    "id": "UN_YEMEN_FULL_WAR_1009",
    "publishedDate": "2026-10-09",
    "eventDate": null,
    "front": "YEMEN_HOUTHI",
    "kind": "OFFICIAL_STATUS_ASSESSMENT",
    "url": "https://dppa.un.org/en/news/yemen-has-returned-to-full-scale-war-special-envoy-warns"
  },
  {
    "id": "US_EMBASSY_RIYADH_1010",
    "publishedDate": "2026-10-10",
    "eventDate": "2026-10-10",
    "front": "YEMEN_HOUTHI",
    "kind": "ATTACK_ALERT",
    "url": "https://sa.usembassy.gov/security-alert-u-s-mission-saudi-arabia-october-10-2026/"
  },
  {
    "id": "REUTERS_RIYADH_REPEAT_1011",
    "publishedDate": "2026-10-11",
    "eventDate": "2026-10-11",
    "front": "YEMEN_HOUTHI",
    "kind": "ATTACK_REPORT",
    "url": "https://www.reuters.com/world/middle-east/yemens-houthis-renew-warning-over-saudi-airports-after-deadly-riyadh-attack-2026-10-11/"
  },
  {
    "id": "REUTERS_SAUDI_IRAN_TALKS_1011",
    "publishedDate": "2026-10-11",
    "eventDate": "2026-10-11",
    "front": "SAUDI_IRAN",
    "kind": "REGIONAL_DIPLOMACY_ONLY",
    "url": "https://www.reuters.com/world/middle-east/saudi-iranian-foreign-ministers-discuss-regional-tensions-state-news-agency-says-2026-10-11/"
  },
  {
    "id": "REUTERS_HORMUZ_RESPONSE_1012",
    "publishedDate": "2026-10-12",
    "eventDate": "2026-10-12",
    "front": "IRN_USA",
    "kind": "TALKS_NO_TRUCE",
    "url": "https://www.reuters.com/world/middle-east/iran-says-it-will-reply-us-response-hormuz-proposal-once-review-over-2026-10-12/"
  },
  {
    "id": "REUTERS_ARAMCO_1013",
    "publishedDate": "2026-10-13",
    "eventDate": "2026-10-13",
    "front": "YEMEN_HOUTHI",
    "kind": "INFRASTRUCTURE_ATTACK",
    "url": "https://www.reuters.com/business/energy/saudi-led-coalition-orders-evacuation-yemen-oil-facility-sanaa-ahead-operation-2026-10-13/"
  },
  {
    "id": "REUTERS_SHIPPING_TACTICS_1014",
    "publishedDate": "2026-10-14",
    "eventDate": null,
    "front": "HORMUZ_MARITIME",
    "kind": "MARITIME_TREND_REPORT",
    "url": "https://www.reuters.com/world/middle-east/iran-shifting-tactics-step-up-attacks-shipping-before-us-vote-officials-say-2026-10-14/"
  },
  {
    "id": "REUTERS_HOUTHI_RIYADH_1014",
    "publishedDate": "2026-10-14",
    "eventDate": "2026-10-14",
    "front": "YEMEN_HOUTHI",
    "kind": "INTERCEPTION_REPORT",
    "url": "https://www.reuters.com/world/middle-east/houthis-bring-war-riyadh-2026-10-14/"
  },
  {
    "id": "REUTERS_ADEN_PALACE_1015",
    "publishedDate": "2026-10-15",
    "eventDate": "2026-10-15",
    "front": "YEMEN_HOUTHI",
    "kind": "INFRASTRUCTURE_ATTACK",
    "url": "https://www.reuters.com/world/middle-east/saudi-led-coalition-says-houthis-attempted-attack-dozens-saudi-facilities-2026-10-15/"
  },
  {
    "id": "REUTERS_ADEN_AIRPORT_1016",
    "publishedDate": "2026-10-16",
    "eventDate": "2026-10-16",
    "front": "YEMEN_HOUTHI",
    "kind": "AIRPORT_ATTACK",
    "url": "https://www.reuters.com/world/middle-east/missiles-hit-aden-airport-saudi-led-coalition-intercepts-missile-headed-yanbu-2026-10-16/"
  },
  {
    "id": "REUTERS_EGYPT_CONDITIONAL_1017",
    "publishedDate": "2026-10-17",
    "eventDate": "2026-10-17",
    "front": "YEMEN_HOUTHI",
    "kind": "CONDITIONAL_SUPPORT_NOT_DEPLOYMENT",
    "url": "https://www.reuters.com/world/middle-east/egypts-sisi-seeks-parliaments-backing-help-defend-saudi-arabia-if-asked-2026-10-17/"
  },
  {
    "id": "AP_UAE_TUG_1018",
    "publishedDate": "2026-10-18",
    "eventDate": "2026-10-18",
    "front": "MARITIME_UNATTRIBUTED",
    "kind": "UNKNOWN_ACTOR_ATTACK_REPORT",
    "url": "https://apnews.com/article/793087dde3cb4435c6b771bae28faff3"
  },
  {
    "id": "REUTERS_EGYPT_1018",
    "publishedDate": "2026-10-18",
    "eventDate": "2026-10-17",
    "front": "YEMEN_HOUTHI",
    "kind": "FOLLOWUP_OF_CONDITIONAL_SUPPORT",
    "url": "https://www.reuters.com/world/middle-east/egypt-says-ready-give-saudi-arabia-necessary-support-amid-houthi-conflict-2026-10-18/"
  }
]);
const MS=86400000;
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))
 &&new Date(v+'T00:00:00Z').toISOString().startsWith(v);
const diffDays=(a,b)=>(Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/MS;
const distinctDays=()=>Array.from({length:14},(_,i)=>new Date(Date.parse(IRAN_R4_14D_PERIOD.from+'T00:00:00Z')+i*MS).toISOString().slice(0,10));
/** Lookup only information known by that reporting date. Historic discoveries from
 * later reports are useful for retrospective analysis but cannot prove earlier PIT.
 */
export function auditR4FourteenDayResearch({asOfDate='2026-10-18'}={}){
 if(!validDate(asOfDate)||asOfDate<IRAN_R4_14D_PERIOD.from||asOfDate>IRAN_R4_14D_PERIOD.through)
  throw Error('R4_CASEBOOK_ASOF_INVALID');
 const days=distinctDays();
 if(new Set(IRAN_R4_14D_CASEBOOK.map(x=>x.date)).size!==14||
 IRAN_R4_14D_CASEBOOK.some((x,i)=>x.date!==days[i]))throw Error('R4_CASEBOOK_14D_INTEGRITY_INVALID');
 const ids=new Set();
 for(const s of IRAN_R4_14D_SOURCES){
  if(ids.has(s.id)||!validDate(s.publishedDate)||s.publishedDate<IRAN_R4_14D_PERIOD.from||
   s.publishedDate>IRAN_R4_14D_PERIOD.through||
   (s.eventDate!==null&&(!validDate(s.eventDate)||s.eventDate>s.publishedDate))||
   !s.url.startsWith('https://'))throw Error('R4_CASEBOOK_EVIDENCE_INVALID');
  ids.add(s.id);
 }
 return {status:'PUBLIC_SOURCE_METADATA_ONLY',asOfDate,
  period:IRAN_R4_14D_PERIOD,
  days:IRAN_R4_14D_CASEBOOK.filter(x=>x.date<=asOfDate).map(x=>{
   const refs=x.sourceIds.map(id=>IRAN_R4_14D_SOURCES.find(s=>s.id===id))
    .filter(r=>r&&r.publishedDate<=x.date);
   return {date:x.date,classification:x.classification,summary:x.summary,
    knownOnDateSourceCount:refs.length,sourceIds:refs.map(r=>r.id),r4Score:null,
    full28DayCoverageVerified:false,usIranVerified:false,iranIsraelVerified:false,
    yemenVerified:false,maritimeVerified:false,nuclearVerified:false,
    pointInTimeStatus:'LOCAL_R4_VERIFIED_INPUT_REQUIRED'};
  }),uniquePublicReports:IRAN_R4_14D_SOURCES.filter(x=>x.publishedDate<=asOfDate).length,
  verifiedRealityScores:0,sourceVerification:'PUBLIC_METADATA_NOT_LOCAL_VERIFICATION',
  sourceCoverageProven:false,productionReady:false};
}
