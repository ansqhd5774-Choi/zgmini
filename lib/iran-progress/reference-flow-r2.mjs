import {FLOW_WEIGHTS} from './reference-flow-r1.mjs';

export const IRAN_FLOW_R2_VERSION='IRAN_REFERENCE_FLOW_R2';
export const IRAN_FLOW_R2_KEY='public:iran-progress:reference-flow:r2';
export const CLASSIFIER_VERSION='IRAN_EVENT_RULES_R2_1';
// Stage deltas are domain points, not probability changes. Claims remain reports.
export const R2_RULES=[
 ['DIALOGUE_WILLINGNESS','DIPLOMACY',2,'협상 의향 표명',/\b(?:ready|willing) to (?:hold talks|negotiate)\b/i],
 ['PROPOSAL_RECEIVED','DIPLOMACY',3,'협상안 접수',/\b(?:received|submitted|delivered) (?:a |the |an? updated )?(?:peace |ceasefire |nuclear )?proposal\b/i],
 ['MEDIATOR_MEETING','DIPLOMACY',4,'중재 회동 개최',/\b(?:held|holds) (?:a )?(?:mediation meeting|meeting with (?:the )?(?:Omani|Qatari) mediator)\b/i],
 ['TALKS_HELD','DIPLOMACY',8,'협상 개최·재개',/\b(?:held|resumed) (?:direct |indirect |nuclear |peace )?talks\b/i],
 ['PROPOSAL_REJECTED','DIPLOMACY',-4,'협상안 거부',/\b(?:rejected|rejects) (?:a |the )?(?:peace |ceasefire |nuclear )?proposal\b/i],
 ['TALKS_COLLAPSED','DIPLOMACY',-10,'협상 결렬',/\b(?:talks|negotiations) (?:collapsed|broke down)\b/i],
 ['CEASEFIRE_SIGNED','CEASEFIRE',12,'휴전 합의 서명',/\b(?:signed (?:a |the )?ceasefire agreement|agreed to (?:a )?ceasefire)\b/i],
 ['CEASEFIRE_IMPLEMENTED','CEASEFIRE',15,'휴전 발효',/\bceasefire (?:took effect|entered into force)\b/i],
 ['CEASEFIRE_BREACHED','CEASEFIRE',-15,'휴전 위반 보도',/\b(?:violated|broke) (?:the )?ceasefire\b/i],
 ['MILITARY_WARNING','MILITARY',-2,'군사 경고 표명',/\b(?:warns|warned) (?:the )?(?:US|United States|Israel)\b/i],
 ['MILITARY_REINFORCEMENT','MILITARY',-4,'병력·전력 추가 배치',/\b(?:deployed|sent) (?:additional |more )(?:troops|warships|forces)\b/i],
 ['MILITARY_ATTACK','MILITARY',-12,'실제 공격 보도',/\b(?:launched (?:an? )?(?:attack|strike|missiles)|bombed|struck (?:a |an |the )?(?:Iranian|Israeli|US) (?:base|facility|port))\b/i],
 ['MILITARY_WITHDRAWAL','MILITARY',8,'병력 철수 보도',/\b(?:withdrew|withdrawn) (?:its |their )?(?:troops|warships|forces)\b/i],
 ['MARITIME_DISRUPTION','MARITIME',-10,'호르무즈 선박 피해·통항 중단',/\b(?:(?:tanker|vessel|ship) (?:was |is )?(?:struck|attacked|caught fire|catches fire|sinks|sank)|navigation (?:was )?disrupted|strait (?:was )?closed)\b/i],
 ['MARITIME_REOPENED','MARITIME',10,'호르무즈 통항 재개',/\b(?:strait (?:was )?reopened|navigation (?:was )?restored|shipping (?:has )?resumed)\b/i],
 ['NUCLEAR_SIGNED','NUCLEAR',10,'핵 합의 서명',/\b(?:signed (?:a |the )?nuclear agreement|nuclear agreement (?:was )?signed)\b/i],
 ['INSPECTIONS_RESUMED','NUCLEAR',12,'핵 사찰 재개',/\b(?:inspectors (?:have )?returned|inspections (?:have )?resumed)\b/i],
 ['INSPECTIONS_SUSPENDED','NUCLEAR',-12,'핵 사찰 중단',/\b(?:inspections (?:were )?suspended|expelled (?:the )?inspectors)\b/i],
].map(([id,type,delta,reason,pattern])=>({id,type,delta,reason,pattern}));

