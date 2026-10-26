/**
 * R25 read-only, manual benchmark: keyword-specific indexed lookup of ONE
 * specialized growth publisher, ONE short excerpt, ONE local Ollama call.
 * No live investment scores and no retry or source switching.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractMarketExcerpt, validateModelReply } from './market-growth-ollama-r23-readonly.mjs';
import { auditForecastSource } from './forecast-source-audit-r29-readonly.mjs';

export const MAX_KEYWORD_MS = 20_000;
export const PUBLISHER = 'The Business Research Company';
export const SEARCH_HOST = 'https://www.bing.com';
export const PUBLISHER_HOST = 'https://www.thebusinessresearchcompany.com';
export const KEYWORDS = [
  'nuclear reactor',
  'robotics and automation',
  'artificial intelligence semiconductors',
  'biotechnology services',
  'data center',
];

// Local Ollama's documented structured-output format for a single forecast-CAGR
// excerpt. In the R28 benchmark, the model has no freedom to relabel the
// metric as "growth", "CAGR" or a historic year-on-year percentage.
export const FORECAST_CAGR_OUTPUT_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    growth_pct: { type: 'number', minimum: 0, maximum: 100 },
    metric: { type: 'string', enum: ['FORECAST_CAGR'] },
    period_start: { type: 'integer', minimum: 2000, maximum: 2100 },
    period_end: { type: 'integer', minimum: 2000, maximum: 2100 }
  },
  required: ['growth_pct', 'metric', 'period_start', 'period_end'],
  additionalProperties: false
});

// R30: the report's verified forecast attributes own the year interval.
// Ollama only reads the forecast narrative CAGR; it does not guess years.
export const FORECAST_RATE_ONLY_OUTPUT_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    growth_pct: { type: 'number', minimum: 0, maximum: 100 },
    metric: { type: 'string', enum: ['FORECAST_CAGR'] }
  },
  required: ['growth_pct', 'metric'],
  additionalProperties: false
});

export function validateModelForecastRateOnly(raw, excerpt) {
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('OLLAMA_INVALID_JSON'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
      Object.keys(parsed).sort().join(',') !== 'growth_pct,metric') {
    throw new Error('OLLAMA_RATE_SCHEMA_MISMATCH');
  }
  if (typeof parsed.growth_pct !== 'number' || !Number.isFinite(parsed.growth_pct) ||
      parsed.growth_pct < 0 || parsed.growth_pct > 100) {
    throw new Error('OLLAMA_INVALID_GROWTH');
  }
  if (parsed.metric !== 'FORECAST_CAGR') throw new Error('OLLAMA_WRONG_GROWTH_TYPE');
  const literal = String(parsed.growth_pct).replace('.', '\\.');
  if (!new RegExp(`\\b${literal}(?:\\.0+)?\\s*%`).test(excerpt)) {
    throw new Error('OLLAMA_VALUE_NOT_IN_SOURCE');
  }
  return { growth_pct: parsed.growth_pct, metric: 'FORECAST_CAGR' };
}

function decodeEntities(s) {
  return String(s).replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/<\/?!\[CDATA\[/g, '').replace(/\]\]>/g, '');
}

function innerTag(xml, name) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decodeEntities(match[1]).replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '') : '';
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchesKeyword(title, keyword) {
  const titleWords = stripTags(title).toLowerCase();
  return keyword.toLowerCase().split(/\s+/).filter((x) => x !== 'and')
    .every((token) => titleWords.includes(token.slice(0, Math.min(token.length, 6))));
}

function allowedReportUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
      (parsed.hostname === 'www.thebusinessresearchcompany.com' ||
       parsed.hostname === 'thebusinessresearchcompany.com') &&
      parsed.pathname.startsWith('/report/');
  } catch { return false; }
}

export function parseOneSpecialistResult(xml, keyword) {
  const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  for (const [, item] of items.slice(0, 20)) {
    const title = stripTags(innerTag(item, 'title'));
    const link = stripTags(innerTag(item, 'link'));
    if (!allowedReportUrl(link) || !matchesKeyword(title, keyword)) continue;
    const description = stripTags(innerTag(item, 'description'));
    return { url: link, title, description };
  }
  return null;
}

function searchDiagnostics(xml, keyword) {
  const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  let publisher = 0;
  let titleMatched = 0;
  const sample = [];
  for (const [, item] of items.slice(0, 20)) {
    const title = stripTags(innerTag(item, 'title'));
    const url = stripTags(innerTag(item, 'link'));
    const allowed = allowedReportUrl(url);
    if (allowed) publisher++;
    if (allowed && matchesKeyword(title, keyword)) titleMatched++;
    if (sample.length < 3) {
      let host = 'INVALID_URL';
      try { host = new URL(url).hostname; } catch { /* no link */ }
      sample.push(`${host}:${title.slice(0, 70).replace(/[\r\n=|]/g, ' ')}`);
    }
  }
  return { rss_items: items.length, publisher_index_links: publisher,
    title_matched_links: titleMatched, indexed_sample: sample.join(' | ') || 'NONE' };
}

