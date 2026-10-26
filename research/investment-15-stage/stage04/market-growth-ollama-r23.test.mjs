import test from 'node:test';
import assert from 'node:assert/strict';
import { benchmark, extractMarketExcerpt, validateModelReply, REPORT_URL } from './market-growth-ollama-r23-readonly.mjs';

const paragraph = `Nuclear Power Market Size. The global nuclear power market size was valued at USD 40.48 billion in 2025. The market is projected to grow from USD 41.68 billion in 2026 to USD 52.62 billion by 2034, exhibiting a CAGR of 2.96% during the forecast period.`;
const html = `<html><script>IGNORE</script><main><h1>Nuclear Power</h1><p>${paragraph}</p></main></html>`;

test('extracts only a small target excerpt and no script payload', () => {
  const text = extractMarketExcerpt(html);
  assert.ok(text.length < 650);
  assert.match(text, /CAGR of 2\.96%/);
  assert.doesNotMatch(text, /IGNORE/);
});

test('rejects fabricated percentage and non-forecast response', () => {
  assert.throws(() => validateModelReply(JSON.stringify({ growth_pct: 55.55,
    metric: 'FORECAST_CAGR', period_start: 2026, period_end: 2034 }), paragraph),
  /OLLAMA_VALUE_NOT_IN_SOURCE/);
  assert.throws(() => validateModelReply(JSON.stringify({ growth_pct: 2.96,
    metric: 'HISTORICAL_YOY', period_start: 2026, period_end: 2034 }), paragraph),
  /OLLAMA_WRONG_GROWTH_TYPE/);
});

test('single publisher request and single Ollama generation; measured separately', async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    if (url === REPORT_URL) return new Response(html, { status: 200 });
    if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: 'existing-model' }] });
    if (url.endsWith('/api/generate')) {
      const body = JSON.parse(options.body);
      assert.equal(body.model, 'existing-model');
      assert.ok(body.prompt.length < 1300);
      assert.doesNotMatch(body.prompt, /IGNORE/);
      return Response.json({ response: JSON.stringify({ growth_pct: 2.96,
        metric: 'FORECAST_CAGR', period_start: 2026, period_end: 2034 }),
        total_duration: 3_500_000, eval_count: 28 });
    }
    throw new Error('UNEXPECTED_URL');
  };
  const output = await benchmark({ fetchFn: fakeFetch });
  assert.equal(output.state, 'PASS');
  assert.equal(output.growth_pct, 2.96);
  assert.equal(output.model, 'existing-model');
  assert.equal(output.ollama_reported_ms, 4);
  assert.equal(output.publisher_requests, 1);
  assert.equal(output.ollama_generations, 1);
  assert.equal(calls.length, 3);
  assert.ok(output.publisher_ms !== null && output.ollama_ms !== null);
});

test('publisher 403 stops with no fallback and no model calls', async () => {
  let calls = 0;
  const output = await benchmark({ fetchFn: async () => { calls++;
    return new Response('denied', { status: 403 }); } });
  assert.equal(output.state, 'FAILED');
  assert.equal(output.failure, 'PUBLISHER_HTTP_403');
  assert.equal(output.ollama_generations, 0);
  assert.equal(calls, 1);
});

test('shared time limit aborts a slow publisher without retry', async () => {
  let calls = 0;
  const output = await benchmark({ maxMs: 25, fetchFn: (_, { signal }) => {
    calls++;
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  } });
  assert.equal(output.state, 'FAILED');
  assert.equal(output.failure, 'TOTAL_DEADLINE_EXCEEDED');
  assert.equal(calls, 1);
});

test('model-only speed test bypasses blocked publisher and labels reference input', async () => {
  let calls = 0;
  const output = await benchmark({ mode: 'model-only', model: 'existing-model', fetchFn: async (url) => {
    calls++;
    assert.ok(url.endsWith('/api/generate'));
    return Response.json({ response: JSON.stringify({ growth_pct: 2.96,
      metric: 'FORECAST_CAGR', period_start: 2026, period_end: 2034 }),
      total_duration: 5_100_000, eval_count: 21 });
  }});
  assert.equal(output.state, 'PASS');
  assert.equal(output.source_mode, 'REFERENCE_SAMPLE_NOT_LIVE');
  assert.equal(output.publisher_requests, 0);
  assert.equal(output.ollama_generations, 1);
  assert.equal(output.ollama_reported_ms, 5);
  assert.equal(calls, 1);
});
