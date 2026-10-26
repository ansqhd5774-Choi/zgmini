import test from 'node:test';
import assert from 'node:assert/strict';
import { auditForecastSource } from './forecast-source-audit-r29-readonly.mjs';
import { researchAll } from './keyword-growth-all-r31-readonly.mjs';
import { SECTOR_TOPICS, THEME_TOPICS } from './stage04-all-universe-r31.mjs';

function report({ keyword, old = 90.91, base = 100, end = 146.41,
  historic = 10, table = historic, future = 10 }) {
  return `<html><body><h1>${keyword} Market Report 2026</h1>` +
    `<h2>What Is The ${keyword} Market Size and Share 2026?</h2>` +
    `<p>It will grow from $${old} billion in 2025 to $${base} billion in 2026 ` +
    `at a compound annual growth rate (CAGR) of ${historic}%.</p>` +
    `<h2>What Is The ${keyword} Market Growth Forecast?</h2>` +
    `<p>It will grow to $${end} billion in 2030 at a compound annual ` +
    `growth rate (CAGR) of ${future}%. Forecast demand continues.</p>` +
    `<h3>${keyword} Market Report Forecast Analysis</h3>` +
    `<p>Market Size Value In 2026 $${base} billion Revenue Forecast In 2030 $${end} billion ` +
    `Growth Rate CAGR of ${table}% from 2026 to 2030 Forecast Period 2026 - 2030</p></body></html>`;
}

const biotech = { keyword: 'biotechnology services', old: 178.54, base: 196.54,
  end: 314.12, historic: 10.1, table: 10.1, future: 12.4 };
const datacenter = { keyword: 'data center', old: 299.63, base: 324.25,
  end: 460.61, historic: 8.2, table: 8.2, future: 9.2 };

test('R31 opt-in identifies independently verified historic CAGR mislabel, not a forecast disagreement', () => {
  for (const caseData of [biotech, datacenter]) {
    const legacy = auditForecastSource(report(caseData));
    assert.equal(legacy.source_audit, 'SOURCE_CONFLICT');
    const corrected = auditForecastSource(report(caseData),
      { resolveHistoricTableMislabel: true });
    assert.equal(corrected.source_audit, 'RESOLVED_HISTORIC_RATE_MISLABEL');
    assert.equal(corrected.historic_narrative_pct, caseData.historic);
    assert.ok(Math.abs(corrected.historic_math_pct - caseData.historic) < 0.15);
    assert.ok(Math.abs(corrected.forecast_math_pct - caseData.future) < 0.15);
  }
});

test('R31 must not silently fix unrelated or mathematically inconsistent metadata', () => {
  const notHistoric = report({ ...biotech, table: 11.7 });
  assert.equal(auditForecastSource(notHistoric,
    { resolveHistoricTableMislabel: true }).source_audit, 'SOURCE_CONFLICT');

  const wrongHistoricSizes = report({ ...biotech, old: 100 });
  assert.equal(auditForecastSource(wrongHistoricSizes,
    { resolveHistoricTableMislabel: true }).source_audit, 'SOURCE_CONFLICT');

  const wrongFuture = report({ ...biotech, future: 17 });
  assert.equal(auditForecastSource(wrongFuture,
    { resolveHistoricTableMislabel: true }).source_audit, 'SOURCE_CONFLICT');
});

test('R31 discovers 11 sectors + 9 themes from live-shaped feeds; all 20 researched once', async () => {
  const sectorIds = Object.keys(SECTOR_TOPICS);
  const themeNames = Object.keys(THEME_TOPICS).slice(0, 9);
  const modelQueries = [];
  const results = await researchAll({ fetchFn: async (url, options = {}) => {
    if (url === 'https://zgmini.kr/api/sector-fear-greed') {
      return Response.json({ status: 'READY', sectors: sectorIds.map(id => ({ id })) });
    }
    if (url === 'https://zgmini.kr/api/theme-fear-greed') {
      return Response.json({ status: 'READY', themes: themeNames.map(theme => ({ theme })) });
    }
    if (url.includes('/global-market-reports?search=')) {
      const keyword = new URL(url).searchParams.get('search');
      return new Response(`<html><h4><a href="/report/${keyword.replaceAll(' ', '-')}-global-market-report">` +
        `${keyword} Market Report 2026</a></h4></html>`, { status: 200 });
    }
    if (url.startsWith('https://www.thebusinessresearchcompany.com/report/')) {
      const keyword = new URL(url).pathname.split('/').at(-1).replace('-global-market-report', '')
        .replaceAll('-', ' ');
      return new Response(report(keyword === biotech.keyword ? biotech :
        keyword === datacenter.keyword ? datacenter : { keyword }), { status: 200 });
    }
    assert.equal(url, 'http://127.0.0.1:11434/api/generate');
    const request = JSON.parse(options.body);
    const keyword = request.prompt.match(/What Is The (.+?) Market Growth Forecast\?/i)?.[1];
    modelQueries.push(keyword);
    return Response.json({ response: JSON.stringify({
      growth_pct: keyword === biotech.keyword ? 12.4 : keyword === datacenter.keyword ? 9.2 : 10,
      metric: 'FORECAST_CAGR'
    }) });
  } });
  assert.equal(results.counts.sectors, 11);
  assert.equal(results.counts.themes, 9);
  assert.equal(results.rows.length, 20);
  assert.equal(modelQueries.length, 20);
  assert.equal(results.counts.passed, 20);
  assert.equal(results.counts.resolvedHistoric, 2);
  assert.equal(results.status, 'RESEARCH_PASS');
  assert.equal(results.rows.find(x => x.name === '바이오·신약').growth_pct, 12.4);
  assert.equal(results.rows.find(x => x.name === '데이터센터·전력').growth_pct, 9.2);
  assert.ok(results.rows.every(x => x.scope.includes('PROXY_NOT')));
});

test('R31 unknown newly published themes are reported, never silently dropped or fabricated', async () => {
  let modelCalls = 0;
  const results = await researchAll({ fetchFn: async url => {
    if (url.includes('/api/sector-fear-greed'))
      return Response.json({ status: 'READY', sectors: [] });
    if (url.includes('/api/theme-fear-greed'))
      return Response.json({ status: 'READY', themes: [{ theme: '새로운 테마' }] });
    modelCalls++;
    throw new Error('MODEL_MUST_NOT_BE_CALLED_FOR_UNMAPPED');
  } });
  assert.equal(results.rows.length, 1);
  assert.equal(results.rows[0].state, 'NO_RESEARCH_MAPPING');
  assert.equal(results.rows[0].growth_pct, null);
  assert.equal(modelCalls, 0);
  assert.equal(results.status, 'PARTIAL_RESEARCH');
});