export const R2_SOURCE_HOSTS=['www.tasnimnews.ir','www.gov.uk','www.mofa.go.jp','www.iaea.org','www.ukmto.org'];
export function trustedR2Url(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&R2_SOURCE_HOSTS.includes(u.hostname)&&!u.port;}catch{return false;}}
export function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function classifyR2Article(article){
 if(!trustedR2Url(article?.sourceUrl)||!validDate(article.date)||typeof article.title!=='string')return {accepted:false,reason:'SOURCE_INVALID'};
 const title=article.title.normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
 // Only the headline's asserted clause is scored. Summary context never proves action.
 if(!/\bIran(?:ian)?\b|\bIRGC\b|\bHormuz\b/i.test(title))return {accepted:false,reason:'OUT_OF_SCOPE'};
 if(!/\b(?:US|United States|Israel(?:i)?|Hormuz|nuclear|IAEA)\b/i.test(title+' '+(article.summary??'')))return {accepted:false,reason:'CONFLICT_RELATION_UNCLEAR'};
 if(/\b(?:could|may|might|would|will|if|should|must|urges?|denies|denied|alleged|rumou?r|reportedly|plans? to|expected to)\b|\?/i.test(title))return {accepted:false,reason:'CONDITIONAL_OR_DISPUTED'};
 if(/\b(?:not|never|no longer|failed to|didn't|hasn't|won't)\b/i.test(title))return {accepted:false,reason:'NEGATED_OR_UNRESOLVED'};
 if(/\b(?:Yemen|Saudi|Lebanon|Gaza|Ukraine)\b/i.test(title)&&!/\b(?:US|United States|Israel|Hormuz|nuclear|IAEA)\b/i.test(title))return {accepted:false,reason:'OTHER_CONFLICT'};
 const matches=R2_RULES.filter(r=>r.pattern.test(title)&&(r.type!=='MARITIME'||/Hormuz/i.test(title))&&(r.type!=='NUCLEAR'||/Iran|Iranian/i.test(title)));
 if(matches.length!==1)return {accepted:false,reason:matches.length?'MULTIPLE_STAGES_REVIEW_REQUIRED':'NO_EXPLICIT_CHANGE_RULE'};
 const r=matches[0];
 // Exact normalized headline identity is conservative. Unresolved semantic duplicates require review.
 const identity=title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 return {accepted:true,rule:r.id,type:r.type,delta:r.delta,reason:r.reason,date:article.date,sourceUrl:article.sourceUrl,evidence:title,eventKey:JSON.stringify([article.date,r.id,identity]),classifierVersion:CLASSIFIER_VERSION,claimVerification:'SINGLE_SOURCE_REPORT',eventVerified:false};
}
const clamp=n=>Math.max(0,Math.min(100,n));
export function buildReferenceFlowR2(events,{asOfDate,baselineDate='2026-09-09'}={}){
 if(!validDate(asOfDate)||!validDate(baselineDate)||baselineDate>asOfDate)throw Error('R2_DATE_INVALID');
 const unique=new Map();
 for(const e of events){
  const r=R2_RULES.find(r=>r.id===e.rule&&r.type===e.type&&r.delta===e.delta);
  if(!e.accepted||!r||!trustedR2Url(e.sourceUrl)||!validDate(e.date)||e.date<baselineDate||e.date>asOfDate||!e.eventKey)continue;
  // Input is a ledger: invalid events are never converted to neutral observations.
  const old=unique.get(e.eventKey);
  if(!old||e.sourceUrl.localeCompare(old.sourceUrl)<0)unique.set(e.eventKey,e);
 }
 const ledger=[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.eventKey.localeCompare(b.eventKey));
 const domains=Object.fromEntries(Object.keys(FLOW_WEIGHTS).map(k=>[k,50])),history=[];let previous=50;
 for(const date of [...new Set(ledger.map(e=>e.date))]){
  const changes=Object.fromEntries(Object.keys(FLOW_WEIGHTS).map(k=>[k,0]));
  for(const e of ledger.filter(e=>e.date===date))changes[e.type]+=e.delta;
  for(const k of Object.keys(domains))domains[k]=clamp(domains[k]+changes[k]);
  const value=Number(Object.entries(FLOW_WEIGHTS).reduce((s,[k,w])=>s+w*domains[k],0).toFixed(2));
  history.push({date,value,delta:Number((value-previous).toFixed(2))});previous=value;
 }
 return {version:IRAN_FLOW_R2_VERSION,status:'REFERENCE',score:previous,baseline:50,baselineDate,displaySensitivity:1,historyMode:'RETROSPECTIVE_PUBLICATION_DATE',history:history.filter(p=>Date.parse(p.date+'T00:00:00Z')>=Date.parse(asOfDate+'T00:00:00Z')-13*86400000),domains,weights:FLOW_WEIGHTS,ledger,eventCount:ledger.length,asOfDate,probability:false,officialPeaceDetermination:false,limitation:'보도 흐름 참고용. 단일 출처 주장과 확인된 사실은 다르며 종전 확률이 아님. 의미상 중복 사건은 검토 대상.'};
}
