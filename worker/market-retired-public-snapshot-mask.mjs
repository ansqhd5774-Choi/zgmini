// Single fail-closed MarketParquet retirement mask for both the production and candidate SELECT-only market-score readers.
// Historical snapshots are not edited, and approved weights are never recomputed.
import {MARKETPARQUET_REMOVED_CODE,hasMarketParquetProvenance} from '../lib/marketparquet-retirement.mjs';

/**
 * Fail closed for previously published retired-provider data, without editing
 * historical D1 rows or recomputing the approved composite with new weights.
 * Independent stored domains remain available in both JSON and NDJSON.
 */
function containsRetiredMarketSource(value,depth=0){
 if(!value||typeof value!=='object')return false;
 if(depth>32)return true;
 if(hasMarketParquetProvenance(value))return true;
 return Object.values(value).some(child=>containsRetiredMarketSource(child,depth+1));
}
export function maskRetiredMarketPublicSnapshot(body){
 if(!body||typeof body!=='object')return null;
 if(!Array.isArray(body.domains))return containsRetiredMarketSource(body)?null:body;
 let removed=false;
 const domains=body.domains.map(domain=>{
  if(!containsRetiredMarketSource(domain))return domain;
  removed=true;
  return {
   id:domain.id,name:domain.name,weight:domain.weight,
   score:null,status:'UNAVAILABLE',state:MARKETPARQUET_REMOVED_CODE,
   trend:[],indicators:[],missingFactors:[],
  };
 });
 if(!removed)return containsRetiredMarketSource(body)?null:body;
 const ready=domains.filter(d=>d?.status==='READY'&&Number.isFinite(d?.score)&&d.score>=0&&d.score<=100);
 const safe={
  ...body,
  domains,
  // The old aggregate and all of its history included the retired domain.
  overall:{score:null,status:'PARTIAL',state:MARKETPARQUET_REMOVED_CODE,trend:[]},
  dataQuality:{
   ...body.dataQuality,
   readyDomains:ready.length,totalDomains:domains.length,
   missingDomains:domains.filter(d=>d?.status==='UNAVAILABLE').map(d=>d.id),
   partialDomains:domains.filter(d=>d?.status!=='READY'&&d?.status!=='UNAVAILABLE').map(d=>d.id),
   coverageWeight:ready.reduce((sum,d)=>sum+(Number.isFinite(d.weight)?d.weight:0),0),
   overallComputable:false,reweighted:false,
  },
 };
 // A second source elsewhere in the payload must not escape by accident.
 return containsRetiredMarketSource(safe)?null:safe;
}

