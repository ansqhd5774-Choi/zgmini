// Pure publication dry-run: no network, production mutation or approval grant.
import {ASSET_BUBBLE_R10_WEIGHTS} from './asset-bubble-r10-candidate.mjs';
export function assetR10PublicationDryRun(payload={}){
 const reasons=[];
 const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
 if(payload.methodologyVersion!=='ASSET_BUBBLE_R10_CANDIDATE')reasons.push('METHOD_VERSION_INVALID');
 if(payload.status!=='READY'||!valid(payload.score))reasons.push('COMPOSITE_NOT_READY');
 const parts=Object.fromEntries((payload.indicators??[]).map(r=>[r.id,r]));
 for(const id of Object.keys(ASSET_BUBBLE_R10_WEIGHTS)){
  const row=parts[id];
  if(!row||row.status!=='READY'||!valid(row.score))reasons.push('COMPONENT_NOT_READY:'+id);
 }
 if(Object.keys(ASSET_BUBBLE_R10_WEIGHTS).every(id=>valid(parts[id]?.score))){
  const expected=Object.entries(ASSET_BUBBLE_R10_WEIGHTS).reduce((n,[id,w])=>n+w*parts[id].score,0);
  if(!valid(payload.score)||Math.abs(expected-payload.score)>1e-8)reasons.push('COMPOSITE_MISMATCH');
 }
 if(!payload.sourceVersion||!Number.isFinite(payload.sourceStoredAt))reasons.push('SOURCE_IDENTITY_MISSING');
 const acceptedCurrentVintage=payload.publicationPolicy==='USER_APPROVED_CURRENT_VINTAGE_UNVERIFIED_SOURCES'&&payload.historyMode==='CURRENT_VINTAGE_ONLY'&&payload.rightsStatus==='USER_ACCEPTED_UNVERIFIED'&&payload.lookAheadSafe===false&&payload.priceQuality==='PROVIDER_DECLARED_WITH_QUARANTINE'&&payload.scoreObservationQuarter&&payload.diagnosticQuarter&&Array.isArray(payload.notes)&&payload.notes.length>=2;
 if(payload.rightsStatus!=='CLEARED_FOR_DERIVED_PUBLICATION'&&!acceptedCurrentVintage)reasons.push('RIGHTS_PENDING');
 if(payload.lookAheadSafe!==true&&!acceptedCurrentVintage)reasons.push('AS_OF_VALIDATION_PENDING');
 if(payload.productionEligible!==true)reasons.push('PRODUCTION_ELIGIBILITY_PENDING');
 return {status:reasons.length?'BLOCKED':'PASS',reasons,sent:false,providerRequests:0,dbWrites:0};
}