/** TBRC's public report-store search renders title links inside h4 cards. */
export function parsePublisherSearchPage(html, keyword) {
  const reports = [];
  for (const match of html.matchAll(/<h4\b[^>]*>\s*<a\s+href=["'](\/report\/[^"'?#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = new URL(match[1], PUBLISHER_HOST).href;
    const title = stripTags(decodeEntities(match[2]));
    if (!allowedReportUrl(url)) continue;
    reports.push({ url, title, description: '' });
    if (reports.length >= 20) break;
  }
  const matched = reports.filter(({ title }) => matchesKeyword(title, keyword));
  return {
    selected: matched[0] || null,
    diagnostics: { search_page_cards: reports.length, publisher_index_links: reports.length,
      title_matched_links: matched.length,
      indexed_sample: reports.slice(0, 3).map(({ title }) =>
        title.slice(0, 80).replace(/[\r\n=|]/g, ' ')).join(' | ') || 'NONE' }
  };
}

async function limitedRead(response, maxBytes, stopWhen = () => false) {
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  if (!response.body?.getReader) throw new Error('EMPTY_RESPONSE');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let seen = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      seen += value.byteLength;
      if (seen > maxBytes) throw new Error('RESPONSE_TOO_LARGE');
      text += decoder.decode(value, { stream: true });
      if (stopWhen(text)) return text;
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
}

function chooseShortExcerpt(html, keyword) {
  const text = extractMarketExcerpt(html, keyword);
  if (text) return text;
  // Some report titles add qualifiers absent from the short market paragraph.
  const key = keyword.toLowerCase().split(/\s+/).find((s) => s.length >= 5) || keyword;
  return extractMarketExcerpt(html, key);
}

function ensureInBudget(started, now, maxMs) {
  if (now() - started >= maxMs) throw new Error('KEYWORD_DEADLINE_EXCEEDED');
}

export async function measureKeyword(keyword, {
  fetchFn = fetch,
  model = 'gemma3:4b',
  maxMs = MAX_KEYWORD_MS,
  now = () => performance.now(),
  searchQuery = null,
  searchMode = 'bing-rss',
  structuredOutput = false,
  auditForecast = false,
  rateOnlyFromSource = false,
  resolveHistoricTableMislabel = false,
  allowedKeywords = KEYWORDS,
} = {}) {
  if (maxMs <= 0 || maxMs > MAX_KEYWORD_MS) throw new Error('INVALID_TIMEOUT');
  if (!Array.isArray(allowedKeywords) || !allowedKeywords.includes(keyword) ||
      typeof keyword !== 'string' || !keyword.trim()) throw new Error('INVALID_TEST_KEYWORD');
  if (!['bing-rss', 'publisher-site'].includes(searchMode)) throw new Error('INVALID_SEARCH_MODE');
  if (typeof structuredOutput !== 'boolean') throw new Error('INVALID_STRUCTURED_OUTPUT');
  if (typeof auditForecast !== 'boolean' || (auditForecast && searchMode !== 'publisher-site')) {
    throw new Error('INVALID_FORECAST_AUDIT');
  }
  if (typeof rateOnlyFromSource !== 'boolean' ||
      (rateOnlyFromSource && (!auditForecast || !structuredOutput))) {
    throw new Error('INVALID_RATE_ONLY_MODE');
  }
  if (typeof resolveHistoricTableMislabel !== 'boolean' ||
      (resolveHistoricTableMislabel && !rateOnlyFromSource)) {
    throw new Error('INVALID_HISTORIC_MISLABEL_MODE');
  }
  const began = now();
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), maxMs);
  const query = searchMode === 'publisher-site' ? keyword :
    (searchQuery || `site:thebusinessresearchcompany.com/report/ "${keyword}" market CAGR 2026 2030`);
  if (typeof query !== 'string' || query.length > 220) throw new Error('INVALID_QUERY');
  const searchUrl = searchMode === 'publisher-site'
    ? `${PUBLISHER_HOST}/global-market-reports?search=${encodeURIComponent(query)}`
    : `${SEARCH_HOST}/search?format=rss&q=${encodeURIComponent(query)}`;
  const result = { keyword, state: 'FAILED', publisher: PUBLISHER,
    search_engine: searchMode === 'publisher-site' ? 'Official TBRC report-store search' :
      (searchQuery ? 'Bing RSS publisher-named search' : 'Bing RSS site-filtered search'),
    search_query: query,
    result_url: null, model, keyword_deadline_ms: maxMs,
    search_requests: 0, report_requests: 0, ollama_generations: 0,
    search_ms: null, report_ms: 0, ollama_ms: null,
    total_ms: null, ollama_reported_ms: null, growth_pct: null,
    metric: null, period_start: null, period_end: null, failure: null,
    search_http_status: null, rss_items: null, search_page_cards: null, publisher_index_links: null,
    title_matched_links: null, indexed_sample: null };
  if (structuredOutput) {
    result.ollama_format = rateOnlyFromSource ? 'JSON_SCHEMA_FORECAST_RATE_ONLY' :
      'JSON_SCHEMA_FORECAST_CAGR';
    result.ollama_response_sample = null;
    result.ollama_done_reason = null;
    result.ollama_eval_count = null;
  }
  if (auditForecast) {
    result.source_audit = 'NOT_RUN';
    result.source_conflict_reason = null;
    result.forecast_narrative_pct = null;
    result.forecast_table_pct = null;
    result.forecast_math_pct = null;
    result.forecast_base_year = null;
    result.forecast_end_year = null;
    result.forecast_base_value = null;
    result.forecast_end_value = null;
    if (resolveHistoricTableMislabel) {
      result.historic_narrative_pct = null;
      result.historic_math_pct = null;
    }
    result.model_candidate_pct = null;
    if (rateOnlyFromSource) result.period_source = 'PUBLISHER_FORECAST_ATTRIBUTES';
  }
  try {
    const searchBegan = now();
    result.search_requests = 1;
    let feed;
    try {
      const searchResponse = await fetchFn(searchUrl, {
        signal: controller.signal,
        headers: { accept: searchMode === 'publisher-site' ? 'text/html' : 'application/rss+xml,application/xml,text/xml' }
      });
      result.search_http_status = searchResponse.status;
      const expectedOrigin = searchMode === 'publisher-site' ? PUBLISHER_HOST : SEARCH_HOST;
      if (new URL(searchResponse.url || searchUrl).origin !== expectedOrigin) throw new Error('SEARCH_REDIRECT_BLOCKED');
      feed = await limitedRead(searchResponse, searchMode === 'publisher-site' ? 650_000 : 350_000,
        searchMode === 'publisher-site'
          ? (raw) => raw.includes('</html>')
          : (raw) => (raw.match(/<\/item>/gi) || []).length >= 20);
    } catch (error) { throw new Error(`SEARCH_${error.message}`); }
    finally { result.search_ms = Math.round(now() - searchBegan); }
    let selected;
    if (searchMode === 'publisher-site') {
      if (!/<html\b/i.test(feed)) throw new Error('SEARCH_NOT_HTML');
      const parsed = parsePublisherSearchPage(feed, keyword);
      Object.assign(result, parsed.diagnostics);
      selected = parsed.selected;
    } else {
      if (!/<rss\b|<rdf:RDF\b/i.test(feed)) throw new Error('SEARCH_NOT_RSS');
      Object.assign(result, searchDiagnostics(feed, keyword));
      selected = parseOneSpecialistResult(feed, keyword);
    }
    if (!selected) throw new Error('SEARCH_NO_MATCHED_PUBLISHER_REPORT');
    result.result_url = selected.url;
    ensureInBudget(began, now, maxMs);

    let excerpt = chooseShortExcerpt(selected.description, keyword);
    if (!excerpt) {
      const reportBegan = now();
      result.report_requests = 1;
      let html;
      try {
        const reportResponse = await fetchFn(selected.url, {
          signal: controller.signal, headers: { accept: 'text/html' }, redirect: 'follow'
        });
        if (!allowedReportUrl(reportResponse.url || selected.url)) throw new Error('PUBLISHER_REDIRECT_BLOCKED');
        html = await limitedRead(reportResponse, auditForecast ? 2_500_000 : 1_500_000,
          auditForecast ? () => false : (raw) => Boolean(chooseShortExcerpt(raw, keyword)));
      } catch (error) { throw new Error(`PUBLISHER_${error.message}`); }
      finally { result.report_ms = Math.round(now() - reportBegan); }
      if (auditForecast) {
        const { forecast_excerpt, ...audit } = auditForecastSource(html,
          { resolveHistoricTableMislabel });
        Object.assign(result, audit);
        if (audit.source_audit === 'INCOMPLETE' || !forecast_excerpt) {
          throw new Error('SOURCE_AUDIT_INCOMPLETE');
        }
        excerpt = forecast_excerpt;
      } else {
        excerpt = chooseShortExcerpt(html, keyword);
      }
    }
    if (!excerpt) throw new Error('PUBLISHER_NO_CAGR_EXCERPT');
    ensureInBudget(began, now, maxMs);

    const modelBegan = now();
    result.ollama_generations = 1;
    let completion;
    try {
      const responseSchema = rateOnlyFromSource ? FORECAST_RATE_ONLY_OUTPUT_SCHEMA :
        FORECAST_CAGR_OUTPUT_SCHEMA;
      const modelResponse = await fetchFn('http://127.0.0.1:11434/api/generate', {
        method: 'POST', signal: controller.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, stream: false, think: false,
          format: structuredOutput ? responseSchema : 'json',
          options: { temperature: 0, num_predict: rateOnlyFromSource ? 70 : structuredOutput ? 120 : 90 },
          prompt: rateOnlyFromSource
            ? 'Read ONLY the supplied official publisher forecast excerpt. Extract the explicitly stated FORECAST CAGR percentage. ' +
              'Return ONLY two JSON fields: growth_pct (number copied exactly from the forecast narrative) ' +
              'and metric (literal FORECAST_CAGR). Do not provide period_start, period_end or any other fields. ' +
              'Do not use historic 2025-to-2026 growth or calculate a different CAGR. ' +
              'The validated year interval comes from the publisher report attributes, not from the model. ' +
              'JSON schema: ' + JSON.stringify(responseSchema) + '\nEXCERPT:\n' + excerpt
            : structuredOutput
            ? 'Read ONLY the supplied market excerpt. Extract the stated FORECAST compound annual growth rate (CAGR) and forecast beginning and ending years. ' +
              'Return exactly four JSON fields: growth_pct (number copied from the source), metric (the literal string FORECAST_CAGR), ' +
              'period_start (number, first forecast year), period_end (number, last forecast year). ' +
              'Never use an historical CAGR, YoY, market size, or inferred percentage. ' +
              'The JSON schema is: ' + JSON.stringify(FORECAST_CAGR_OUTPUT_SCHEMA) +
              '\nEXCERPT:\n' + excerpt
            : 'Extract ONLY the explicitly stated future CAGR from this one brief market research excerpt. ' +
              'Respond as JSON fields growth_pct (number), metric (exact FORECAST_CAGR), ' +
              'period_start (year), period_end (year). Do not invent values and do not use historic YoY.\n' + excerpt })
      });
      if (!modelResponse.ok) throw new Error(`OLLAMA_HTTP_${modelResponse.status}`);
      completion = await modelResponse.json();
    } finally { result.ollama_ms = Math.round(now() - modelBegan); }
    // Preserve minimal, capped diagnostics even when subsequent strict
    // model/source validation rejects the answer. No source page is saved.
    result.ollama_reported_ms = Number.isFinite(completion.total_duration)
      ? Math.round(completion.total_duration / 1e6) : null;
    if (structuredOutput) {
      result.ollama_response_sample = String(completion.response ?? '').slice(0, 360)
        .replace(/[\r\n=|]/g, ' ');
      result.ollama_done_reason = typeof completion.done_reason === 'string'
        ? completion.done_reason.slice(0, 50) : null;
      result.ollama_eval_count = Number.isFinite(completion.eval_count) ? completion.eval_count : null;
    }
    ensureInBudget(began, now, maxMs);
    if (rateOnlyFromSource) {
      const modelValue = validateModelForecastRateOnly(completion.response, excerpt);
      Object.assign(result, modelValue, {
        period_start: result.forecast_base_year,
        period_end: result.forecast_end_year
      });
    } else {
      Object.assign(result, validateModelReply(completion.response, excerpt));
    }
    if (auditForecast) {
      result.model_candidate_pct = result.growth_pct;
      if (Math.abs(result.growth_pct - result.forecast_narrative_pct) > 0.05 ||
          result.period_start !== result.forecast_base_year ||
          result.period_end !== result.forecast_end_year) {
        throw new Error('OLLAMA_NOT_MATCHING_FORECAST_SECTION');
      }
      if (result.source_audit === 'SOURCE_CONFLICT') {
        result.state = 'SOURCE_CONFLICT';
        result.failure = 'SOURCE_FORECAST_VALUES_DISAGREE';
        result.growth_pct = null;
        result.metric = null;
        result.period_start = null;
        result.period_end = null;
        return result;
      }
    }
    result.state = 'PASS';
  } catch (error) {
    result.failure = controller.signal.aborted ? 'KEYWORD_DEADLINE_EXCEEDED' : (error.message || 'UNKNOWN_ERROR');
  } finally {
    clearTimeout(deadline);
    controller.abort();
    result.total_ms = Math.round(now() - began);
    if (result.total_ms > maxMs) {
      result.state = 'FAILED';
      result.failure = 'KEYWORD_DEADLINE_EXCEEDED';
      result.growth_pct = null;
    }
  }
  return result;
}

