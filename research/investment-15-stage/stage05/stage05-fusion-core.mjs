/**
 * Stage05 research priority selector. Inputs are verified Stage01-04 observations;
 * this module never downloads data, fills missing values, or generates trade advice.
 * Stage04's R2 formula is audited, not activated as an operating score.
 */
export const SCHEMA_VERSION = 'STAGE05_01_04_V1';
export const DEFAULT_WEIGHTS = Object.freeze([0.7, 0.8, 0.9]);

const isScore = value => typeof value === 'number' && Number.isFinite(value)
  && value >= 0 && value <= 100;
const isDate = value => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const asDay = date => Date.parse(`${date}T00:00:00Z`);
const round6 = value => Math.round((value + Number.EPSILON) * 1e6) / 1e6;
const uniqueById = (rows, label) => {
  const map = new Map();
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || !row.id.trim())
      throw new Error(`${label}_ID_INVALID`);
    if (map.has(row.id)) throw new Error(`${label}_DUPLICATE_ID_${row.id}`);
    map.set(row.id, row);
  }
  return map;
};
const reasons = (...entries) => entries.filter(Boolean);

function checkMarket(stage01, snapshotDate, maxAgeDays) {
  if (stage01?.status !== 'READY' || !isDate(stage01.date))
    return {valid:false,reason:'STAGE01_MARKET_UNAVAILABLE',risk:'UNKNOWN'};
  if (stage01.date > snapshotDate || (asDay(snapshotDate) - asDay(stage01.date)) / 86400000 > maxAgeDays)
    return {valid:false,reason:'STAGE01_DATE_STALE_OR_FUTURE',risk:'UNKNOWN'};
  if (!['NORMAL','CAUTION','HIGH_RISK','UNKNOWN'].includes(stage01.risk))
    return {valid:false,reason:'STAGE01_RISK_UNVERIFIED',risk:'UNKNOWN'};
  return {valid:true,reason:null,risk:stage01.risk,observedDate:stage01.date};
}

function checkEvidence(evidence, kind, snapshotDate, maxAgeDays) {
  if (!evidence || evidence.kind !== kind || evidence.validation !== 'VERIFIED')
    return 'ETF_PRICE_EVIDENCE_NOT_VERIFIED';
  if (!isScore(evidence.score) || !evidence.etf || !evidence.source
    || !evidence.normalizationRuleId || !evidence.priceSeriesId)
    return 'ETF_PRICE_SCORE_CONTRACT_INCOMPLETE';
  if (!isDate(evidence.periodStart) || !isDate(evidence.periodEnd)
    || evidence.periodEnd <= evidence.periodStart) return 'ETF_PRICE_PERIOD_INVALID';
  const days = (asDay(evidence.periodEnd) - asDay(evidence.periodStart)) / 86400000;
  if (days < 300 || days > 380) return 'ETF_PRICE_NOT_ONE_YEAR';
  if (evidence.periodEnd > snapshotDate
    || (asDay(snapshotDate) - asDay(evidence.periodEnd)) / 86400000 > maxAgeDays)
    return 'ETF_PRICE_DATE_STALE_OR_FUTURE';
  return null;
}

function computeIndustryComponent(record, snapshotDate, maxAgeDays) {
  const blocked = reason => ({reason,score:null,components:null});
  if (!record || record.status !== 'QUANTIFIED') return blocked('STAGE04_NOT_QUANTIFIED');
  if (record.evidenceKind !== 'REALIZED_INDUSTRY_ACTIVITY'
    || record.sourceValidation !== 'VERIFIED'
    || record.freshnessStatus !== 'CURRENT'
    || record.formulaId !== 'STAGE04_R2_PROPOSED'
    || !Array.isArray(record.sourceUrls) || record.sourceUrls.length === 0)
    return blocked('STAGE04_REALIZED_SOURCE_GATE_MISSING');
  if (!isDate(record.validatedDate) || !isDate(record.observationPeriodEnd)
    || record.observationPeriodEnd > record.validatedDate
    || record.validatedDate > snapshotDate
    || (asDay(snapshotDate)-asDay(record.validatedDate))/86400000 > maxAgeDays)
    return blocked('STAGE04_CHRONOLOGY_UNVERIFIED');
  // Stage05 is the calculator: it needs source-derived component inputs, not
  // an already-computed final M4, E, T or S5 from Stage01–04.
  if (![record.G1,record.G2,record.F].every(isScore))
    return blocked('STAGE04_COMPONENT_INPUT_MISSING');
  const G = 0.6 * record.G1 + 0.4 * record.G2;
  const D = Math.max(0,G - record.F);
  const M4 = 0.7 * G + 0.3 * D;
  if ([['G',G],['D',D],['M4',M4]].some(([name,computed]) =>
    record[name] !== undefined && (!isScore(record[name])
      || Math.abs(computed-record[name])>0.00001)))
    return blocked('STAGE04_FORMULA_MISMATCH');
  return {reason:null,score:round6(M4),components:{G1:record.G1,G2:record.G2,
    F:record.F,G:round6(G),D:round6(D),M4:round6(M4)}};
}

