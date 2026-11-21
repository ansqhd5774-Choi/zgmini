import {PAID_BREADTH_KEY,validPaidBreadthRecord} from './breadth-paid-contract.mjs';
import {countCompletedSessionsSince} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
export async function readPaidBreadthRow(db){return db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").bind(PAID_BREADTH_KEY).first();}
export function paidBreadthDomainFromRow(row,{now=Date.now()}={}){
 let b;try{b=JSON.parse(row?.body);}catch{return null;}
 if(!validPaidBreadthRecord(b)||[Number(row.stored_at),Date.parse(b.sourceStoredAt),Date.parse(b.updatedAt)].some(t=>!Number.isSafeInteger(t)||t>now||now-t>=PUBLIC_DISPLAY_MAX_AGE_MS)||Date.parse(b.observationDate+'T00:00:00Z')>now||countCompletedSessionsSince(b.observationDate,new Date(now))>2)return null;
 const d=b.domain;
 // Explicit derived-only projection; raw prices and unexpected fields cannot escape.
 return {id:d.id,name:d.name,status:d.status,score:d.score,source:d.source,methodologyVersion:d.methodologyVersion,state:d.state,interpretation:d.interpretation,observationDate:d.observationDate,asOfDate:d.asOfDate,updatedAt:d.updatedAt,freshness:d.freshness,missingFactors:[],trend:d.trend.map(p=>({label:p.label,value:p.value})),indicators:d.indicators.map(p=>({id:p.id,name:p.name,label:p.label,status:p.status,score:p.score,value:p.value,unit:p.unit,asOfDate:p.asOfDate,observationDate:p.observationDate,source:p.source,sourceKey:p.sourceKey,freshness:p.freshness,missing:[]})),paidSource:{version:b.version,plan:'full',sourceVersion:b.sourceVersion,pitSha256:b.pitSha256,inputSha256:b.inputSha256,observationDate:b.observationDate,sourceLatestDate:b.sourceLatestDate,returnCoverage:b.quality.returnCoverage,tradingValueCoverage:b.quality.tradingValueCoverage}};
}
export async function overlayPaidBreadth(body,{readPaid,now=Date.now()}={}){
 if(!body||!Array.isArray(body.domains)||typeof readPaid!=='function')return body;
 // A complete composite is one atomic calculation; never overlay a newer
 // component while leaving its weighted overall score at the old value.
 if(body.overall?.status==='READY')return body;
 let domain;try{domain=paidBreadthDomainFromRow(await readPaid(),{now});}catch{return body;}if(!domain)return body;
 if(body.domains.filter(d=>d.id==='breadth').length!==1)return body;
 const domains=body.domains.map(d=>d.id==='breadth'?{...domain,weight:d.weight}:d),ready=domains.filter(d=>d.status==='READY'&&typeof d.score==='number'&&Number.isFinite(d.score));
 return {...body,domains,dataQuality:{...body.dataQuality,readyDomains:ready.length,missingDomains:domains.filter(d=>d.status==='UNAVAILABLE').map(d=>d.id),partialDomains:domains.filter(d=>!['READY','UNAVAILABLE'].includes(d.status)).map(d=>d.id),coverageWeight:ready.reduce((s,d)=>s+d.weight,0)}};
}
