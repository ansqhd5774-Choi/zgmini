import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStagflationS21 as calculate, STAGFLATION_S21_SERIES as ids } from '../lib/diagnostic-layer/stagflation-s21.mjs';
function fixture() {
  return Object.fromEntries(ids.map(id => [id, Array.from({length: 147}, (_, i) => {
    const observationDate = new Date(Date.UTC(2014, 5 + i, 1)).toISOString().slice(0,10);
    return { observationDate, value: id === 'EXPINF5YR' ? 2.5 : 100 * (1.03 ** (i / 12)) };
  })]));
}
test('13 monthly points, direction fields, finite scores and explicit reconstruction policy', () => {
  const r = calculate({series:fixture()});assert.equal(r.status,'READY');assert.equal(r.history.length,13);
  assert.equal(r.observationMonth,'2026-08-01');assert.match(r.historyPolicy,/NOT_PIT/);
  assert.ok(r.history.every(p => p.score >= 0 && p.score <= 100));
  assert.ok(Math.abs(r.history.at(-1).axes.inflation - 25) < 1e-9);
  assert.equal(r.history.at(-1).contraction.production,false);
});
test('low constant prices produce no inflation risk even with deteriorating employment', () => {
  const s=fixture();for(const id of ['PCEPI','PCEPILFE'])for(const r of s[id])r.value=100;
  for(let i=135;i<147;i++)s.PAYEMS[i].value=80-i/10;
  const r=calculate({series:s});assert.equal(r.status,'READY');assert.equal(r.score,100);
});
test('missing input is not zero-filled or reweighted', () => {
  const s=fixture();s.INDPRO.splice(50,1);const r=calculate({series:s});assert.equal(r.status,'PARTIAL');assert.equal(r.score,null);assert.ok(r.reasons.some(x=>x.startsWith('INVALID_INPUT:INDPRO:')));
});
test('duplicate month and absent series fail closed', () => {
  const s=fixture();s.PAYEMS.push({...s.PAYEMS[0]});assert.match(calculate({series:s}).reasons[0],/DUPLICATE/);
  delete s.PAYEMS;assert.match(calculate({series:s}).reasons[0],/SERIES_MISSING/);
});
test('invalid numbers, zero denominator and invalid month fail closed', () => {
  for(const value of [null,0,NaN,Infinity,-1]){const s=fixture();s.PCEPI[0].value=value;assert.equal(calculate({series:s}).status,'PARTIAL');}
  const s=fixture();s.PCEPI[0].observationDate='2014-13-01';assert.match(calculate({series:s}).reasons[0],/INVALID_MONTH/);
});
test('future values cannot alter explicitly selected historical month', () => {
  const s=fixture(), a=calculate({series:s,observationMonth:'2026-07-01'});
  for(const id of ids)s[id].at(-1).value*=10;
  const b=calculate({series:s,observationMonth:'2026-07-01'});assert.deepEqual(a,b);
  assert.equal(calculate({series:s,observationMonth:'2026-09-01'}).score,null);
});
test('insufficient warmup stays partial; numeric strings are not accepted', () => {
  const s=fixture();for(const id of ids)s[id]=s[id].slice(-25);assert.equal(calculate({series:s}).status,'PARTIAL');
  const full=fixture();full.DSPIC96[100].value='100';assert.equal(calculate({series:full}).score,null);
});
test('expected inflation is a rate: zero and negative percentages remain valid observations', () => {
 for(const value of [0,-.5]){const s=fixture();s.EXPINF5YR.forEach(r=>r.value=value);const r=calculate({series:s});assert.equal(r.status,'READY');assert.equal(r.history.at(-1).signalRisk[8],0);}
});
