import test from 'node:test';
import assert from 'node:assert/strict';
import {computeOwnHistoryGrowthResearch,historicalMidPercentile,
  previewFdaCderFromOriginalVerifiedResult} from './stage05-industry-series-research.mjs';
import {FDA_CDER_2025_PDF,FDA_CDER_2025_SHA256} from '../stage04/fda-cder-official-readonly.mjs';

const observations=[[2016,22],[2017,46],[2018,59],[2019,48],[2020,53],
  [2021,50],[2022,37],[2023,54],[2024,50],[2025,46]]
  .map(([year,value])=>({period:String(year),value,seriesId:'FDA_2025_PINNED_PDF'}));
const input=()=>({observations,frequency:'ANNUAL',asOfDate:'2026-10-28',
  validatedDate:'2026-10-28',metricId:'FDA_CDER_NOVEL_APPROVALS',
  region:'US_NOVEL_DRUG_APPROVALS_NOT_BIOTECH',unit:'approvals_per_year',
  seriesId:'FDA_2025_PINNED_PDF',sourceStatus:'SOURCE_VERIFIED'});
const original=()=>({state:'OFFICIAL_PDF_LIVE_HASH_VALIDATED_FIXED_REPORT_RESEARCH_ONLY',
  sourceSha256:FDA_CDER_2025_SHA256,officialPdf:FDA_CDER_2025_PDF,
  sourceDocumentYear:2025,observationPeriod:'2025',
  latestRawCount:46,priorYearRawCount:50,priorTwoYearRawCount:54,
  historicalAnnualObservations:10,historicalYoyReferenceCount:8,
  historicalAccelerationReferenceCount:7,yoyGrowthPct:-8,
  sequentialYoyAccelerationPctPoints:-8-100*(50/54-1)});

test('R2 historical-own-series percentile counts ties at half rank',()=>{
  assert.equal(historicalMidPercentile(2,[1,2,2,3]),50);
  assert.equal(historicalMidPercentile(9,[1,2,3]),100);
});
test('FDA archived one-vintage observed 2016-2025 yields 2025 growth and acceleration preview',()=>{
  const r=computeOwnHistoryGrowthResearch(input());
  assert.equal(r.observations,10);
  assert.equal(r.priorGrowthReferenceCount,8);
  assert.equal(r.priorAccelerationReferenceCount,7);
  assert.equal(r.latestYoyPct,-8);
  assert.equal(r.G1_research,12.5);
  assert.equal(r.G2_research,35.714286);
  assert.equal(r.G_research,21.785714);
  assert.equal(r.approvedM4,null);
  assert.equal(r.stage05S5,null);
  assert.ok(r.G_research>0&&r.G_research<50);
});
test('same pinned FDA source result is cross-checked, never converted into official biotech M4',()=>{
  const r=previewFdaCderFromOriginalVerifiedResult(original(),{
    asOfDate:'2026-10-28',validatedDate:'2026-10-28'});
  assert.equal(r.proof.sourceSha256,FDA_CDER_2025_SHA256);
  assert.equal(r.scopeGate,'PROXY_SCOPE_LIMITED_NO_STAGE04_M4_NO_STAGE05_RANKING');
  assert.equal(r.approvedG,null);assert.equal(r.approvedD,null);
});
test('pinned source revision or historical latest number drift fails closed',()=>{
  const x=original();x.sourceSha256='0'.repeat(64);
  assert.throws(()=>previewFdaCderFromOriginalVerifiedResult(x,{asOfDate:'2026-10-28',
    validatedDate:'2026-10-28'}),/FDA_ORIGINAL_VERIFIED_REPORT_MISMATCH/);
  const y=original();y.priorYearRawCount=52;
  assert.throws(()=>previewFdaCderFromOriginalVerifiedResult(y,{asOfDate:'2026-10-28',
    validatedDate:'2026-10-28'}),/FDA_ORIGINAL_VERIFIED_REPORT_MISMATCH/);
});
test('same source identity and chronological observation gaps are enforced',()=>{
  const a=input();a.observations=observations.map(x=>({...x}));
  a.observations[3].seriesId='OTHER_PUBLISHER';
  assert.throws(()=>computeOwnHistoryGrowthResearch(a),/INDUSTRY_SERIES_GAP_OR_VALUE_INVALID/);
  const b=input();b.observations=observations.map(x=>({...x}));
  b.observations[3].period='2021';
  assert.throws(()=>computeOwnHistoryGrowthResearch(b),/INDUSTRY_SERIES_GAP_OR_VALUE_INVALID/);
});
test('future observations or source verification date cannot create an advance score',()=>{
  const x=input();x.asOfDate='2025-01-01';x.validatedDate='2025-01-01';
  assert.throws(()=>computeOwnHistoryGrowthResearch(x),/INDUSTRY_LOOKAHEAD_PERIOD/);
  const y=input();y.validatedDate='2026-10-29';
  assert.throws(()=>computeOwnHistoryGrowthResearch(y),/INDUSTRY_SOURCE_VALIDATION_DATE_INVALID/);
});
test('quarterly cadence uses same-quarter prior year, not QoQ mistaken as YoY',()=>{
  const rows=[];
  for(let year=2023;year<=2025;year++)for(let q=1;q<=4;q++)
    rows.push({period:`${year}:Q${q}`,value:100+(year-2023)*30+q*2,seriesId:'Q_SAMPLE'});
  const r=computeOwnHistoryGrowthResearch({observations:rows,frequency:'QUARTERLY',
    asOfDate:'2026-10-28',validatedDate:'2026-10-28',metricId:'Q_LIVE_METRIC',
    region:'REGION_FIXED',unit:'counts_per_quarter',seriesId:'Q_SAMPLE',
    sourceStatus:'SOURCE_VERIFIED'});
  assert.equal(r.lastObservationPeriod,'2025:Q4');
  assert.equal(r.previousComparableRawValue,138);
  assert.equal(r.latestRawValue,168);
  assert.equal(r.approvedM4,null);
});
test('unverified source cannot produce even research normalization',()=>{
  const x=input();x.sourceStatus='NOT_VERIFIED';
  assert.throws(()=>computeOwnHistoryGrowthResearch(x),/INDUSTRY_SOURCE_SCOPE_NOT_VERIFIED/);
});
