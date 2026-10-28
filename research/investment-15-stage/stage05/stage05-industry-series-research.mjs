/**
 * R80: source-by-source realized-activity growth/acceleration replay.
 * Only a research preview of Stage04 R2's historical-own-series transform;
 * a narrow operational proxy must NOT be promoted to whole-industry M4 or S5.
 */
import {FDA_CDER_2025_PDF,FDA_CDER_2025_SHA256} from '../stage04/fda-cder-official-readonly.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const yearOf = period => /^(?:19|20)\d{2}$/.test(period) ? Number(period) : null;
const quarterOf = period => {
  const m=/^((?:19|20)\d{2}):Q([1-4])$/.exec(period);
  return m ? Number(m[1])*4+Number(m[2])-1 : null;
};
const pct = (current,previous) => 100*(current/previous-1);
const round = value => value===null?null:Math.round((value+Number.EPSILON)*1e6)/1e6;

export function historicalMidPercentile(value, previous) {
  if(!finite(value)||!Array.isArray(previous)||previous.length===0||previous.some(x=>!finite(x)))
    throw new Error('INDUSTRY_PERCENTILE_REQUIRES_ACTUAL_PRIOR_OBSERVATIONS');
  const lower=previous.filter(x=>x<value).length;
  const tied=previous.filter(x=>x===value).length;
  return 100*(lower+0.5*tied)/previous.length;
}

/**
 * Actual chronological observations from one source, metric, region, and unit.
 * Minimum historical reference count is deliberately not presented as approved.
 */
export function computeOwnHistoryGrowthResearch({observations,frequency,asOfDate,
  metricId,region,unit,seriesId,validatedDate,sourceStatus}={}) {
  if(sourceStatus!=='SOURCE_VERIFIED' || !metricId || !region || !unit || !seriesId)
    throw new Error('INDUSTRY_SOURCE_SCOPE_NOT_VERIFIED');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate||'') || Number.isNaN(Date.parse(asOfDate+'T00:00:00Z')))
    throw new Error('INDUSTRY_AS_OF_INVALID');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(validatedDate||'')||validatedDate>asOfDate)
    throw new Error('INDUSTRY_SOURCE_VALIDATION_DATE_INVALID');
  if(!['ANNUAL','QUARTERLY'].includes(frequency)||!Array.isArray(observations)
    ||observations.length<(frequency==='ANNUAL'?4:9))throw new Error('INDUSTRY_SERIES_TOO_SHORT');
  const ordinal=frequency==='ANNUAL'?yearOf:quarterOf;
  const periods=observations.map(x=>x?.period);
  const ticks=periods.map(ordinal);
  if(ticks.some(x=>x===null)||ticks.some((x,i)=>i&&x-ticks[i-1]!==1)
    ||observations.some(x=>!finite(x?.value)||x.value<=0||x.seriesId!==seriesId))
    throw new Error('INDUSTRY_SERIES_GAP_OR_VALUE_INVALID');
  const endYear=frequency==='ANNUAL'?ticks.at(-1):Math.floor(ticks.at(-1)/4);
  const endQuarter=frequency==='QUARTERLY'?ticks.at(-1)%4+1:null;
  const latestPeriodEnd=frequency==='ANNUAL'?`${endYear}-12-31`
    :`${endYear}-${String(endQuarter*3).padStart(2,'0')}-${new Date(Date.UTC(endYear,endQuarter*3,0)).getUTCDate()}`;
  if(latestPeriodEnd>asOfDate)throw new Error('INDUSTRY_LOOKAHEAD_PERIOD');
  const lag=frequency==='ANNUAL'?1:4;
  const values=observations.map(x=>x.value);
  const growth=values.map((v,i)=>i<lag?null:pct(v,values[i-lag]));
  const accel=growth.map((g,i)=>i<=lag?null:g-growth[i-1]);
  const newest=growth.length-1;
  const pastGrowth=growth.slice(lag,-1).filter(finite);
  const pastAccel=accel.slice(lag+1,-1).filter(finite);
  if(!finite(growth[newest])||!finite(accel[newest])
    ||!pastGrowth.length||!pastAccel.length)throw new Error('INDUSTRY_PRIOR_DISTRIBUTION_MISSING');
  const pGrowth=historicalMidPercentile(growth[newest],pastGrowth);
  const pAccel=historicalMidPercentile(accel[newest],pastAccel);
  const G1=growth[newest]>0?50+0.5*pGrowth:0.5*pGrowth;
  const G2=accel[newest]>0?50+0.5*pAccel:0.5*pAccel;
  return {status:'RESEARCH_G_PREVIEW_NOT_APPROVED_M4',metricId,region,unit,frequency,
    asOfDate,validatedDate,seriesId,lastObservationPeriod:periods.at(-1),observations:values.length,
    priorGrowthReferenceCount:pastGrowth.length,
    priorAccelerationReferenceCount:pastAccel.length,
    latestRawValue:values.at(-1),previousComparableRawValue:values[newest-lag],
    latestYoyPct:round(growth[newest]),latestAccelerationPctPoints:round(accel[newest]),
    growthOwnHistoryPercentile:round(pGrowth),accelerationOwnHistoryPercentile:round(pAccel),
    G1_research:round(G1),G2_research:round(G2),G_research:round(0.6*G1+0.4*G2),
    approvedG:null,approvedD:null,approvedM4:null,stage05S5:null,
    limitation:'Own-history normalized proxy is not a validated whole-industry score; no approval to rank.',
  };
}

