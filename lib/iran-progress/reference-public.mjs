import {IRAN_FLOW_VERSION,FLOW_WEIGHTS,FLOW_RULES} from './reference-flow-r1.mjs';
export const IRAN_FLOW_KEY='public:iran-progress:reference-flow:r1';
const score=n=>Number.isFinite(n)&&n>=0&&n<=100;
export function validateReferenceFlow(body,now=Date.now()){
 if(body?.version!==IRAN_FLOW_VERSION||!['REFERENCE','UPDATE_DELAYED'].includes(body.status)||!score(body.score)
  ||body.baseline!==50||body.probability!==false||body.officialPeaceDetermination!==false
  ||body.historyMode!=='RETROSPECTIVE_PUBLICATION_DATE'||!Number.isSafeInteger(body.publishedAt)||body.publishedAt<1||body.publishedAt>now
  ||!Number.isSafeInteger(body.collectionCheckedAt)||body.collectionCheckedAt<1||body.collectionCheckedAt>body.publishedAt
  ||!/^\d{4}-\d{2}-\d{2}$/.test(body.asOfDate??'')||!Number.isFinite(Date.parse(body.asOfDate+'T00:00:00Z'))||Date.parse(body.asOfDate+'T00:00:00Z')>now
  ||!Array.isArray(body.history)||body.history.length>14||!Array.isArray(body.events)||body.events.length>100)return false;
 if(Object.keys(FLOW_WEIGHTS).some(k=>!score(body.domains?.[k])))return false;
 if(Math.abs(Object.entries(FLOW_WEIGHTS).reduce((s,[k,w])=>s+w*body.domains[k],0)-body.score)>.000001)return false;
 let previous='';for(const p of body.history){if(!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||p.date<=previous||!score(p.value)||Date.parse(p.date+'T00:00:00Z')>now)return false;previous=p.date;}
 return body.events.every(e=>typeof e.reason==='string'&&e.reason.length<=100&&/^https:\/\/(?:www\.mofa\.go\.jp|www\.gov\.uk)\//.test(e.sourceUrl)&&FLOW_RULES.some(r=>r.id===e.rule&&r.type===e.type&&r.delta===e.delta));
}
