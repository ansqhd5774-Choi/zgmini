import {selectBisSeries} from './bis-bulk-parser.mjs';
import {expandingPercentileRows} from './series-math.mjs';

export const BIS_DEBT_SELECTORS = Object.freeze({
  dsr: Object.freeze({
    BORROWERS_CTY: 'US',
    DSR_BORROWERS: 'P',
  }),
  debtGdp: Object.freeze({
    BORROWERS_CTY: 'US',
    TC_BORROWERS: 'P',
    TC_LENDERS: 'A',
    VALUATION: 'M',
    UNIT_TYPE: '770',
    TC_ADJUST: 'A',
  }),
});

export function buildBisDebtRiskComponents(dsrParsed, tcParsed) {
  const select=(parsed,selector)=>{try{return selectBisSeries(parsed,selector);}catch{return {rows:[],seriesKey:null,title:null};}};
  const dsrSeries = select(dsrParsed, BIS_DEBT_SELECTORS.dsr);
  const debtGdpSeries = select(tcParsed, BIS_DEBT_SELECTORS.debtGdp);

  const dsrScore = expandingPercentileRows(dsrSeries.rows, {
    inverse: true,
    minValid: 12,
  });
  const debtGdpScore = expandingPercentileRows(debtGdpSeries.rows, {
    inverse: true,
    minValid: 20,
  });

  return {
    status: dsrScore.length && debtGdpScore.length
      ? 'READY_CURRENT_VINTAGE'
      : 'INSUFFICIENT_HISTORY',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    dsr: {
      selector: BIS_DEBT_SELECTORS.dsr,
      seriesKey: dsrSeries.seriesKey,
      title: dsrSeries.title,
      raw: dsrSeries.rows,
      score: dsrScore,
    },
    debtGdp: {
      selector: BIS_DEBT_SELECTORS.debtGdp,
      seriesKey: debtGdpSeries.seriesKey,
      title: debtGdpSeries.title,
      raw: debtGdpSeries.rows,
      score: debtGdpScore,
    },
  };
}
