const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp100 = value => Math.max(0, Math.min(100, value));
const MIN_VALID = 756;

function normalizeRows(rows = []) {
  const map = new Map();
  for (const row of rows ?? []) {
    const observationDate = row?.observationDate ?? row?.date;
    const raw = row?.value;
    if (raw === null || raw === undefined || (typeof raw !== 'number' && typeof raw !== 'string') || (typeof raw === 'string' && !raw.trim())) continue;
    const value = Number(raw);
    if (typeof observationDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(observationDate) || !finite(value)) continue;
    map.set(observationDate, {observationDate, value});
  }
  return [...map.values()].sort((a, b) => a.observationDate.localeCompare(b.observationDate));
}

function percentile(values, current) {
  if (!values.length || !finite(current)) return null;
  let below = 0;
  let equal = 0;
  for (const value of values) {
    if (value < current) below += 1;
    else if (value === current) equal += 1;
  }
  return 100 * (below + 0.5 * equal) / values.length;
}

function expandingScore(rows, {inverse = false, minValid = MIN_VALID} = {}) {
  const seen = [];
  const out = [];
  for (const row of normalizeRows(rows)) {
    seen.push(row.value);
    const raw = seen.length >= minValid ? percentile(seen, row.value) : null;
    out.push({
      observationDate: row.observationDate,
      rawValue: row.value,
      score: finite(raw) ? clamp100(inverse ? 100 - raw : raw) : null,
    });
  }
  return out;
}

const byDate = rows => new Map((rows ?? []).map(row => [row.observationDate, row]));

function curveRows(tenYearRows = [], threeMonthRows = []) {
  const ten = normalizeRows(tenYearRows);
  const three = byDate(normalizeRows(threeMonthRows));
  return ten
    .filter(row => three.has(row.observationDate))
    .map(row => ({
      observationDate: row.observationDate,
      value: row.value - three.get(row.observationDate).value,
    }));
}

function latestFiniteScore(rows, asOfDate) {
  let latest = null;
  for (const row of rows ?? []) {
    if (row.observationDate > asOfDate) break;
    if (finite(row.score)) latest = row;
  }
  return latest;
}

function latestValue(rows, asOfDate) {
  let latest = null;
  for (const row of normalizeRows(rows)) {
    if (row.observationDate > asOfDate) break;
    latest = row;
  }
  return latest;
}