export function outputText(all, { reportName = 'STAGE04_KEYWORD_GROWTH_R25_READONLY',
  sourceName = 'BING_RSS_INDEX_TO_THE_BUSINESS_RESEARCH_COMPANY' } = {}) {
  return [`REPORT=${reportName}`,
    'MODE=LIVE_KEYWORD_SEARCH_RESEARCH_ONLY',
    `EXTERNAL_SOURCE=${sourceName}`,
    'SCORE_OR_TRADE=NONE', 'MAX_MS_PER_KEYWORD=20000',
    ...all.flatMap((item, index) => ['', `KEYWORD_${index + 1}=${item.keyword}`,
      ...Object.entries(item).filter(([key]) => key !== 'keyword')
        .map(([key, value]) => `${key.toUpperCase()}=${value ?? 'NULL'}`),
      `SEARCH_S=${item.search_ms === null ? 'NULL' : (item.search_ms / 1000).toFixed(3)}`,
      `REPORT_S=${(item.report_ms / 1000).toFixed(3)}`,
      `OLLAMA_S=${item.ollama_ms === null ? 'NULL' : (item.ollama_ms / 1000).toFixed(3)}`,
      `TOTAL_S=${(item.total_ms / 1000).toFixed(3)}`]), ''].join('\r\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const model = process.argv[2] || 'gemma3:4b';
  const reportPath = join(dirname(fileURLToPath(import.meta.url)), 'R25_KEYWORD_SEARCH_TIMINGS.txt');
  const all = [];
  for (const keyword of KEYWORDS) {
    const result = await measureKeyword(keyword, { model });
    all.push(result);
    console.log(`KEYWORD=${keyword} STATE=${result.state} TOTAL_MS=${result.total_ms} FAILURE=${result.failure || 'NULL'}`);
    // Keep completed keyword results if a later source hangs or fails.
    await writeFile(reportPath, outputText(all), 'utf8');
  }
  console.log(`RESULT_FILE=${reportPath}`);
  process.exitCode = all.every((item) => item.state === 'PASS') ? 0 : 1;
}
