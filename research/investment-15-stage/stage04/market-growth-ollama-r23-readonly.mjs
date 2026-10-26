/**
 * Stage04/R23: one specialist publisher / one small market-growth excerpt /
 * one local Ollama extraction. Research-only; never scores or trades.
 * This script makes at most one publisher request and one model generation.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_TOTAL_MS = 20_000;
export const PUBLISHER = 'Fortune Business Insights';
export const REPORT_URL = 'https://www.fortunebusinessinsights.com/industry-reports/nuclear-power-market-100734';
export const TOPIC = 'nuclear power';
const MAX_SOURCE_BYTES = 1_500_000;
// Speed-only sample. This is NOT a fresh market observation or an input to G.
const SPEED_SAMPLE = 'Nuclear power market: global market size was USD 40.48 billion in 2025. The market is forecast to increase from USD 41.68 billion in 2026 to USD 52.62 billion by 2034, exhibiting a CAGR of 2.96% during the forecast period.';

function plainText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|nav|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Number(digits)))
    .replace(/\s+/g, ' ').trim();
}

/** Only the short CAGR paragraph is sent to Ollama, never the full page. */
export function extractMarketExcerpt(html, topic = TOPIC) {
  const text = plainText(html);
  const matches = [...text.matchAll(/\bCAGR\s+(?:of\s+)?(\d{1,2}(?:\.\d+)?)\s*%/gi)];
  for (const match of matches) {
    const start = Math.max(0, match.index - 380);
    const end = Math.min(text.length, match.index + match[0].length + 120);
    const excerpt = text.slice(start, end).trim();
    if (new Set(excerpt.match(/\b20\d{2}\b/g) || []).size < 2) continue;
    if (!topic.toLowerCase().split(/\s+/).every((word) => excerpt.toLowerCase().includes(word))) continue;
    return excerpt.slice(-650);
  }
  return null;
}

export function validateModelReply(raw, excerpt) {
  let answer;
  try { answer = JSON.parse(raw); } catch { throw new Error('OLLAMA_INVALID_JSON'); }
  const value = Number(answer.growth_pct);
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('OLLAMA_INVALID_GROWTH');
  if (answer.metric !== 'FORECAST_CAGR') throw new Error('OLLAMA_WRONG_GROWTH_TYPE');
  // JSON numbers cannot preserve a trailing .0 (21.0 becomes 21). Accept
  // equivalent trailing zeroes, but never a different nonzero decimal digit.
  const literal = String(value).replace('.', '\\.');
  const pct = new RegExp(`\\b${literal}(?:\\.0+)?\\s*%`);
  if (!pct.test(excerpt)) throw new Error('OLLAMA_VALUE_NOT_IN_SOURCE');
  const from = Number(answer.period_start);
  const to = Number(answer.period_end);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from >= to ||
      !excerpt.includes(String(from)) || !excerpt.includes(String(to))) {
    throw new Error('OLLAMA_PERIOD_NOT_IN_SOURCE');
  }
  return { growth_pct: value, metric: 'FORECAST_CAGR', period_start: from, period_end: to };
}

async function readSmallSource(response, topic, signal) {
  if (!response.ok) throw new Error(`PUBLISHER_HTTP_${response.status}`);
  if (new URL(response.url || REPORT_URL).origin !== new URL(REPORT_URL).origin) {
    throw new Error('PUBLISHER_REDIRECT_ORIGIN_CHANGED');
  }
  if (!response.body?.getReader) throw new Error('PUBLISHER_BODY_UNAVAILABLE');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let html = '';
  try {
    while (bytes < MAX_SOURCE_BYTES) {
      if (signal.aborted) throw new Error('TOTAL_DEADLINE_EXCEEDED');
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_SOURCE_BYTES) throw new Error('PUBLISHER_RESPONSE_TOO_LARGE');
      html += decoder.decode(value, { stream: true });
      const excerpt = extractMarketExcerpt(html, topic);
      if (excerpt) return { excerpt, bytes };
    }
    const excerpt = extractMarketExcerpt(html + decoder.decode(), topic);
    if (!excerpt) throw new Error('PUBLISHER_GROWTH_NOT_FOUND');
    return { excerpt, bytes };
  } finally {
    // Stop the stream as soon as the summary has been found.
    void reader.cancel().catch(() => {});
  }
}

async function jsonResponse(response, code) {
  if (!response.ok) throw new Error(`${code}_HTTP_${response.status}`);
  try { return await response.json(); } catch { throw new Error(`${code}_INVALID_JSON`); }
}

