import {assembleDiagnosticSnapshot} from './diagnostic-assembly.mjs';
import {
  buildBankReservesR1,
  buildM2R1,
  buildOnRrpR1,
  buildTgaR1,
  scoreCmdiR1,
} from './score-transform-r1.mjs';

export class DiagnosticPipelineError extends Error {
  constructor(status) {
    super(status);
    this.name = 'DiagnosticPipelineError';
    this.status = status;
  }
}

const finite = value => typeof value === 'number' && Number.isFinite(value);
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function latestFiniteAtOrBefore(rows, asOfDate, field = 'score') {
  let latest = null;
  for (const row of rows ?? []) {
    if (!validDate(row?.observationDate) || row.observationDate > asOfDate) continue;
    const value = row?.[field];
    if (!finite(value)) continue;
    if (!latest || row.observationDate > latest.observationDate) {
      latest = {observationDate: row.observationDate, value};
    }
  }
  return latest;
}

export function scoreCmdiComponentsR1(cmdiRows = []) {
  return (cmdiRows ?? [])
    .filter(row => validDate(row?.observationDate))
    .map(row => ({
      observationDate: row.observationDate,
      hyCmdi: scoreCmdiR1(row.hy),
      igCmdi: scoreCmdiR1(row.ig),
      totalCmdi: scoreCmdiR1(row.market),
      totalCmdiSourceField: 'Market CMDI',
      raw: {
        hy: row.hy,
        ig: row.ig,
        market: row.market,
      },
    }))
    .sort((a, b) => a.observationDate.localeCompare(b.observationDate));
}

function latestCmdiAtOrBefore(rows, asOfDate) {
  let latest = null;
  for (const row of scoreCmdiComponentsR1(rows)) {
    if (row.observationDate > asOfDate) continue;
    if (![row.hyCmdi, row.igCmdi, row.totalCmdi].every(finite)) continue;
    latest = row;
  }
  return latest;
}

export function buildR1WiredInputs({
  asOfDate,
  series = {},
  cmdiRows = [],
  fundingStressRows = [],
  bondVolatilityRows = [],
} = {}) {
  if (!validDate(asOfDate)) throw new DiagnosticPipelineError('AS_OF_DATE_REQUIRED');

  const bankReserves = buildBankReservesR1(series.WRESBAL ?? []);
  const tga = buildTgaR1(series.WTREGEN ?? []);
  const onRrp = buildOnRrpR1(series.RRPONTSYD ?? []);
  const m2 = buildM2R1(series.M2SL ?? []);

  const latest = {
    fundingStress: latestFiniteAtOrBefore(fundingStressRows, asOfDate),
    bankReserves: latestFiniteAtOrBefore(bankReserves.rows, asOfDate),
    tga: latestFiniteAtOrBefore(tga.rows, asOfDate),
    onRrp: latestFiniteAtOrBefore(onRrp.rows, asOfDate),
    m2: latestFiniteAtOrBefore(m2.rows, asOfDate),
    bondVolatility: latestFiniteAtOrBefore(bondVolatilityRows, asOfDate),
    cmdi: latestCmdiAtOrBefore(cmdiRows, asOfDate),
  };

  return {
    activeRevision: 'DIAGNOSTIC_SCORE_TRANSFORM_R1',
    asOfDate,
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    carryPolicy: 'LATEST_OBSERVATION_AT_OR_BEFORE_AS_OF_NO_INTERPOLATION',
    components: {
      fundingStress: {
        status: latest.fundingStress ? 'READY_CURRENT_VINTAGE' : 'PARTIAL',
        rows: (fundingStressRows ?? []).filter(row=>validDate(row?.observationDate)&&finite(row?.score)).slice(-520),
      },
      bankReserves,
      tga,
      onRrp,
      m2,
      bondVolatility: {
        status: latest.bondVolatility ? 'READY_CURRENT_VINTAGE' : 'PARTIAL',
        rows: (bondVolatilityRows ?? []).filter(row=>validDate(row?.observationDate)&&finite(row?.score)).slice(-520),
      },
      cmdi: {
        status: latest.cmdi ? 'READY_CURRENT_VINTAGE' : 'PARTIAL',
        sourceFieldMapping: {
          hyCmdi: 'HY CMDI',
          igCmdi: 'IG CMDI',
          totalCmdi: 'Market CMDI',
        },
        rows: scoreCmdiComponentsR1(cmdiRows),
      },
    },
    latest,
    liquidity: {
      fundingStress: latest.fundingStress?.value ?? null,
      bankReserves: latest.bankReserves?.value ?? null,
      tga: latest.tga?.value ?? null,
      onRrp: latest.onRrp?.value ?? null,
      m2: latest.m2?.value ?? null,
      bondVolatility: latest.bondVolatility?.value ?? null,
    },
    credit: {
      hyCmdi: latest.cmdi?.hyCmdi ?? null,
      igCmdi: latest.cmdi?.igCmdi ?? null,
      totalCmdi: latest.cmdi?.totalCmdi ?? null,
      bondVolatility: latest.bondVolatility?.value ?? null,
    },
    debtCreditStress: latest.cmdi?.totalCmdi ?? null,
  };
}

export function buildR1DiagnosticSnapshot({
  asOfDate,
  baseOverall,
  series = {},
  cmdiRows = [],
  fundingStressRows = [],
  bondVolatilityRows = [],
  inflation = {},
  recession = {},
  earnings = {},
  assetBubble = {},
  debt = {},
  supply = {},
} = {}) {
  const wired = buildR1WiredInputs({
    asOfDate,
    series,
    cmdiRows,
    fundingStressRows,
    bondVolatilityRows,
  });

  const snapshot = assembleDiagnosticSnapshot({
    baseOverall,
    inflation,
    recession,
    liquidity: wired.liquidity,
    credit: wired.credit,
    earnings,
    assetBubble,
    debt: {
      ...debt,
      creditStress: wired.debtCreditStress,
    },
    supply,
  });

  return {
    ...snapshot,
    asOfDate,
    activeRevision: wired.activeRevision,
    r1: wired,
  };
}
