import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BisSchemaError,
  bisQuarterToDate,
  debtRiskBisStatus,
  parseBisColumnCsv,
  parseCsvLine,
  selectBisSeries,
  usBisCandidateMatrix,
} from '../lib/diagnostic-layer/bis-bulk-parser.mjs';

test('CSV parser handles quotes and escaped quotes', () => {
  assert.deepEqual(parseCsvLine('A,"B,C","D""E"'), ['A','B,C','D"E']);
});

test('BIS quarter converts to quarter-start observation date', () => {
  assert.equal(bisQuarterToDate('2026-Q1'),'2026-01-01');
  assert.equal(bisQuarterToDate('2026-Q4'),'2026-10-01');
  assert.equal(bisQuarterToDate('bad'),null);
});

test('WS_DSR col-format schema parses metadata and current-vintage rows', () => {
  const csv = [
    "FREQ,Frequency,BORROWERS_CTY,Borrowers' country,DSR_BORROWERS,Borrowers,DECIMALS,Decimals,TITLE_TS,Series,2025-Q4,2026-Q1",
    "Q,Quarterly,US,United States,N,Non-financial corporations,1,One,United States - Non-financial corporations,Q:US:N,37.3,36.9",
    "Q,Quarterly,US,United States,P,Private non-financial sector,1,One,United States - Private non-financial sector,Q:US:P,13.9,13.8",
  ].join('\n');
  const parsed = parseBisColumnCsv(csv,'WS_DSR');
  assert.equal(parsed.series.length,2);
  assert.equal(parsed.series[0].seriesKey,'Q:US:N');
  assert.equal(parsed.series[0].rows[1].observationDate,'2026-01-01');
  assert.equal(parsed.series[0].rows[1].availableAt,null);
  assert.equal(parsed.series[0].rows[1].vintageMethod,'CURRENT_VINTAGE_ONLY');
});

test('WS_TC col-format schema preserves exact selector metadata', () => {
  const csv = [
    "FREQ,Frequency,BORROWERS_CTY,Borrowers' country,TC_BORROWERS,Borrowing sector,TC_LENDERS,Lending sector,VALUATION,Valuation method,UNIT_TYPE,Unit type,TC_ADJUST,Adjustment,UNIT_MULT,Unit Multiplier,UNIT_MEASURE,Unit of measure,TITLE_TS,Series,2025-Q4,2026-Q1",
    "Q,Quarterly,US,United States,N,Non-financial corporations,A,All sectors,M,Market value,770,Percentage of GDP,A,Adjusted for breaks,0,Units,367,Per cent,United States - Credit to Non-financial corporations,Q:US:N:A:M:770:A,72.2,72.5",
    "Q,Quarterly,US,United States,P,Private non-financial sector,A,All sectors,M,Market value,770,Percentage of GDP,A,Adjusted for breaks,0,Units,367,Per cent,United States - Credit to Private non-financial sector,Q:US:P:A:M:770:A,140.1,139.7",
  ].join('\n');
  const parsed = parseBisColumnCsv(csv,'WS_TC');
  assert.equal(parsed.series.length,2);
  assert.equal(parsed.series[1].metadata.UNIT_TYPE,'770');
  assert.equal(parsed.series[1].metadata.TC_ADJUST,'A');
  assert.equal(parsed.series[1].rows[1].value,139.7);
});

test('exact BIS selector must match one and only one series', () => {
  const csv = [
    "FREQ,Frequency,BORROWERS_CTY,Borrowers' country,DSR_BORROWERS,Borrowers,DECIMALS,Decimals,TITLE_TS,Series,2026-Q1",
    "Q,Quarterly,US,United States,N,Non-financial corporations,1,One,US NFC,Q:US:N,36.9",
    "Q,Quarterly,US,United States,P,Private non-financial sector,1,One,US PNF,Q:US:P,13.8",
  ].join('\n');
  const parsed = parseBisColumnCsv(csv,'WS_DSR');
  assert.equal(selectBisSeries(parsed,{BORROWERS_CTY:'US',DSR_BORROWERS:'N'}).seriesKey,'Q:US:N');
  assert.throws(() => selectBisSeries(parsed,{BORROWERS_CTY:'US'}),/SERIES_SELECTOR_AMBIGUOUS/);
  assert.throws(() => selectBisSeries(parsed,{BORROWERS_CTY:'KR'}),/SERIES_NOT_FOUND/);
});

test('BIS parser rejects malformed numeric and column counts', () => {
  const badNumeric = [
    "FREQ,Frequency,BORROWERS_CTY,Borrowers' country,DSR_BORROWERS,Borrowers,DECIMALS,Decimals,TITLE_TS,Series,2026-Q1",
    "Q,Quarterly,US,United States,N,Non-financial corporations,1,One,US NFC,Q:US:N,abc",
  ].join('\n');
  assert.throws(() => parseBisColumnCsv(badNumeric,'WS_DSR'),/INVALID_NUMERIC/);

  const badCols = [
    "FREQ,Frequency,BORROWERS_CTY,Borrowers' country,DSR_BORROWERS,Borrowers,DECIMALS,Decimals,TITLE_TS,Series,2026-Q1",
    "Q,Quarterly,US,United States,N,Non-financial corporations,1,One,US NFC,Q:US:N",
  ].join('\n');
  assert.throws(() => parseBisColumnCsv(badCols,'WS_DSR'),/COLUMN_COUNT_MISMATCH/);
});

test('U.S. candidate matrix is explicit and does not choose methodology', () => {
  const dsr = parseBisColumnCsv([
    "FREQ,Frequency,BORROWERS_CTY,Borrowers' country,DSR_BORROWERS,Borrowers,DECIMALS,Decimals,TITLE_TS,Series,2026-Q1",
    "Q,Quarterly,US,United States,N,Non-financial corporations,1,One,US NFC,Q:US:N,36.9",
    "Q,Quarterly,US,United States,P,Private non-financial sector,1,One,US PNF,Q:US:P,13.8",
  ].join('\n'),'WS_DSR');
  const tc = parseBisColumnCsv([
    "FREQ,Frequency,BORROWERS_CTY,Borrowers' country,TC_BORROWERS,Borrowing sector,TC_LENDERS,Lending sector,VALUATION,Valuation method,UNIT_TYPE,Unit type,TC_ADJUST,Adjustment,UNIT_MULT,Unit Multiplier,UNIT_MEASURE,Unit of measure,TITLE_TS,Series,2026-Q1",
    "Q,Quarterly,US,United States,N,Non-financial corporations,A,All sectors,M,Market value,770,Percentage of GDP,A,Adjusted for breaks,0,Units,367,Per cent,US NFC debt/GDP,Q:US:N:A:M:770:A,72.5",
    "Q,Quarterly,US,United States,P,Private non-financial sector,A,All sectors,M,Market value,770,Percentage of GDP,A,Adjusted for breaks,0,Units,367,Per cent,US PNF debt/GDP,Q:US:P:A:M:770:A,139.7",
  ].join('\n'),'WS_TC');

  const out = debtRiskBisStatus(dsr,tc);
  assert.equal(out.status,'PARTIAL_SELECTOR_REQUIRED');
  assert.equal(out.dsrCandidates.length,2);
  assert.equal(out.debtGdpCandidates.length,2);
  assert.match(out.reason,/EXACT_BIS_BORROWER_SECTOR_SELECTOR/);
});
