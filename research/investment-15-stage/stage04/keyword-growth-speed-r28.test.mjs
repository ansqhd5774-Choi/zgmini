import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KEYWORDS, FORECAST_CAGR_OUTPUT_SCHEMA, measureKeyword
} from './keyword-growth-speed-r25-readonly.mjs';

const report = (keyword) => `<html><body><h1>${keyword}</h1>` +
  `<p>${keyword} 2026 to 2030 future market forecast CAGR of 12.4%.</p></body></html>`;
const search = (keyword) => `<html><body><h4><a href="/report/${keyword.replaceAll(' ', '-')}-global-market-report">` +
  `${keyword} Market Report 2026</a></h4></body></html>`;

test('R28 uses documented JSON schema for each distinct topic and validates growth', async () => {
  const seen = [];
  for (const keyword of KEYWORDS) {
    const result = await measureKeyword(keyword, {
      searchMode: 'publisher-site', structuredOutput: true,
      fetchFn: async (url, options) => {
        if (url.includes('/global-market-reports?')) return new Response(search(keyword));
        if (url.includes('/report/')) return new Response(report(keyword));
        const request = JSON.parse(options.body);
        seen.push({ keyword, url, request });
        assert.equal(request.model, 'gemma3:4b');
        assert.equal(request.stream, false);
        assert.deepEqual(request.format, FORECAST_CAGR_OUTPUT_SCHEMA);
        assert.match(request.prompt, /FORECAST_CAGR/);
        assert.match(request.prompt, new RegExp(keyword));
        return Response.json({
          response: JSON.stringify({ growth_pct: 12.4, metric: 'FORECAST_CAGR',
            period_start: 2026, period_end: 2030 }),
          done_reason: 'stop', eval_count: 52, total_duration: 1_200_000_000
        });
      }
    });
    assert.equal(result.state, 'PASS');
    assert.equal(result.growth_pct, 12.4);
    assert.equal(result.ollama_reported_ms, 1200);
    assert.equal(result.ollama_eval_count, 52);
    assert.equal(result.ollama_done_reason, 'stop');
    assert.match(result.ollama_response_sample, /FORECAST_CAGR/);
    assert.equal(result.ollama_generations, 1);
  }
  assert.equal(seen.length, 5);
  assert.equal(new Set(seen.map(({keyword}) => keyword)).size, 5);
});

test('R28 records model output even on wrong metric and never fabricates growth', async () => {
  const result = await measureKeyword('nuclear reactor', {
    searchMode: 'publisher-site', structuredOutput: true,
    fetchFn: async (url) => {
      if (url.includes('/global-market-reports?')) return new Response(search('nuclear reactor'));
      if (url.includes('/report/')) return new Response(report('nuclear reactor'));
      return Response.json({ response: JSON.stringify({ growth_pct: 12.4, metric: 'YOY',
        period_start: 2026, period_end: 2030 }), total_duration: 820_000_000 });
    }
  });
  assert.equal(result.state, 'FAILED');
  assert.equal(result.failure, 'OLLAMA_WRONG_GROWTH_TYPE');
  assert.equal(result.growth_pct, null);
  assert.equal(result.ollama_generations, 1);
  assert.equal(result.ollama_reported_ms, 820);
  assert.match(result.ollama_response_sample, /YOY/);
});

test('R28 rejects a structurally shaped answer that invents the number', async () => {
  const result = await measureKeyword('data center', {
    searchMode: 'publisher-site', structuredOutput: true,
    fetchFn: async (url) => {
      if (url.includes('/global-market-reports?')) return new Response(search('data center'));
      if (url.includes('/report/')) return new Response(report('data center'));
      return Response.json({ response: JSON.stringify({ growth_pct: 19.1,
        metric: 'FORECAST_CAGR', period_start: 2026, period_end: 2030 }) });
    }
  });
  assert.equal(result.state, 'FAILED');
  assert.equal(result.failure, 'OLLAMA_VALUE_NOT_IN_SOURCE');
  assert.equal(result.growth_pct, null);
});
