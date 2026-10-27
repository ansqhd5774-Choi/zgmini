import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSelectedThemeF } from './live-f-adapter-r67.mjs';

test('R17 approved nine-theme mapping and provisional precedence stay separate', () => {
  const selected = {
    status: 'LIVE_F_OBSERVED', sourceVersion: 'R_TEST', fetchedAt: '2026-10-27T12:00:00Z',
    themes: [
      { theme: '로봇·자동화', currentInput: 22.1, observationDate: '2026-10-27', phase: 'PROVISIONAL' },
      { theme: '클라우드·SaaS', currentInput: 65.4, observationDate: '2026-10-26', phase: 'BASE_OBSERVED' },
      { theme: '우주·위성', currentInput: 60, observationDate: '2026-10-27', phase: 'BASE_OBSERVED' },
    ],
  };
  const mapped = normalizeSelectedThemeF(selected, 'https://zgmini.kr/api/theme-fear-greed');
  assert.equal(mapped.records.length, 2);
  assert.deepEqual(mapped.records.map(x => [x.topic_id, x.status, x.observed_at]), [
    [12, 'PROVISIONAL', '2026-10-27'],
    [13, 'CONFIRMED', '2026-10-26'],
  ]);
  assert.deepEqual(mapped.diagnostics.ignored_unapproved_theme_names, ['우주·위성']);
  assert.equal(mapped.diagnostics.missing_approved_themes.length, 7);
});

test('unavailable source scores are missing and missing observation dates fail', () => {
  const one = normalizeSelectedThemeF({ status: 'PARTIAL_LIVE_F', themes: [
    { theme: '로봇·자동화', currentInput: null, observationDate: null, phase: 'UNAVAILABLE' },
  ] }, 'test');
  assert.equal(one.records.length, 0);
  assert.throws(() => normalizeSelectedThemeF({ themes: [
    { theme: '로봇·자동화', currentInput: 12, observationDate: null, phase: 'BASE_OBSERVED' },
  ] }, 'test'), /Missing actual observation date/);
});
