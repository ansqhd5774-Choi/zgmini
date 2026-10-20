import {FLOW_WEIGHTS} from './reference-flow-r1.mjs';

export const IRAN_FLOW_R3_VERSION='IRAN_REFERENCE_FLOW_R3';
export const IRAN_FLOW_R3_KEY='public:iran-progress:reference-flow:r3';
export const CLASSIFIER_VERSION='IRAN_EVENT_RULES_R3_4';
// Stage deltas are domain points, not probability changes. Claims remain reports.
export const R3_RULES=[
 ['DIALOGUE_WILLINGNESS','DIPLOMACY',2,'협상 의향 표명',/\b(?:ready|willing) to (?:hold talks|negotiate)\b/i],
 ['PROPOSAL_RECEIVED','DIPLOMACY',3,'협상안 접수',/\b(?:received|submitted|delivered) (?:a |the |an? updated )?(?:peace |ceasefire |nuclear )?proposal\b/i],
 ['MEDIATOR_MEETING','DIPLOMACY',4,'중재 회동 개최',/\b(?:held|holds) (?:a )?(?:mediation meeting|meeting with (?:the )?(?:Omani|Qatari) mediator)\b/i],
 ['TALKS_HELD','DIPLOMACY',8,'협상 개최·재개',/\b(?:held|resumed) (?:direct |indirect |nuclear |peace )?talks\b/i],
 ['PROPOSAL_REJECTED','DIPLOMACY',-4,'협상안 거부',/\b(?:rejected|rejects) (?:a |the )?(?:peace |ceasefire |nuclear )?proposal\b/i],
 ['TALKS_COLLAPSED','DIPLOMACY',-10,'협상 결렬',/\b(?:talks|negotiations) (?:collapsed|broke down)\b/i],
 ['CEASEFIRE_SIGNED','CEASEFIRE',12,'휴전 합의 서명',/\b(?:signed (?:a |the )?ceasefire agreement|agreed to (?:a )?ceasefire)\b/i],
 ['CEASEFIRE_IMPLEMENTED','CEASEFIRE',15,'휴전 발효',/\bceasefire (?:took effect|entered into force)\b/i],
 ['CEASEFIRE_BREACHED','CEASEFIRE',-15,'휴전 위반 보도',/\b(?:violated|broke) (?:the )?ceasefire\b/i],
 ['MILITARY_WARNING','MILITARY',-2,'군사 경고·공격 예고 보도',/\b(?:warns|warned|vows?|vowed|threatens?|threatened)\b.{0,100}\b(?:US|United States|Israel|Saudi|attacks?|strikes?|retaliat\w*)\b/i],
 ['MILITARY_REINFORCEMENT','MILITARY',-4,'병력·전력 추가 배치',/\b(?:deployed|sent) (?:additional |more )(?:troops|warships|forces)\b/i],
 ['MILITARY_ATTACK','MILITARY',-12,'실제 공격 보도',/\b(?:(?:launched|fired|fires)\s+(?:(?:a|an|two|three|several|ballistic|cruise|dozens of)\s+)*(?:attacks?|strikes?|missiles?|drones?)|bombed|(?:missile|drone|air|rocket)\s+(?:attacks?|strikes?)\b.{0,100}\b(?:kills?|killed|injures?|injured|damages?|damaged|destroys?|destroyed)|(?:strikes?|struck|hits?|hit|attacked|attacks?|shells?|shelled)\s+(?:.{0,55}\s)?(?:airport|airports|base|facility|facilities|building|buildings|port|ports|palace|headquarters|oil|tanker|vessel|ship|camp|camps|city|residential area|neighbou?rhood|Sanaa|Sana'a|Riyadh|Aden|Medina|Jeddah|Tehran|Taiz|Shabwa|Khamis Mushait))\b/i],
 ['MILITARY_INTERCEPTION','MILITARY',-4,'미사일·드론 요격 보도',/\b(?:intercepts?|intercepted|shot down|shoots down|thwarted)\b.{0,60}\b(?:missiles?|drones?|attacks?|strikes?)\b/i],
 ['MILITARY_WITHDRAWAL','MILITARY',8,'병력 철수 보도',/\b(?:withdrew|withdrawn) (?:its |their )?(?:troops|warships|forces)\b/i],
 ['MARITIME_DISRUPTION','MARITIME',-10,'해상 선박 피해·통항 중단 보도',/\b(?:(?:tanker|vessel|ship) (?:was |is )?(?:struck|attacked|caught fire|catches fire|sinks|sank)|navigation (?:was )?disrupted|strait (?:was )?closed|shipping (?:was |is )?(?:suspended|halted))\b/i],
 ['MARITIME_REOPENED','MARITIME',10,'해상 통항 재개 보도',/\b(?:strait (?:was )?reopened|navigation (?:was )?restored|shipping (?:has )?resumed)\b/i],
 ['NUCLEAR_SIGNED','NUCLEAR',10,'핵 합의 서명',/\b(?:signed (?:a |the )?nuclear agreement|nuclear agreement (?:was )?signed)\b/i],
 ['INSPECTIONS_RESUMED','NUCLEAR',12,'핵 사찰 재개',/\b(?:inspectors (?:have )?returned|inspections (?:have )?resumed)\b/i],
 ['INSPECTIONS_SUSPENDED','NUCLEAR',-12,'핵 사찰 중단',/\b(?:inspections (?:were )?suspended|expelled (?:the )?inspectors)\b/i],
].map(([id,type,delta,reason,pattern])=>({id,type,delta,reason,pattern}));

export const R3_SOURCE_HOSTS=['www.tasnimnews.ir','www.gov.uk','www.mofa.go.jp','www.iaea.org','www.ukmto.org','www.bbc.com','www.bbc.co.uk','www.aljazeera.com','news.un.org'];
export function trustedR3Url(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&R3_SOURCE_HOSTS.includes(u.hostname)&&!u.port;}catch{return false;}}
export function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function classifyR3Article(article){
 if(!trustedR3Url(article?.sourceUrl)||!validDate(article.date)||typeof article.title!=='string')return {accepted:false,reason:'SOURCE_INVALID'};
 const title=article.title.normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
 // A live-blog umbrella title may combine unrelated events; the word "Iran"
 // before "live:" is topic context, not evidence of an Iranian attacker.
 // Preserve each original receipt, but require event-level review before scoring
 // a compound headline. One-claim headlines and existing rules stay unchanged.
 const livePrefix=/^(?:iran|israel|middle east|gaza)(?:[\s-]+(?:war|conflict|crisis))?\s+live(?:\s+updates?)?\s*:/i;
 if(livePrefix.test(title)&&/\s*;\s*|\s+\|\s+|\s+•\s+/.test(title.replace(livePrefix,'')))
  return {accepted:false,reason:'COMPOUND_LIVEBLOG_REQUIRES_EVENT_REVIEW'};
 // Only the headline's asserted clause is scored. Summary context never proves action.
 const context=title+' '+String(article.summary??'').slice(0,2000);
 const direct=/\b(?:Iran(?:ian)?|IRGC|Hormuz)\b/i.test(context)&&/\b(?:US|United States|Israel(?:i)?|Hormuz|nuclear|IAEA|Saudi|Yemen)\b/i.test(context);
 const regional=/\b(?:Houthis?|Ansar Allah)\b/i.test(context)&&/\b(?:Saudi|Yemen(?:i)?|Aden|Sanaa|Sana'a|Riyadh|Medina|Jeddah|Taiz|Shabwa|Khamis Mushait|Red Sea|Bab.el.Mandeb|Israel|US|United States)\b/i.test(context)||/\bSaudi\b/i.test(context)&&/\b(?:Yemen(?:i)?|Sanaa|Sana'a|Aden|Taiz|Shabwa)\b/i.test(context);
 if(!direct&&!regional)return {accepted:false,reason:'OUT_OF_SCOPE'};
 if(/^(?:why|how|analysis|opinion|explainer|what to know)\b|:\s*(?:what (?:that|this|it) means|what (?:we|you) (?:know|need to know)|why (?:it|they|that|this) matters)\b|\?$/i.test(title))return {accepted:false,reason:'ANALYSIS_NOT_NEW_EVENT'};
 const warning=R3_RULES.find(r=>r.id==='MILITARY_WARNING').pattern.test(title);
 if(/\b(?:could|may|might|would|if|should|must|urges?|denies|denied|alleged|rumou?r|reportedly|plans? to|expected to)\b|\?/i.test(title)||!warning&&/\bwill\b/i.test(title))return {accepted:false,reason:'CONDITIONAL_OR_DISPUTED'};
 if(/\b(?:not|never|no longer|failed to|didn't|hasn't|won't)\b/i.test(title))return {accepted:false,reason:'NEGATED_OR_UNRESOLVED'};
 let matches=R3_RULES.filter(r=>r.pattern.test(title)&&(r.type!=='MARITIME'||/Hormuz|Red Sea|Bab.el.Mandeb/i.test(context))&&(r.type!=='NUCLEAR'||/Iran|Iranian/i.test(context)));
 // A threat to attack is a reported warning, never an executed strike.
 if(warning)matches=matches.filter(r=>r.id==='MILITARY_WARNING');
 // One maritime casualty is not also charged as a military strike.
 if(matches.some(r=>r.type==='MARITIME'))matches=matches.filter(r=>r.type!=='MILITARY');
 if(matches.length!==1)return {accepted:false,reason:matches.length?'MULTIPLE_STAGES_REVIEW_REQUIRED':'NO_EXPLICIT_CHANGE_RULE'};
 const r=matches[0];
 // Exact normalized headline identity is conservative. Unresolved semantic duplicates require review.
 const identity=title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const actors=[['HOUTHI',/Houthis?|Ansar Allah/i],['SAUDI',/Saudi/i],['IRAN',/Iran|IRGC/i],['ISRAEL',/Israel/i],['USA',/\bUS\b|United States/i]];
 const location=(title.match(/\b(?:Riyadh|Aden|Sanaa|Sana'a|Medina|Jeddah|Taiz|Shabwa|Khamis Mushait|Tehran|Doha|Muscat|Hormuz|Red Sea|Bab.el.Mandeb)\b/i)?.[0]??'UNKNOWN').toLowerCase();
 // Prefer the reported destination over a weapon mentioned earlier in the sentence.
 const target=(title.match(/\b(?:airport|palace|headquarters|building|(?:oil|fuel) (?:depot|facilit\w*)|base|port|tanker|vessel|ship|camp|residential area|neighbou?rhood|city)s?\b/i)?.[0]??title.match(/\b(?:missile|drone)s?\b/i)?.[0]??'unknown').toLowerCase();
 const verbAt=title.search(/\b(?:warns?|warned|vows?|vowed|threatens?|launched|fired|fires|bombed|strikes?|struck|hits?|hit|attacks?|attacked|intercepts?|intercepted|held|resumed|signed|withdrew|says?)\b/i);
 const subject=verbAt<0?'':title.slice(0,verbAt),byActor=title.match(/\bby (?:the |Iran-backed )?(Houthis?|Iran|Israel|Saudi Arabia|US)\b/i)?.[1];
 const actorText=byActor??subject;
 const actor=actors.map(([id,re])=>({id,at:actorText.search(re)})).filter(x=>x.at>=0).sort((a,b)=>a.at-b.at)[0]?.id??'UNKNOWN';
 return {accepted:true,rule:r.id,type:r.type,delta:r.delta,reason:r.reason,date:article.date,publicationDate:article.date,eventDate:null,actor,target,location,scope:regional?'REGIONAL':'DIRECT',sourceUrl:article.sourceUrl,evidence:title,eventKey:JSON.stringify([article.date,r.id,identity]),classifierVersion:CLASSIFIER_VERSION,claimVerification:'SINGLE_SOURCE_REPORT',eventVerified:false};
}
const clamp=n=>Math.max(0,Math.min(100,n));
export function buildReferenceFlowR3(events,{asOfDate,baselineDate='2026-09-09'}={}){
 if(!validDate(asOfDate)||!validDate(baselineDate)||baselineDate>asOfDate)throw Error('R3_DATE_INVALID');
 const unique=new Map();
 for(const e of events){
  const r=R3_RULES.find(r=>r.id===e.rule&&r.type===e.type&&r.delta===e.delta);
  if(!e.accepted||!r||!trustedR3Url(e.sourceUrl)||!validDate(e.date)||e.date<baselineDate||e.date>asOfDate||!e.eventKey)continue;
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
 const observedDomains=[...new Set(ledger.map(e=>e.type))].sort();
 return {version:IRAN_FLOW_R3_VERSION,status:'REFERENCE',score:previous,baseline:50,baselineDate,displaySensitivity:1,historyMode:'RETROSPECTIVE_PUBLICATION_DATE',history:history.filter(p=>Date.parse(p.date+'T00:00:00Z')>=Date.parse(asOfDate+'T00:00:00Z')-13*86400000),domains,weights:FLOW_WEIGHTS,ledger,eventCount:ledger.length,asOfDate,probability:false,officialPeaceDetermination:false,observedDomains,unobservedDomains:Object.keys(FLOW_WEIGHTS).filter(k=>!observedDomains.includes(k)),saturatedDomains:Object.keys(domains).filter(k=>domains[k]===0||domains[k]===100),baselineMeaning:'미관측 영역의 50은 평온이나 중립 관측값이 아님',limitation:'이란·주변 분쟁 보도 흐름 참고용. 전쟁 강도·종전 확률이 아님. 미관측·수집 공백을 완화로 해석하지 않음.'};
}