// Values from the existing Stage04 *single* FDA 2025 pinned report page 8.
// Duplicate snapshot is SHA + latest-three-vintage checked against the original
// Stage04 reader output; a revised PDF or another year's release fails closed.
const FDA_2025_PINNED_COUNTS=Object.freeze([
  [2016,22],[2017,46],[2018,59],[2019,48],[2020,53],
  [2021,50],[2022,37],[2023,54],[2024,50],[2025,46],
]);

export function previewFdaCderFromOriginalVerifiedResult(result,{asOfDate,validatedDate}={}) {
  if(result?.state!=='OFFICIAL_PDF_LIVE_HASH_VALIDATED_FIXED_REPORT_RESEARCH_ONLY'
    ||result.sourceSha256!==FDA_CDER_2025_SHA256
    ||result.officialPdf!==FDA_CDER_2025_PDF
    ||result.sourceDocumentYear!==2025
    ||result.observationPeriod!=='2025'
    ||result.latestRawCount!==46||result.priorYearRawCount!==50
    ||result.priorTwoYearRawCount!==54
    ||result.historicalAnnualObservations!==FDA_2025_PINNED_COUNTS.length
    ||!finite(result.yoyGrowthPct)||Math.abs(result.yoyGrowthPct+8)>1e-7)
    throw new Error('FDA_ORIGINAL_VERIFIED_REPORT_MISMATCH');
  const checked=computeOwnHistoryGrowthResearch({
    observations:FDA_2025_PINNED_COUNTS.map(([year,value])=>({period:String(year),value,
      seriesId:'FDA_2025_PINNED_PDF'})),
    frequency:'ANNUAL',asOfDate,validatedDate,seriesId:'FDA_2025_PINNED_PDF',
    metricId:'FDA_CDER_NOVEL_APPROVALS',
    region:'US_FDA_NOVEL_DRUG_APPROVALS_NOT_ENTIRE_BIOTECH',
    unit:'approvals_per_year',sourceStatus:'SOURCE_VERIFIED',
  });
  if(Math.abs(checked.latestAccelerationPctPoints-result.sequentialYoyAccelerationPctPoints)>0.000002
    ||checked.priorGrowthReferenceCount!==result.historicalYoyReferenceCount
    ||checked.priorAccelerationReferenceCount!==result.historicalAccelerationReferenceCount)
    throw new Error('FDA_GROWTH_HISTORY_DRIFT');
  return {...checked,proof:{sourceDocumentYear:2025,
    officialPdf:FDA_CDER_2025_PDF,sourceSha256:result.sourceSha256,
    verifiedResultState:result.state},
    scopeGate:'PROXY_SCOPE_LIMITED_NO_STAGE04_M4_NO_STAGE05_RANKING'};
}
