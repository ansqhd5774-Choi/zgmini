import {createHash} from 'node:crypto';
import {assertCompleteMarket} from '../../worker/market-publication-validation.mjs';

const DATE=/^\d{4}-\d{2}-\d{2}$/;
const VALID_OVERLAYS=new Map([
 ['BREADTH_V11_FIXED_5F_OBSERVED_EMA3_CONTINUITY','PC_LOCAL_STORED_V11'],
 ['BREADTH_R10_V9_FIXED_5F_VALID_OBSERVATION_SHADOW','PC_LOCAL_STORED_V9'],
]);
const digest=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const refuse=code=>Object.freeze({status:'UNPROVEN',code,oneYearPitVerified:false});

/**
 * Check one EXISTING D1 UTC date row against current and public display.
 * Never fetches or writes a D1/PC row. The public API may overlay only the
 * breadth domain with a separately published V11/V9 projection.
 * One matched current event is not 1Y PIT history or source-input provenance.
 */
export function compareMarketDatedD1Readback({snapshotKey,dateRow,currentRow,publicBody}={}){
 if(typeof snapshotKey!=='string'||!DATE.test(snapshotKey))return refuse('DATE_KEY_INVALID');
 const storedAt=dateRow?.stored_at??dateRow?.storedAt;
 const currentAt=currentRow?.stored_at??currentRow?.storedAt;
 if(!Number.isSafeInteger(storedAt)||storedAt<0||!Number.isSafeInteger(currentAt)||currentAt<0)return refuse('STORED_AT_INVALID');
 let date;
 try{date=new Date(storedAt).toISOString().slice(0,10)}catch{return refuse('STORED_AT_INVALID')}
 if(date!==snapshotKey)return refuse('DATE_KEY_UTC_MISMATCH');
 if(storedAt!==currentAt)return refuse('DATE_NOT_CURRENT_EVENT');
 const dateText=dateRow?.body;
 const currentText=currentRow?.body;
 if(typeof dateText!=='string'||typeof currentText!=='string'||dateText!==currentText)return refuse('DATE_CURRENT_BODY_MISMATCH');
 let stored;
 try{stored=JSON.parse(dateText);assertCompleteMarket(stored)}catch{return refuse('STORED_MARKET_INVALID')}
 const publicRecord=typeof publicBody==='string'?(()=>{try{return JSON.parse(publicBody)}catch{return null}})():publicBody;
 if(!publicRecord||publicRecord.status!=='SUCCESS'||!Array.isArray(publicRecord.domains)||publicRecord.domains.length!==12)return refuse('PUBLIC_MARKET_INVALID');
 if(!same(stored.overall,publicRecord.overall)||stored.asOfDate!==publicRecord.asOfDate)return refuse('PUBLIC_OVERALL_MISMATCH');
 const byId=new Map(publicRecord.domains.map(x=>[x?.id,x]));
 if(byId.size!==12)return refuse('PUBLIC_DOMAIN_IDS_INVALID');
 for(const domain of stored.domains){
  if(!byId.has(domain.id))return refuse('PUBLIC_DOMAIN_IDS_INVALID');
  if(domain.id!=='breadth'&&!same(domain,byId.get(domain.id)))return refuse('PUBLIC_NON_BREADTH_MISMATCH');
 }
 const storedBreadth=stored.domains.find(x=>x.id==='breadth');
 const publicBreadth=byId.get('breadth');
 if(same(storedBreadth,publicBreadth))return Object.freeze({status:'D1_DATE_CURRENT_PUBLIC_MATCH',snapshotKey,storedAt,bodySha256:digest(dateText),matchedDomainCount:12,breadthOverlay:'NONE',sameEventDisplayVerified:true,oneYearPitVerified:false});
 const expectedSource=VALID_OVERLAYS.get(publicBreadth?.methodologyVersion);
 if(!expectedSource||publicBreadth?.source!==expectedSource||publicBreadth?.status!=='READY'||!Number.isFinite(publicBreadth?.score)||publicBreadth.score<0||publicBreadth.score>100)return refuse('PUBLIC_BREADTH_OVERLAY_UNPROVEN');
 return Object.freeze({status:'D1_DATE_CURRENT_11_DOMAINS_MATCH',snapshotKey,storedAt,bodySha256:digest(dateText),matchedDomainCount:11,breadthOverlay:publicBreadth.methodologyVersion,sameEventDisplayVerified:false,oneYearPitVerified:false});
}
