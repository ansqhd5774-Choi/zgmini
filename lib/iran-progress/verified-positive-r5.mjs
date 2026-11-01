/**
 * R5 candidate: independent corroboration of material *positive* implementation.
 * A single report, prediction, meeting or promise cannot raise public score.
 * Requires a dated official source + another independently hosted publication.
 * No network calls, only previously stored and validated R3 articles.
 */
import {trustedR3Url} from './reference-flow-r3.mjs';

const OFFICIAL=new Set(['news.un.org','www.gov.uk','www.iaea.org']);
const REAL_IMPLEMENTATION=new Set([
 'CEASEFIRE_IMPLEMENTED','MILITARY_WITHDRAWAL','MARITIME_REOPENED',
 'NUCLEAR_SIGNED','INSPECTIONS_RESUMED'
]);
const day=d=>Date.parse(d+'T00:00:00Z');
const words=s=>new Set(String(s??'').toLowerCase()
 .replace(/\b(?:the|and|from|have|that|this|with|after|official|officially|said|says)\b/g,' ')
 .match(/[a-z]{4,}/g)??[]);
const overlap=(a,b)=>{
 const x=words(a),y=words(b),union=new Set([...x,...y]);
 return union.size===0?0:[...x].filter(w=>y.has(w)).length/union.size;
};
export function independentlyCorroboratedR5Positives(resolved,allAccepted){
 if(!Array.isArray(resolved)||!Array.isArray(allAccepted))throw Error('R5_POSITIVE_EVENTS_INVALID');
 return resolved.map(e=>{
  if(!REAL_IMPLEMENTATION.has(e.rule)||e.delta<=0||e.eventVerified===true)return e;
  if(!trustedR3Url(e.sourceUrl)||!Number.isFinite(day(e.date)))return e;
  const alternatives=allAccepted.filter(p=>
   p.accepted===true&&p.rule===e.rule&&p.type===e.type&&
   p.delta===e.delta&&trustedR3Url(p.sourceUrl)&&
   new URL(p.sourceUrl).hostname!==new URL(e.sourceUrl).hostname&&
   Math.abs(day(p.date)-day(e.date))<=86400000&&
   (p.location==='unknown'||e.location==='unknown'||p.location===e.location)&&
   (p.actor==='UNKNOWN'||e.actor==='UNKNOWN'||p.actor===e.actor)&&
   overlap(p.evidence,e.evidence)>=0.45);
  const eHost=new URL(e.sourceUrl).hostname;
  const fromDifferentOrg=alternatives.find(p=>
   OFFICIAL.has(eHost)||OFFICIAL.has(new URL(p.sourceUrl).hostname));
  if(!fromDifferentOrg)return e;
  return {...e,eventVerified:true,claimVerification:'OFFICIAL_AND_INDEPENDENT_SECOND_SOURCE',
   verificationSourceCount:2};
 });
}
