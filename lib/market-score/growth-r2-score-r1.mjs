import crypto from 'node:crypto';
import {
  GROWTH_R2_METHOD,
  GROWTH_R2_FEATURE_IDS,
  GROWTH_R2_WEIGHTS,
  validateGrowthR2Contract,
} from './growth-r2-contract.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp100 = value => Math.max(0,Math.min(100,value));

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function addMonths(dateText, months) {
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return null;
  const y=d.getUTCFullYear(), m=d.getUTCMonth(), day=d.getUTCDate();
  const z=y*12+m+months, yy=Math.floor(z/12), mm=z%12;
  const maxDay=new Date(Date.UTC(yy,mm+1,0)).getUTCDate();
  const out=new Date(Date.UTC(yy,mm,Math.min(day,maxDay),23,59,59,999));
  return out.toISOString();
}
function addDays(dateText, days) {
  const d=new Date(dateText); if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime()+days*86400000).toISOString();
}
function staleDeadline(row) {
  const f=String(row?.frequency ?? '').toUpperCase();
  if (f.includes('QUARTER')) return addMonths(row.availableAt,6);
  if (f.includes('MONTH')) return addMonths(row.availableAt,2);
  if (f.includes('WEEK')) return addDays(row.availableAt,14);
  if (f.includes('DAILY') || f.includes('DAY')) return addDays(row.availableAt,2);
  return addMonths(row.availableAt,2);
}

function selectFeatureHistory(featureRecords, featureId, asOf) {
  const byObservation=new Map();
  for (const row of featureRecords ?? []) {
    if (row?.candidateId !== featureId || row?.pitEligible !== true) continue;
    if (typeof row.availableAt !== 'string' || row.availableAt > asOf) continue;
    if (typeof row.observationDate !== 'string' || !finite(row.harmonizedValue)) continue;
    const prev=byObservation.get(row.observationDate);
    if (!prev || row.availableAt > prev.availableAt ||
        (row.availableAt===prev.availableAt && String(row.vintageId??'') > String(prev.vintageId??''))) {
      byObservation.set(row.observationDate,row);
    }
  }
  return [...byObservation.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}

function expandingPercentile(rows) {
  const scores=[];
  const history=[];
  for (const row of rows) {
    const x=row.harmonizedValue;
    history.push(x);
    if (history.length < GROWTH_R2_METHOD.minHistory) continue;
    const less=history.filter(v=>v<x).length;
    const eq=history.filter(v=>v===x).length;
    const score=history.length===1 ? 50 :
      100*(less+0.5*(eq-1))/(history.length-1);
    scores.push({...row, featureScore:clamp100(score), validHistory:history.length});
  }
  return scores;
}

export function buildGrowthR2Score({featureRecords, asOf, codeSha='UNSET_CODE_SHA'}) {
  validateGrowthR2Contract();
  if (typeof asOf !== 'string' || Number.isNaN(new Date(asOf).getTime())) throw new Error('GROWTH_R2_ASOF_REQUIRED');
  const factors={};
  const missingFactors=[];
  const staleFactors=[];
  const inputIdentity=[];

  for (const id of GROWTH_R2_FEATURE_IDS) {
    const history=selectFeatureHistory(featureRecords,id,asOf);
    const scored=expandingPercentile(history);
    const latest=scored.at(-1);
    if (!latest) { missingFactors.push(id); continue; }
    const deadline=staleDeadline(latest);
    if (!deadline || asOf > deadline) { staleFactors.push(id); continue; }
    factors[id]={
      score:latest.featureScore,
      observationDate:latest.observationDate,
      availableAt:latest.availableAt,
      vintageId:latest.vintageId ?? null,
      sourceHash:latest.sourceHash ?? null,
      frequency:latest.frequency ?? null,
      validHistory:latest.validHistory,
    };
    inputIdentity.push({
      featureId:id,
      observationDate:latest.observationDate,
      availableAt:latest.availableAt,
      vintageId:latest.vintageId ?? null,
      sourceHash:latest.sourceHash ?? null,
      value:latest.harmonizedValue,
    });
  }

  const coverage=Object.keys(factors).length;
  const inputSnapshotId=crypto.createHash('sha256').update(canonical(inputIdentity)).digest('hex');
  if (missingFactors.length || staleFactors.length || coverage !== GROWTH_R2_METHOD.requiredCoverage) {
    return {
      status:'NOT_READY',
      score:null,
      asOf,
      inputSnapshotId,
      methodologyVersion:GROWTH_R2_METHOD.methodologyVersion,
      featureRegistryRevision:GROWTH_R2_METHOD.featureRegistryRevision,
      normalizationRevision:GROWTH_R2_METHOD.normalizationRevision,
      weightRevision:GROWTH_R2_METHOD.weightRevision,
      codeSha,
      coverage,
      requiredCoverage:GROWTH_R2_METHOD.requiredCoverage,
      missingFactors,
      staleFactors,
      factors,
    };
  }

  let score=0;
  for (const id of GROWTH_R2_FEATURE_IDS) score += factors[id].score * GROWTH_R2_WEIGHTS[id];
  score=clamp100(score);
  return {
    status:'READY',
    score,
    asOf,
    inputSnapshotId,
    methodologyVersion:GROWTH_R2_METHOD.methodologyVersion,
    featureRegistryRevision:GROWTH_R2_METHOD.featureRegistryRevision,
    normalizationRevision:GROWTH_R2_METHOD.normalizationRevision,
    weightRevision:GROWTH_R2_METHOD.weightRevision,
    codeSha,
    coverage,
    requiredCoverage:GROWTH_R2_METHOD.requiredCoverage,
    missingFactors:[],
    staleFactors:[],
    factors,
  };
}
