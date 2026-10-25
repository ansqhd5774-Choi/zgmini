import test from 'node:test';
import assert from 'node:assert/strict';
import { selectThemeF } from './latest-f-readonly.mjs';

function theme(name, score, date) {
  return { theme: name, score, history: [{ date, score }] };
}

test('newer provisional is current, older confirmed is comparison only', () => {
  const input = {
    status: 'READY', phase: 'PROVISIONAL',
    themes: [theme('바이오·신약', 29.03175, '2026-10-21')],
    provisional: { points: [
      { date: '2026-10-22', scores: { '바이오·신약': 26.48413 } },
      { date: '2026-10-23', scores: { '바이오·신약': 22.63294 } },
    ] },
  };
  const [s] = selectThemeF(input, { asOfDate: '2026-10-25', expectedThemes: 1 }).themes;
  assert.equal(s.currentInput, 22.63294);
  assert.equal(s.observationDate, '2026-10-23');
  assert.equal(s.phase, 'PROVISIONAL');
  assert.deepEqual(s.priorBaseForComparison, { date: '2026-10-21', score: 29.03175 });
});

test('global provisional flag does not turn all themes into provisional', () => {
  const input = { status: 'READY', phase: 'PROVISIONAL',
    themes: [theme('로봇·자동화', 20.68849, '2026-10-23')],
    provisional: { points: [] },
  };
  const [s] = selectThemeF(input, { asOfDate: '2026-10-25', expectedThemes: 1 }).themes;
  assert.equal(s.currentInput, 20.68849);
  assert.equal(s.phase, 'BASE_OBSERVED');
  assert.equal(s.sourceObservationMayLag, true);
});

test('equal-date provisional wins', () => {
  const input = { status: 'READY', themes: [theme('X', 55, '2026-10-23')],
    provisional: { points: [{ date: '2026-10-23', scores: { X: 48 } }] },
  };
  assert.equal(selectThemeF(input, { asOfDate: '2026-10-25', expectedThemes: 1 }).themes[0].currentInput, 48);
});

test('future, malformed and out-of-range points do not become current', () => {
  const input = { status: 'READY', themes: [theme('X', 55, '2026-10-23')],
    provisional: { points: [
      { date: '2026-10-26', scores: { X: 5 } },
      { date: '2026-10-24', scores: { X: 101 } },
      { date: '2026-02-30', scores: { X: 0 } },
    ] },
  };
  const [s] = selectThemeF(input, { asOfDate: '2026-10-25', expectedThemes: 1 }).themes;
  assert.equal(s.currentInput, 55);
  assert.equal(s.observationDate, '2026-10-23');
  assert.equal(s.phase, 'BASE_OBSERVED');
});

test('invalid base is missing, not zero and not current', () => {
  const input = { status: 'READY', themes: [theme('X', 105, '2026-10-23')] };
  const result = selectThemeF(input, { asOfDate: '2026-10-25', expectedThemes: 1 });
  assert.equal(result.status, 'PARTIAL_LIVE_F');
  assert.equal(result.themes[0].currentInput, null);
  assert.equal(result.themes[0].phase, 'UNAVAILABLE');
});
