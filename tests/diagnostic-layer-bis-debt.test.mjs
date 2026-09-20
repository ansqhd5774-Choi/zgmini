import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBisColumnCsv} from '../lib/diagnostic-layer/bis-bulk-parser.mjs';
import {
  BIS_DEBT_SELECTORS,
  buildBisDebtRiskComponents,
} from '../lib/diagnostic-layer/bis-debt-components.mjs';

const quarters = count => Array.from({length:count}, (_, i) => {
  const year = 2000 + Math.floor(i / 4);
  const q = i % 4 + 1;
  return `${year}-Q${q}`;
});

function makeDsrCsv(count=30) {
  const periods = quarters(count);
  const header = [
    'FREQ','Frequency','BORROWERS_CTY',"Borrowers' country",
    'DSR_BORROWERS','Borrowers','DECIMALS','Decimals','TITLE_TS','Series',
    ...periods,
  ].join(',');
  const nfc = ['Q','Quarterly','US','United States','N','Non-financial corporations','1','One','US NFC','Q:US:N',
    ...periods.map((_,i)=>String(30+i/10))].join(',');
  const pnf = ['Q','Quarterly','US','United States','P','Private non-financial sector','1','One','US PNF','Q:US:P',
    ...periods.map((_,i)=>String(10+i/10))].join(',');
  return [header,nfc,pnf].join('\n');
}

function makeTcCsv(count=30) {
  const periods = quarters(count);
  const header = [
    'FREQ','Frequency','BORROWERS_CTY',"Borrowers' country",
    'TC_BORROWERS','Borrowing sector','TC_LENDERS','Lending sector',
    'VALUATION','Valuation method','UNIT_TYPE','Unit type',
    'TC_ADJUST','Adjustment','UNIT_MULT','Unit Multiplier',
    'UNIT_MEASURE','Unit of measure','TITLE_TS','Series',
    ...periods,
  ].join(',');
  const nfc = ['Q','Quarterly','US','United States','N','Non-financial corporations','A','All sectors','M','Market value','770','Percentage of GDP','A','Adjusted for breaks','0','Units','367','Per cent','US NFC debt/GDP','Q:US:N:A:M:770:A',
    ...periods.map((_,i)=>String(70+i/10))].join(',');
  const pnf = ['Q','Quarterly','US','United States','P','Private non-financial sector','A','All sectors','M','Market value','770','Percentage of GDP','A','Adjusted for breaks','0','Units','367','Per cent','US PNF debt/GDP','Q:US:P:A:M:770:A',
    ...periods.map((_,i)=>String(130+i/10))].join(',');
  return [header,nfc,pnf].join('\n');
}

test('recovered BIS Debt Risk selector is private non-financial sector P', () => {
  assert.deepEqual(BIS_DEBT_SELECTORS.dsr,{
    BORROWERS_CTY:'US',
    DSR_BORROWERS:'P',
  });
  assert.deepEqual(BIS_DEBT_SELECTORS.debtGdp,{
    BORROWERS_CTY:'US',
    TC_BORROWERS:'P',
    TC_LENDERS:'A',
    VALUATION:'M',
    UNIT_TYPE:'770',
    TC_ADJUST:'A',
  });
});

test('BIS Debt Risk chooses P, not N, for both DSR and debt/GDP', () => {
  const out = buildBisDebtRiskComponents(
    parseBisColumnCsv(makeDsrCsv(),'WS_DSR'),
    parseBisColumnCsv(makeTcCsv(),'WS_TC'),
  );
  assert.equal(out.dsr.seriesKey,'Q:US:P');
  assert.equal(out.debtGdp.seriesKey,'Q:US:P:A:M:770:A');
  assert.match(out.dsr.title,/PNF|Private/i);
  assert.match(out.debtGdp.title,/PNF|Private/i);
});

test('DSR uses inverse expanding percentile with 12-quarter warmup', () => {
  const out = buildBisDebtRiskComponents(
    parseBisColumnCsv(makeDsrCsv(),'WS_DSR'),
    parseBisColumnCsv(makeTcCsv(),'WS_TC'),
  );
  assert.equal(out.dsr.score[0].validHistory,12);
  assert.ok(out.dsr.score[0].value <= 100 && out.dsr.score[0].value >= 0);
});

test('Debt/GDP uses inverse expanding percentile with 20-quarter warmup', () => {
  const out = buildBisDebtRiskComponents(
    parseBisColumnCsv(makeDsrCsv(),'WS_DSR'),
    parseBisColumnCsv(makeTcCsv(),'WS_TC'),
  );
  assert.equal(out.debtGdp.score[0].validHistory,20);
  assert.ok(out.debtGdp.score[0].value <= 100 && out.debtGdp.score[0].value >= 0);
});

test('BIS Debt Risk remains current-vintage-only and not look-ahead verified', () => {
  const out = buildBisDebtRiskComponents(
    parseBisColumnCsv(makeDsrCsv(),'WS_DSR'),
    parseBisColumnCsv(makeTcCsv(),'WS_TC'),
  );
  assert.equal(out.status,'READY_CURRENT_VINTAGE');
  assert.equal(out.historyMode,'CURRENT_VINTAGE_ONLY');
  assert.equal(out.lookAheadSafe,false);
  assert.equal(out.dsr.raw[0].availableAt,null);
  assert.equal(out.debtGdp.raw[0].releaseDate,null);
});
