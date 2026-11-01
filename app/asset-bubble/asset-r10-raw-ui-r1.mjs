// Presentation-only join of the scored R10 response and validated raw sidecar.
import {sameR10StoredSourceOrContent} from './asset-r10-source-vintage-r2.mjs';
// No score change, score rounding, date extrapolation, or invented observations.
const IDS=Object.freeze(['valuationPressure','priceAcceleration','riskAssetShare',
 'speculativeFlows','breadthDivergence','excessLiquidity']);
const UNITS=Object.freeze(['TIMES_GDP','LOG_PERCENT_POINTS','PERCENTAGE_POINTS',
 'PERCENT_OF_PRIOR_HOLDINGS','PERCENTILE_POINTS','PERCENTAGE_POINTS']);
const DISPLAY_UNITS=Object.freeze(['배','로그 %p','%p','%','백분위점','%p']);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const near=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<1e-7;
const isoDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)
 &&Number.isFinite(Date.parse(x+'T00:00:00Z'))
 &&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;

// Only the two source observations actually stored in the raw sidecar.
// Never interpolate them or label the pair as a complete one-year history.
const observedPair=r=>finite(r.previousValue)&&finite(r.value)
 &&isoDate(r.previousObservationDate)&&isoDate(r.observationDate)
 &&r.previousObservationDate<r.observationDate
 ?[{date:r.previousObservationDate,value:r.previousValue},
   {date:r.observationDate,value:r.value}]:undefined;

export function mergeAssetR10RawForUi(scored,raw){
 if(!scored||!raw||raw.schemaVersion!=='asset-bubble-r10-raw-r1-v1'
  ||raw.status!=='READY'||scored.status!=='READY'
  ||scored.methodologyVersion!=='ASSET_BUBBLE_R10_CANDIDATE'
  ||scored.historyMode!=='CURRENT_VINTAGE_ONLY'
  ||scored.rightsStatus!=='USER_ACCEPTED_UNVERIFIED'
  ||raw.rightsStatus!==scored.rightsStatus
  ||!sameR10StoredSourceOrContent(scored,raw)
  ||scored.scoreObservationQuarter!==raw.scoreObservationQuarter
  ||!near(scored.score,raw.diagnosticScore)
  ||!Array.isArray(scored.indicators)||scored.indicators.length!==6
  ||!Array.isArray(raw.factors)||raw.factors.length!==6)return scored;
 for(let i=0;i<6;i++){
  const r=raw.factors[i],s=scored.indicators[i];
  if(r?.id!==IDS[i]||s?.id!==IDS[i]||s.status!=='READY'
   ||r.unit!==UNITS[i]||!near(s.score,r.score)||!finite(r.value)
   ||!(r.previousValue===null||finite(r.previousValue)))return scored;
 }
 return {...scored,indicators:scored.indicators.map((row,i)=>({...row,
  value:raw.factors[i].value,previousValue:raw.factors[i].previousValue,
  observationDate:raw.factors[i].observationDate,
  previousObservationDate:raw.factors[i].previousObservationDate,
  unit:DISPLAY_UNITS[i],rawUnit:raw.factors[i].unit,
  source:raw.factors[i].source,
  trend:observedPair(raw.factors[i]),
 }))};
}
