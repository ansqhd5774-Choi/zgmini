import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreCmdiR1,
  scoreCmdiRowsR1,
  buildBankReservesR1,
  buildTgaR1,
  buildOnRrpR1,
  buildM2R1,
} from '../lib/diagnostic-layer/score-transform-r1.mjs';

function dateRows(count, stepFn) {
  const rows = [];
  const start = new Date('2000-01-01T00:00:00Z');
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    rows.push({ observationDate: d.toISOString().slice(0,10), value: stepFn(i) });
  }
  return rows;
}

function monthRows(count, stepFn) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const y = 2000 + Math.floor(i / 12);
    const m = i % 12 + 1;
    rows.push({ observationDate: `${y}-${String(m).padStart(2,'0')}-01`, value: stepFn(i) });
  }
  return rows;
}

test('CMDI R1 uses exact 100*(1-CMDI) mapping', () => {
  assert.equal(scoreCmdiR1(0),100);
  assert.equal(scoreCmdiR1(0.25),75);
  assert.equal(scoreCmdiR1(0.5),50);
  assert.equal(scoreCmdiR1(1),0);
});

test('CMDI R1 rejects values outside official 0..1 score domain', () => {
  assert.equal(scoreCmdiR1(-0.01),null);
  assert.equal(scoreCmdiR1(1.01),null);
  assert.equal(scoreCmdiR1(NaN),null);
});

test('CMDI row builder preserves dates and raw values', () => {
  const rows=scoreCmdiRowsR1([{observationDate:'2026-01-01',value:0.2}]);
  assert.deepEqual(rows,[{observationDate:'2026-01-01',value:0.2,score:80}]);
});

test('Bank Reserves R1 uses level percentile with 52-week minimum', () => {
  const out=buildBankReservesR1(dateRows(60,i=>100+i));
  const scored=out.rows.filter(row=>row.score!==null);
  assert.equal(out.transform,'WEEKLY_LEVEL_EXPANDING_PERCENTILE');
  assert.equal(scored[0].validHistory,52);
  const expected=((51+0.5)/52)*100;
  assert.ok(Math.abs(scored[0].score-expected)<1e-12);
});

test('TGA R1 uses absolute current-minus-lag4 change', () => {
  const out=buildTgaR1(dateRows(70,i=>100+i*i));
  assert.equal(out.rows[0].value,16);
  assert.equal(out.rows[0].lagObservations,4);
  assert.equal(out.changeDefinition,'CURRENT_MINUS_4_PRIOR_WEEKLY_OBSERVATIONS');
});

test('TGA R1 score begins after 52 valid 4-week changes', () => {
  const out=buildTgaR1(dateRows(70,i=>100+i*i));
  const scored=out.rows.filter(row=>row.score!==null);
  assert.equal(scored[0].validHistory,52);
});

test('ON RRP R1 uses absolute current-minus-lag20 change', () => {
  const out=buildOnRrpR1(dateRows(300,i=>1000+i*i));
  assert.equal(out.rows[0].value,400);
  assert.equal(out.rows[0].lagObservations,20);
  assert.equal(out.changeDefinition,'CURRENT_MINUS_20_PRIOR_DAILY_OBSERVATIONS');
});

test('ON RRP R1 score begins after 252 valid 20-day changes', () => {
  const out=buildOnRrpR1(dateRows(300,i=>1000+i*i));
  const scored=out.rows.filter(row=>row.score!==null);
  assert.equal(scored[0].validHistory,252);
});

test('M2 R1 computes exact YoY growth rate using 12 monthly observations', () => {
  const out=buildM2R1(monthRows(80,i=>100+i));
  const expected=100*((112/100)-1);
  assert.ok(Math.abs(out.rows[0].value-expected)<1e-12);
  assert.equal(out.rows[0].lagObservations,12);
});

test('M2 R1 score begins after 60 valid YoY observations', () => {
  const out=buildM2R1(monthRows(80,i=>100+i+i*i/100));
  const scored=out.rows.filter(row=>row.score!==null);
  assert.equal(scored[0].validHistory,60);
});

test('all R1 builders preserve current-vintage lookahead honesty', () => {
  for (const out of [
    buildBankReservesR1(dateRows(60,i=>i+1)),
    buildTgaR1(dateRows(70,i=>i*i+1)),
    buildOnRrpR1(dateRows(300,i=>i*i+1)),
    buildM2R1(monthRows(80,i=>100+i)),
  ]) {
    assert.equal(out.historyMode,'CURRENT_VINTAGE_ONLY');
    assert.equal(out.lookAheadSafe,false);
  }
});