/**
 * Input contract:
 * {schemaVersion,snapshotDate,
 *  stage01:{status,date,risk},
 *  stage02:{sectors:[{id,relativeStrength:{kind,validation,score,etf,source,
 *    normalizationRuleId,priceSeriesId,periodStart,periodEnd}}]},
 *  stage03:{themes:[{id,sectorId,approved,trend:{...same evidence contract}}]},
 *  stage04:{themes:[{id,status,evidenceKind,sourceValidation,freshnessStatus,
 *    formulaId,sourceUrls,validatedDate,observationPeriodEnd,G1,G2,F,
 *    G?,D?,M4?}]}}
 * Only an explicit passed Stage03 theme can enter the selection table.
 */
export function calculateFusionStage05(input, {maxAgeDays = 7} = {}) {
  if (input?.schemaVersion !== SCHEMA_VERSION) throw new Error('INPUT_SCHEMA_VERSION_MISMATCH');
  if (!isDate(input?.snapshotDate)) throw new Error('SNAPSHOT_DATE_INVALID');
  if (!Number.isInteger(maxAgeDays) || maxAgeDays < 0 || maxAgeDays > 30)
    throw new Error('MAX_AGE_DAYS_INVALID');
  const market = checkMarket(input.stage01,input.snapshotDate,maxAgeDays);
  const sectors = uniqueById(input.stage02?.sectors || [], 'STAGE02_SECTOR');
  const candidates = uniqueById(input.stage03?.themes || [], 'STAGE03_THEME');
  const industry = uniqueById(input.stage04?.themes || [], 'STAGE04_THEME');
  const rows = [];

  for (const theme of candidates.values()) {
    if (theme.approved !== true) continue;
    const sector = sectors.get(theme.sectorId);
    const growth = industry.get(theme.id);
    const industryComponent=computeIndustryComponent(growth,input.snapshotDate,maxAgeDays);
    const eReason=industryComponent.reason;
    const rsReason = checkEvidence(sector?.relativeStrength,
      'ETF_PRICE_RELATIVE_STRENGTH',input.snapshotDate,maxAgeDays);
    const trendReason = checkEvidence(theme.trend,
      'ETF_PRICE_TREND',input.snapshotDate,maxAgeDays);
    const samePeriod = !rsReason && !trendReason
      && sector.relativeStrength.periodStart === theme.trend.periodStart
      && sector.relativeStrength.periodEnd === theme.trend.periodEnd;
    const periodReason = !rsReason && !trendReason && !samePeriod
      ? 'ETF_RS_TREND_PERIOD_MISMATCH' : null;
    const E = industryComponent.score;
    const T = rsReason || trendReason || periodReason ? null
      : round6(0.5*sector.relativeStrength.score + 0.5*theme.trend.score);
    const blockReasons = reasons(eReason,rsReason,trendReason,periodReason,
      market.reason, input.stage02?.status !== 'READY' ? 'STAGE02_NOT_READY' : null,
      input.stage03?.status !== 'READY' ? 'STAGE03_NOT_READY' : null,
      input.stage04?.status !== 'READY' ? 'STAGE04_NOT_READY' : null);
    const eligible = E !== null && T !== null && blockReasons.length === 0;
    const sensitivity = Object.fromEntries(DEFAULT_WEIGHTS.map(w => [String(Math.round(w*100)),
      eligible ? round6(w*E+(1-w)*T) : null]));
    rows.push({themeId:theme.id,sectorId:theme.sectorId,
      status:eligible?'RANKABLE':'BLOCKED',
      calculatedIndustry:industryComponent.components,
      E,T,S5:sensitivity['80'],sensitivity,blockReasons:[...new Set(blockReasons)]});
  }
  const ranked = rows.filter(r=>r.status==='RANKABLE').sort((a,b)=>b.S5-a.S5
    || a.themeId.localeCompare(b.themeId));
  return {
    schemaVersion:SCHEMA_VERSION,mode:'READ_ONLY_RESEARCH',snapshotDate:input.snapshotDate,
    stage01:{risk:market.risk,status:market.valid?'VERIFIED':'UNAVAILABLE',
      observedDate:market.observedDate||null,reason:market.reason},
    summary:{approvedCandidateCount:rows.length,rankableCount:ranked.length,
      blockedCount:rows.length-ranked.length,selectedThemeId:ranked[0]?.themeId||null},
    rows, ranking:ranked.map((r,index)=>({rank:index+1,themeId:r.themeId,S5:r.S5,
      sensitivity:r.sensitivity})),
    notes:['S5 is research priority only; not a buy signal, trade or approved live formula.',
      'Incomplete source, approved ETF-price normalization, or realized G/D/M: NULL, never zero.'],
  };
}