export async function benchmark({
  fetchFn = fetch,
  sourceUrl = REPORT_URL,
  topic = TOPIC,
  ollamaHost = 'http://127.0.0.1:11434',
  model = process.env.ZG_OLLAMA_MODEL || '',
  mode = 'live',
  now = () => performance.now(),
  maxMs = MAX_TOTAL_MS,
} = {}) {
  if (maxMs <= 0 || maxMs > MAX_TOTAL_MS) throw new Error('INVALID_DEADLINE');
  if (!['live', 'model-only'].includes(mode)) throw new Error('INVALID_MODE');
  if (new URL(sourceUrl).origin !== new URL(REPORT_URL).origin) throw new Error('INVALID_PUBLISHER_HOST');
  if (!/^https?:\/\/127\.0\.0\.1:11434\/?$/.test(ollamaHost)) throw new Error('INVALID_OLLAMA_HOST');
  const began = now();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), maxMs);
  const result = { state: 'FAILED', publisher: PUBLISHER, topic,
    source_mode: mode === 'model-only' ? 'REFERENCE_SAMPLE_NOT_LIVE' : 'LIVE_PUBLISHER',
    url: sourceUrl, deadline_ms: maxMs, publisher_requests: 0, ollama_generations: 0,
    publisher_ms: null, ollama_ms: null, total_ms: null, model: null,
    growth_pct: null, metric: null, period_start: null, period_end: null,
    ollama_reported_ms: null, ollama_eval_tokens: null, failure: null };
  try {
    let excerpt;
    if (mode === 'model-only') {
      excerpt = SPEED_SAMPLE;
      result.publisher_ms = 0;
    } else {
      const sourceBegan = now();
      result.publisher_requests = 1;
      const sourceResponse = await fetchFn(sourceUrl, { signal: abort.signal,
        headers: { accept: 'text/html' }, redirect: 'follow' });
      const sourceData = await readSmallSource(sourceResponse, topic, abort.signal);
      excerpt = sourceData.excerpt;
      result.publisher_ms = Math.round(now() - sourceBegan);
    }
    if (now() - began >= maxMs) throw new Error('TOTAL_DEADLINE_EXCEEDED');

    const ollamaBegan = now();
    if (!model) {
      const tags = await jsonResponse(await fetchFn(`${ollamaHost}/api/tags`, {
        signal: abort.signal, headers: { accept: 'application/json' }
      }), 'OLLAMA_TAGS');
      model = tags.models?.find(({ name }) => !/embed|rerank/i.test(name || ''))?.name || '';
    }
    if (!model) throw new Error('OLLAMA_MODEL_NOT_FOUND');
    result.model = model;
    result.ollama_generations = 1;
    const response = await fetchFn(`${ollamaHost}/api/generate`, {
      method: 'POST', signal: abort.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, stream: false, think: false, format: 'json',
        options: { temperature: 0, num_predict: 90 },
        prompt: 'Read only the short supplied publisher excerpt. Return ONLY JSON with ' +
          'growth_pct (number), metric (exactly FORECAST_CAGR), period_start (year), ' +
          'period_end (year). Do not infer numbers not printed. ' +
          'This is a forecast CAGR, NOT realized yearly growth.\nExcerpt:\n' + excerpt })
    });
    const completion = await jsonResponse(response, 'OLLAMA_GENERATE');
    result.ollama_ms = Math.round(now() - ollamaBegan);
    if (now() - began >= maxMs || abort.signal.aborted) throw new Error('TOTAL_DEADLINE_EXCEEDED');
    Object.assign(result, validateModelReply(completion.response, excerpt));
    result.ollama_reported_ms = Number.isFinite(completion.total_duration)
      ? Math.round(completion.total_duration / 1e6) : null;
    result.ollama_eval_tokens = Number.isFinite(completion.eval_count) ? completion.eval_count : null;
    result.state = 'PASS';
  } catch (error) {
    result.failure = abort.signal.aborted ? 'TOTAL_DEADLINE_EXCEEDED' :
      mode === 'model-only' && error?.message === 'fetch failed' ? 'OLLAMA_LOCAL_CONNECT_FAILED' :
      error?.cause?.code === 'ECONNREFUSED' ? 'OLLAMA_NOT_RUNNING' :
      (error?.message || 'UNKNOWN_ERROR');
  } finally {
    clearTimeout(timer);
    abort.abort();
    result.total_ms = Math.round(now() - began);
    if (result.total_ms > maxMs) {
      result.state = 'FAILED';
      result.failure = 'TOTAL_DEADLINE_EXCEEDED';
      result.growth_pct = null;
    }
  }
  return result;
}

function serialize(result) {
  return [`REPORT=${result.source_mode === 'REFERENCE_SAMPLE_NOT_LIVE'
    ? 'STAGE04_OLLAMA_ONLY_R24_READONLY' : 'STAGE04_OLLAMA_GROWTH_R23_READONLY'}`,
    'PURPOSE=PRIVATE_BENCHMARK_NOT_INVESTMENT_DATA',
    ...Object.entries(result).map(([key, value]) => `${key.toUpperCase()}=${value ?? 'NULL'}`),
    'PUBLICATION=NONE', 'SCORING_CHANGE=NONE', 'ORDER=NONE', 'RETRIES=0', 'SOURCE_SWITCHES=0', ''].join('\r\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const onlyModel = process.argv[2] === '--ollama-only';
  const selectedModel = onlyModel ? process.argv[3] : process.argv[2];
  const result = await benchmark({ mode: onlyModel ? 'model-only' : 'live',
    model: selectedModel || process.env.ZG_OLLAMA_MODEL || '' });
  const report = serialize(result);
  const path = join(dirname(fileURLToPath(import.meta.url)),
    onlyModel ? 'R24_OLLAMA_ONLY_RESULT.txt' : 'R23_OLLAMA_GROWTH_RESULT.txt');
  try { await writeFile(path, report, 'utf8'); }
  catch (error) { console.error('REPORT_WRITE_FAILED=' + error.message); }
  process.stdout.write(report + '\n');
  process.exitCode = result.state === 'PASS' ? 0 : 1;
}
