import {IRAN_FLOW_R2_VERSION,R2_RULES,trustedR2Url,validDate} from './reference-flow-r2.mjs';
import {FLOW_WEIGHTS} from './reference-flow-r1.mjs';
export const R2_COLLECTION_STATES=['UPDATED','NO_NEW_ARTICLES','ANALYZED_NO_CHANGE','ANALYSIS_PENDING','DISCOVERY_DELAYED','ANALYSIS_FAILED'];
const score=n=>Number.isFinite(n)&&n>=0&&n<=100;
export function validateReferenceFlowR2(b,now=Date.now()){
 if(b?.version!==IRAN_FLOW_R2_VERSION||!['REFERENCE','UPDATE_DELAYED'].includes(b.status)||!score(b.score)||b.displaySensitivity!==1||b.baseline!==50||b.probability!==false||b.officialPeaceDetermination!==false||b.historyMode!=='RETROSPECTIVE_PUBLICATION_DATE')return false;
 if(!validDate(b.asOfDate)||Date.parse(b.asOfDate+'T00:00:00Z')>now||!validDate(b.baselineDate)||b.baselineDate>b.asOfDate)return false;
 if(!Number.isSafeInteger(b.publishedAt)||b.publishedAt<1||b.publishedAt>now||!Number.isSafeInteger(b.collectionCheckedAt)||b.collectionCheckedAt<1||b.collectionCheckedAt>b.publishedAt)return false;
 if(!Number.isInteger(b.eventCount)||b.eventCount<1||!Array.isArray(b.history)||b.history.length>14||!Array.isArray(b.events)||b.events.length>100||!R2_COLLECTION_STATES.includes(b.newsCollection?.status))return false;
 if(Object.keys(FLOW_WEIGHTS).some(k=>!score(b.domains?.[k])||b.weights?.[k]!==FLOW_WEIGHTS[k]))return false;
 if(Math.abs(Object.entries(FLOW_WEIGHTS).reduce((s,[k,w])=>s+w*b.domains[k],0)-b.score)>0.000001)return false;
 let prev='';for(const p of b.history){if(!validDate(p.date)||p.date<=prev||p.date>b.asOfDate||p.date<b.baselineDate||Date.parse(p.date+'T00:00:00Z')<Date.parse(b.asOfDate+'T00:00:00Z')-13*86400000||!score(p.value)||!Number.isFinite(p.delta))return false;prev=p.date;}
 if(b.history.length&&b.history.at(-1).value!==b.score)return false;
 return b.events.every(e=>e.accepted===true&&e.eventVerified===false&&e.claimVerification==='SINGLE_SOURCE_REPORT'&&validDate(e.date)&&e.date<=b.asOfDate&&trustedR2Url(e.sourceUrl)&&typeof e.reason==='string'&&e.reason.length<=100&&R2_RULES.some(r=>r.id===e.rule&&r.type===e.type&&r.delta===e.delta));
}
