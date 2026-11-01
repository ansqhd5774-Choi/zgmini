import {hash} from './store.mjs';
export const REVIEWED_FLOW_KEY='reference-flow-reviewed-signals-step6';
const rules={PROPOSAL_REVISED:['DIPLOMACY',3],PROPOSAL_RECEIVED:['DIPLOMACY',5],INDIRECT_CONTACT_CONTINUES:['DIPLOMACY',4],MEDIATOR_MEETING:['DIPLOMACY',4],DIALOGUE_WILLINGNESS:['DIPLOMACY',2],NAVIGATION_TECHNICAL_AGREEMENT:['MARITIME',5],MILITARY_WARNING:['MILITARY',-3],US_DRONE_SEIZED:['MILITARY',-8],PROPOSAL_REJECTED:['DIPLOMACY',-6],HORMUZ_PROJECTILE_REPORT:['MARITIME',-8],HORMUZ_TURNBACK_REPORT:['MARITIME',-4],NEGOTIATION_SEQUENCE_GAP:['DIPLOMACY',-3],MILITARY_REINFORCEMENT_REPORT:['MILITARY',-4],MILITARY_PREPARATION_REPORT:['MILITARY',-3]};
export function reviewedSignals(checkpoint){
 if(!checkpoint)return [];
 if(checkpoint.version!=='REVIEWED_NEWS_FLOW_STEP6'||checkpoint.eventsHash!==hash(checkpoint.events)||!Array.isArray(checkpoint.events)||checkpoint.events.length>100)throw Error('REVIEWED_FLOW_INVALID');
 for(const e of checkpoint.events){
  const rule=rules[e.rule];let host;try{host=new URL(e.sourceUrl).hostname;}catch{throw Error('REVIEWED_FLOW_SOURCE_INVALID');}
  if(!rule||rule[0]!==e.type||rule[1]!==e.delta||e.accepted!==true||!/^2026-\d\d-\d\d$/.test(e.date)||!Number.isFinite(Date.parse(e.date))||typeof e.evidence!=='string'||!e.evidence||!['www.tasnimnews.ir','www.ukmto.org','amp.dw.com','www.axios.com','bloomberg.com'].includes(host))throw Error('REVIEWED_FLOW_EVENT_INVALID');
 }
 return checkpoint.events;
}
