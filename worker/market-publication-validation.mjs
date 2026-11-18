import {DOMAIN_WEIGHTS,COMPOSITE_MODEL_VERSION} from '../lib/market-score/composite-model-r1.mjs';
import {MARKETPARQUET_REMOVED_CODE} from '../lib/marketparquet-retirement.mjs';
import {maskRetiredMarketPublicSnapshot} from './market-retired-public-snapshot-mask.mjs';

const score=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const emptyList=value=>Array.isArray(value)&&value.length===0;
const exactList=(value,wanted)=>Array.isArray(value)&&
 value.length===wanted.length&&value.every((item,index)=>item===wanted[index]);

// Do not require the retired breadth provider to return a score before updating
// independently validated domains. This is *not* a general partial-publish gate:
// a single extra incomplete domain, a stale provider score, or a reweighted
// composite still fails the same publication assertion.
export function isRetiredBreadthPartialMarket(body){
 if(body?.status!=='SUCCESS'||body?.modelVersion!==COMPOSITE_MODEL_VERSION||
  !/^\d{4}-\d{2}-\d{2}$/.test(body?.asOfDate??''))return false;
 if(body.overall?.status!=='PARTIAL'||body.overall.score!==null||
  body.overall.state!==MARKETPARQUET_REMOVED_CODE||!emptyList(body.overall.trend))return false;
 const domains=body.domains;
 if(!Array.isArray(domains)||domains.length!==DOMAIN_WEIGHTS.length)return false;
 for(const spec of DOMAIN_WEIGHTS){
  const matches=domains.filter(domain=>domain?.id===spec.id&&domain.weight===spec.weight);
  if(matches.length!==1)return false;
  const domain=matches[0];
  if(spec.id==='breadth'){
   if(domain.status!=='UNAVAILABLE'||domain.score!==null||
    domain.state!==MARKETPARQUET_REMOVED_CODE||
    !emptyList(domain.indicators)||!emptyList(domain.trend)||!emptyList(domain.missingFactors))return false;
  }else if(domain.status!=='READY'||!score(domain.score))return false;
 }
 const quality=body.dataQuality;
 if(quality?.totalDomains!==DOMAIN_WEIGHTS.length||
  quality.readyDomains!==DOMAIN_WEIGHTS.length-1||
  quality.coverageWeight!==DOMAIN_WEIGHTS.filter(spec=>spec.id!=='breadth')
   .reduce((sum,spec)=>sum+spec.weight,0)||
  quality.overallComputable!==false||quality.reweighted!==false||
  !exactList(quality.missingDomains,['breadth'])||!emptyList(quality.partialDomains))return false;
 // The reader's existing rights mask must not have to redact or discard
 // anything in this already-publication-safe payload.
 return maskRetiredMarketPublicSnapshot(body)===body;
}

export function assertCompleteMarket(body){
 if(body?.status!=='SUCCESS'||!Array.isArray(body.domains)||
  body.domains.length!==DOMAIN_WEIGHTS.length)throw Error('MARKET_REQUIRED_SCORE_MISSING');
 const full=body.overall?.status==='READY'&&score(body.overall.score)&&
  DOMAIN_WEIGHTS.every(spec=>body.domains.filter(x=>
   x?.id===spec.id&&x.status==='READY'&&score(x.score)).length===1);
 if(full){
  if(!Array.isArray(body.overall.trend)||
   !body.overall.trend.some(p=>score(p?.value??p?.score)))throw Error('MARKET_REQUIRED_TREND_MISSING');
  return;
 }
 if(isRetiredBreadthPartialMarket(body))return;
 throw Error('MARKET_REQUIRED_SCORE_MISSING');
}