function weekdayGap(fromDate, toDate) {
  if (!fromDate || !toDate || fromDate > toDate) return 0;
  const start = new Date(`${fromDate}T12:00:00Z`);
  const end = new Date(`${toDate}T12:00:00Z`);
  let count = 0;
  while (start < end) {
    start.setUTCDate(start.getUTCDate() + 1);
    const day = start.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

function freshnessFor(latestDate, asOfDate) {
  if (!latestDate || !asOfDate) return {freshness:'UNAVAILABLE', stale:true, hard:true, businessDayGap:null};
  const gap = weekdayGap(latestDate, asOfDate);
  if (gap > 5) return {freshness:'HARD_STALE', stale:true, hard:true, businessDayGap:gap};
  if (gap > 2) return {freshness:'SOFT_STALE', stale:true, hard:false, businessDayGap:gap};
  return {freshness:'CURRENT', stale:false, hard:false, businessDayGap:gap};
}

const RATE_SOURCE_URLS = Object.freeze({
  policy: 'https://www.newyorkfed.org/markets/reference-rates',
  nominal: 'https://www.federalreserve.gov/releases/h15/',
  real: 'https://www.federalreserve.gov/releases/h15/',
});

function rawIndicator(name, rows, asOfDate, {
  source,
  sourceKey,
  sourceUrl,
  transport,
  unit='%',
  historyLimit=260,
} = {}) {
  const normalized = normalizeRows(rows).filter(row => !asOfDate || row.observationDate <= asOfDate);
  const latest = normalized.at(-1) ?? null;
  const fresh = freshnessFor(latest?.observationDate ?? null, asOfDate);
  if (!latest || fresh.hard) {
    return {
      name,
      status:'UNAVAILABLE',
      score:null,
      value:null,
      currentValue:null,
      displayValue:null,
      formattedValue:null,
      currentRange:null,
      unit,
      asOfDate:latest?.observationDate ?? null,
      history:normalized.slice(-historyLimit).map(row=>({label:row.observationDate,value:row.value})),
      source:source ?? null,
      sourceKey:sourceKey ?? null,
      sourceUrl:sourceUrl ?? null,
      transport:transport ?? null,
      freshness:fresh.freshness,
      stale:true,
      unavailableReason:latest ? 'HARD_STALE' : 'NO_VALID_OBSERVATION',
    };
  }
  const formattedValue = `${Number(latest.value.toFixed(2))}${unit}`;
  return {
    name,
    status:'READY',
    score:null,
    value:latest.value,
    currentValue:latest.value,
    displayValue:formattedValue,
    formattedValue,
    currentRange:null,
    unit,
    asOfDate:latest.observationDate,
    history:normalized.slice(-historyLimit).map(row=>({label:row.observationDate,value:row.value})),
    source:source ?? null,
    sourceKey:sourceKey ?? null,
    sourceUrl:sourceUrl ?? null,
    transport:transport ?? null,
    freshness:fresh.freshness,
    stale:fresh.stale,
    unavailableReason:null,
  };
}

function rangeIndicator(name, lowerRows, upperRows, asOfDate, {
  source,
  sourceKey,
  sourceUrl,
  transport,
  unit='%',
  historyLimit=260,
} = {}) {
  const lower = normalizeRows(lowerRows).filter(row => !asOfDate || row.observationDate <= asOfDate);
  const upper = normalizeRows(upperRows).filter(row => !asOfDate || row.observationDate <= asOfDate);
  const lowerMap = byDate(lower);
  const pairs = upper
    .filter(row => lowerMap.has(row.observationDate))
    .map(row => ({
      label:row.observationDate,
      lower:lowerMap.get(row.observationDate).value,
      upper:row.value,
    }));
  const latest = pairs.at(-1) ?? null;
  const fresh = freshnessFor(latest?.label ?? null, asOfDate);
  if (!latest || fresh.hard) {
    return {
      name,
      status:'UNAVAILABLE',
      score:null,
      value:null,
      currentValue:null,
      displayValue:null,
      formattedValue:null,
      currentRange:null,
      unit,
      asOfDate:latest?.label ?? null,
      history:pairs.slice(-historyLimit),
      source:source ?? null,
      sourceKey:sourceKey ?? null,
      sourceUrl:sourceUrl ?? null,
      transport:transport ?? null,
      freshness:fresh.freshness,
      stale:true,
      unavailableReason:latest ? 'HARD_STALE' : 'MISSING_RANGE_ENDPOINT',
    };
  }
  const clean = value => Number(value.toFixed(2));
  const displayValue = `${clean(latest.lower)}–${clean(latest.upper)}${unit}`;
  return {
    name,
    status:'READY',
    score:null,
    value:null,
    currentValue:null,
    displayValue,
    formattedValue:displayValue,
    currentRange:{lower:latest.lower,upper:latest.upper},
    unit,
    asOfDate:latest.label,
    history:pairs.slice(-historyLimit),
    source:source ?? null,
    sourceKey:sourceKey ?? null,
    sourceUrl:sourceUrl ?? null,
    transport:transport ?? null,
    freshness:fresh.freshness,
    stale:fresh.stale,
    unavailableReason:null,
  };
}

function buildDisplayIndicators({
  policyLowerRows=[],
  policyUpperRows=[],
  twoYearRows=[],
  realTenYearRows=[],
  tenYearRows=[],
  asOfDate,
}={}) {
  return [
    rangeIndicator('Fed 정책금리', policyLowerRows, policyUpperRows, asOfDate, {
      source:'Federal Reserve Bank of New York',
      sourceKey:'EFFR.targetRateFrom/targetRateTo',
      sourceUrl:RATE_SOURCE_URLS.policy,
      transport:'NYFED_MARKETS_API',
    }),
    rawIndicator('미국 2년물', twoYearRows, asOfDate, {
      source:'U.S. Department of the Treasury / Federal Reserve Board H.15',
      sourceKey:'RIFLGFCY02_N.B',
      sourceUrl:RATE_SOURCE_URLS.nominal,
      transport:'FED_BOARD_H15_DDP_CSV',
    }),
    rawIndicator('미국 10년 실질금리', realTenYearRows, asOfDate, {
      source:'U.S. Department of the Treasury / Federal Reserve Board H.15',
      sourceKey:'RIFLGFCY10_XII_N.B',
      sourceUrl:RATE_SOURCE_URLS.real,
      transport:'FED_BOARD_H15_DDP_CSV',
    }),
    rawIndicator('미국 10년물', tenYearRows, asOfDate, {
      source:'U.S. Department of the Treasury / Federal Reserve Board H.15',
      sourceKey:'RIFLGFCY10_N.B',
      sourceUrl:RATE_SOURCE_URLS.nominal,
      transport:'FED_BOARD_H15_DDP_CSV',
    }),
  ].map((item,index)=>({
    ...item,
    componentId:['policy','nominal','real','tenYear'][index],
    label:item.name,
    valueType:index===0?'range':'number',
  }));
}

function buildTrend(axisRows, limit=520) {
  const maps = Object.fromEntries(
    Object.entries(axisRows).map(([id,rows]) => [id, byDate(rows.filter(row => finite(row.score)))]),
  );
  const dates = [...maps.policy.keys()]
    .filter(date => maps.nominal.has(date) && maps.real.has(date) && maps.curve.has(date))
    .sort();
  return dates.slice(-limit).map(date => ({
    label:date,
    value:(
      maps.policy.get(date).score
      + maps.nominal.get(date).score
      + maps.real.get(date).score
      + maps.curve.get(date).score
    ) / 4,
  }));
}

export function buildRateR2({
  effrRows=[],
  twoYearRows=[],
  realTenYearRows=[],
  threeMonthRows=[],
  tenYearRows=[],
  policyLowerRows=[],
  policyUpperRows=[],
  asOfDate,
  minValid=MIN_VALID,
}={}) {
  const indicators = buildDisplayIndicators({
    policyLowerRows,policyUpperRows,twoYearRows,realTenYearRows,tenYearRows,asOfDate,
  });

  if (typeof asOfDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
    return {status:'UNAVAILABLE',score:null,reason:'INVALID_AS_OF',modelVersion:'RATE_R2',indicators};
  }

  const normalized = {
    effr:normalizeRows(effrRows).filter(row=>row.observationDate<=asOfDate),
    twoYear:normalizeRows(twoYearRows).filter(row=>row.observationDate<=asOfDate),
    realTenYear:normalizeRows(realTenYearRows).filter(row=>row.observationDate<=asOfDate),
    threeMonth:normalizeRows(threeMonthRows).filter(row=>row.observationDate<=asOfDate),
    tenYear:normalizeRows(tenYearRows).filter(row=>row.observationDate<=asOfDate),
  };
  const missing = Object.entries(normalized).filter(([,rows])=>!rows.length).map(([id])=>id);
  if (missing.length) {
    return {
      status:'UNAVAILABLE',score:null,reason:'MISSING_RATE_R2_INPUTS',
      missingFactors:missing,modelVersion:'RATE_R2',indicators,
      freshness:'UNAVAILABLE',updatedAt:null,trend:[],
      historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,
    };
  }

  const axisRows = {
    policy:expandingScore(normalized.effr,{inverse:true,minValid}),
    nominal:expandingScore(normalized.twoYear,{inverse:true,minValid}),
    real:expandingScore(normalized.realTenYear,{inverse:true,minValid}),
    curve:expandingScore(curveRows(normalized.tenYear,normalized.threeMonth),{inverse:false,minValid}),
  };
  const latest = Object.fromEntries(
    Object.entries(axisRows).map(([id,rows])=>[id,latestFiniteScore(rows,asOfDate)]),
  );
  const warmupMissing = Object.entries(latest).filter(([,row])=>!row).map(([id])=>id);
  if (warmupMissing.length) {
    return {
      status:'UNAVAILABLE',score:null,reason:'RATE_R2_WARMUP',
      missingFactors:warmupMissing,modelVersion:'RATE_R2',indicators,
      freshness:'UNAVAILABLE',updatedAt:null,trend:[],
      historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,
    };
  }

  const latestRawDates = {
    policy:latestValue(normalized.effr,asOfDate)?.observationDate ?? null,
    nominal:latestValue(normalized.twoYear,asOfDate)?.observationDate ?? null,
    real:latestValue(normalized.realTenYear,asOfDate)?.observationDate ?? null,
    curveTen:latestValue(normalized.tenYear,asOfDate)?.observationDate ?? null,
    curveThree:latestValue(normalized.threeMonth,asOfDate)?.observationDate ?? null,
    curve:latest.curve.observationDate,
  };
  const freshnessRows = Object.values(latestRawDates).map(date=>freshnessFor(date,asOfDate));
  if (freshnessRows.some(item=>item.hard)) {
    return {
      status:'UNAVAILABLE',score:null,reason:'RATE_R2_HARD_STALE',
      missingFactors:Object.entries(latestRawDates)
        .filter(([,date])=>freshnessFor(date,asOfDate).hard)
        .map(([id])=>id),
      modelVersion:'RATE_R2',indicators,
      freshness:'HARD_STALE',updatedAt:null,trend:[],
      historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,
    };
  }

  const componentScores = {
    policy:latest.policy.score,
    nominal:latest.nominal.score,
    real:latest.real.score,
    curve:latest.curve.score,
  };
  const currentPressure = (componentScores.policy + componentScores.nominal + componentScores.real) / 3;
  const forwardPersistence = componentScores.curve;
  const score = (
    componentScores.policy
    + componentScores.nominal
    + componentScores.real
    + componentScores.curve
  ) / 4;
  const identityScore = 0.75 * currentPressure + 0.25 * forwardPersistence;
  const updatedAt = Object.values(latestRawDates).filter(Boolean).sort().at(-1) ?? null;
  const softStale = freshnessRows.some(item=>item.stale);

  return {
    status:'READY',
    score:clamp100(score),
    baseRateScore:clamp100(score),
    modelVersion:'RATE_R2',
    weights:{policy:0.25,nominal:0.25,real:0.25,curve:0.25},
    normalization:'EXPANDING_PERCENTILE',
    minValid,
    componentScores,
    currentPressure,
    forwardPersistence,
    lensIdentityScore:identityScore,
    externalContextCapApplied:false,
    recessionCreditCapApplied:false,
    observationDate:updatedAt,
    updatedAt,
    freshness:softStale?'SOFT_STALE':'CURRENT',
    stale:softStale,
    indicators,
    trend:buildTrend(axisRows),
    interpretation:'금리 R2: 정책·2년물·10년 실질금리·10Y-3M 곡선을 동일가중으로 결합. 0=극단적 금리 스트레스, 100=매우 완화적.',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
  };
}

export const RATE_R2_CONTRACT = Object.freeze({
  modelVersion:'RATE_R2',
  direction:'0_EXTREME_RATE_STRESS_100_HIGHLY_ACCOMMODATIVE',
  normalization:'EXPANDING_PERCENTILE',
  minValid:MIN_VALID,
  weights:Object.freeze({policy:0.25,nominal:0.25,real:0.25,curve:0.25}),
  currentPressure:Object.freeze(['policy','nominal','real']),
  forwardPersistence:Object.freeze(['curve']),
  lensIdentity:'RATE = 0.75 * CURRENT_PRESSURE + 0.25 * FORWARD_PERSISTENCE',
  externalContextCapApplied:false,
  missingReweight:false,
});
