// News-direction prototype. Baseline 50 is a reference, not an observed peace probability.
export const IRAN_FLOW_VERSION='IRAN_REFERENCE_FLOW_R1';
export const FLOW_WEIGHTS={DIPLOMACY:.30,CEASEFIRE:.25,MILITARY:.20,MARITIME:.15,NUCLEAR:.10};
export const FLOW_RULES=[
 {id:'MILITARY_ESCALATION',type:'MILITARY',delta:-25,pattern:/\b(?:attacked|attacks had caused damage|resumption of exchanges of attacks|continued attacks|launched (?:an? )?(?:attack|strike|missiles)|military strikes|missile attacks|armed attacks|bombed)\b/i,reason:'공격·군사 충돌 보도'},
 {id:'CEASEFIRE_VIOLATION',type:'CEASEFIRE',delta:-30,pattern:/\b(?:violated (?:the )?ceasefire|ceasefire violations|broke (?:the )?ceasefire)\b/i,reason:'휴전 위반 보도'},
 {id:'DIPLOMACY_BREAKDOWN',type:'DIPLOMACY',delta:-20,pattern:/\b(?:talks collapsed|negotiations collapsed|talks broke down|withdrew from (?:the )?talks)\b/i,reason:'협상 결렬·철회 보도'},
 {id:'CEASEFIRE_AGREEMENT',type:'CEASEFIRE',delta:25,pattern:/\b(?:agreed to (?:a )?ceasefire|ceasefire agreement was signed|ceasefire took effect)\b/i,reason:'휴전 합의·발효 보도'},
 {id:'DIPLOMACY_TALKS',type:'DIPLOMACY',delta:15,pattern:/\b(?:held (?:indirect |direct )?talks|resumed (?:indirect |direct )?talks|talks between.{0,70}have been underway|negotiations resumed|mediation efforts.{0,60}continue)\b/i,reason:'협상 개최·재개·중재 지속 보도'},
 {id:'MARITIME_DISRUPTION',type:'MARITIME',delta:-20,pattern:/\b(?:vessel was attacked|vessels were attacked|shipping attacks|strait.{0,30}closed|navigation.{0,30}disrupted|disruption of free and safe navigation)\b/i,reason:'호르무즈 공격·통항 방해 보도'},
 {id:'MARITIME_RESTORED',type:'MARITIME',delta:20,pattern:/\b(?:strait.{0,30}reopened|navigation.{0,30}restored|shipping.{0,30}resumed)\b/i,reason:'호르무즈 통항 재개 보도'},
 {id:'NUCLEAR_AGREEMENT',type:'NUCLEAR',delta:20,pattern:/\b(?:nuclear agreement.{0,30}signed|inspectors.{0,30}returned|inspections.{0,30}resumed)\b/i,reason:'핵 합의·사찰 재개 보도'},
];
const clamp=n=>Math.max(0,Math.min(100,n));
export function classifyFlowCandidate(c,source){
 if(!source?.text?.includes(c?.quote)||!/^\d{4}-\d{2}-\d{2}$/.test(source.publishedDate??''))return {accepted:false,reason:'SOURCE_MISMATCH'};
 if(c.claimStatus!=='ASSERTED')return {accepted:false,reason:'NOT_ASSERTED'};
 const sentences=c.quote.split(/(?<=[.!?])\s+(?=[A-Z])/);
 const matches=[];
 for(const text of sentences){
  if(!/\bIran(?:ian)?\b|\bIRGC\b/i.test(text))continue;
  if(c.type==='MARITIME'&&!/Hormuz/i.test(text))continue;
  if(/\b(?:should|must|urge|urges|call on|calls on|could|may|if|not|never|denied)\b/i.test(text))continue;
  for(const rule of FLOW_RULES.filter(r=>r.type===c.type&&r.pattern.test(text)))matches.push({rule,text});
 }
 if(new Set(matches.map(m=>m.rule.id)).size!==1)return {accepted:false,reason:matches.length?'MIXED_SIGNAL':'NO_ASSERTED_RULE'};
 const {rule:r,text:evidence}=matches[0];
 return {accepted:true,rule:r.id,type:r.type,delta:r.delta,reason:r.reason,date:source.publishedDate,sourceUrl:source.sourceUrl,evidence};
}
export function buildReferenceFlow(events,{asOfDate,baselineDate='2026-09-09',collectionOk=true,previousResult}={}){
 if(!collectionOk){
  if(!previousResult)throw Error('FLOW_NO_VALID_PREVIOUS_RESULT');
  return {...previousResult,status:'UPDATE_DELAYED'};
 }
 const start=Date.parse(baselineDate+'T00:00:00Z');
 if(!Number.isFinite(start))throw Error('FLOW_DATE_INVALID');
 const by=new Map();
 for(const e of events){
  if(!e.accepted||!Object.hasOwn(FLOW_WEIGHTS,e.type)||!Number.isFinite(e.delta)||e.date>asOfDate||Date.parse(e.date+'T00:00:00Z')<start)continue;
  // Cross-source identity is supplied by review; otherwise exact evidence duplicates collapse.
  const key=e.eventKey??JSON.stringify([e.date,e.type,e.rule,e.evidence.toLowerCase()]);
  if(!by.has(key))by.set(key,e);
 }
 const accepted=[...by.values()].sort((a,b)=>a.date.localeCompare(b.date)),domains=Object.fromEntries(Object.keys(FLOW_WEIGHTS).map(k=>[k,50]));
 const history=[],ledger=[];let previous=50;
 for(const date of [...new Set(accepted.map(e=>e.date))]){
  // One direction/rule per date limits repeated articles about an unresolved event.
  const applied=new Set();
  for(const e of accepted.filter(e=>e.date===date)){
   const k=e.type+':'+e.rule;if(applied.has(k))continue;applied.add(k);
   domains[e.type]=clamp(domains[e.type]+e.delta);ledger.push(e);
  }
  const value=Object.entries(FLOW_WEIGHTS).reduce((s,[k,w])=>s+w*domains[k],0);
  history.push({date,value:Number(value.toFixed(2)),delta:Number((value-previous).toFixed(2))});previous=value;
 }
 return {version:IRAN_FLOW_VERSION,status:'REFERENCE',score:history.at(-1)?.value??50,baseline:50,baselineDate,baselineMeaning:'임시 기준점 · 미관측 영역도 기준점에서 시작',historyMode:'RETROSPECTIVE_PUBLICATION_DATE',history:history.filter(p=>Date.parse(p.date+'T00:00:00Z')>=Date.parse(asOfDate+'T00:00:00Z')-13*86400000),domains,weights:FLOW_WEIGHTS,ledger,eventCount:ledger.length,asOfDate,probability:false,officialPeaceDetermination:false,limitation:'보도 흐름 참고용. 기사 발표일 기준으로 날짜별 같은 규칙은 1회 반영하며 실제 사건 건수나 종전 확률을 뜻하지 않음.'};
}
