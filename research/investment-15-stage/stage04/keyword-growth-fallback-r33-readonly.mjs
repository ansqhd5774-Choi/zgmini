/**
 * R33 research-only fallback: ONE Bing RSS lookup, at most ONE publisher page,
 * at most ONE Ollama extraction. No retries and no same-publisher second search.
 * Provider order and maximum attempts are owned by the R33 orchestrator.
 */
import { FORECAST_RATE_ONLY_OUTPUT_SCHEMA, isDirectMarketTitle,
  validateModelForecastRateOnly } from './keyword-growth-speed-r25-readonly.mjs';

export const FALLBACK_SOURCES = Object.freeze([
  Object.freeze({ id: 'GVR', publisher: 'Grand View Research',
    host: 'www.grandviewresearch.com', path: '/industry-analysis/' }),
  Object.freeze({ id: 'MORDOR', publisher: 'Mordor Intelligence',
    host: 'www.mordorintelligence.com', path: '/industry-reports/' }),
  Object.freeze({ id: 'FORTUNE', publisher: 'Fortune Business Insights',
    host: 'www.fortunebusinessinsights.com', path: '/' })
]);
export const FALLBACK_MAX_MS = 5000;

function decode(s) {
  return String(s).replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

export function plainText(html) {
  return decode(String(html)
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|nav|footer)\b[^>]*>[^]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function allowedSourceUrl(raw, source) {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' ||
        ![source.host, source.host.replace(/^www\./, '')].includes(parsed.hostname) ||
        parsed.username || parsed.password) return false;
    if (source.id === 'FORTUNE') {
      return /^\/(?:industry-reports\/)?[a-z0-9-]+\/?$/i.test(parsed.pathname) &&
        !/^\/(?:press-release|blog|news)\b/i.test(parsed.pathname);
    }
    return parsed.pathname.startsWith(source.path);
  } catch { return false; }
}

function tagValue(s, tag) {
  const item = s.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return item ? plainText(item[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '')) : '';
}

export function findDirectPublisherResult(xml, keyword, source) {
  const items = [...String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  for (const [, item] of items.slice(0, 20)) {
    const title = tagValue(item, 'title');
    const url = tagValue(item, 'link');
    if (allowedSourceUrl(url, source) && isDirectMarketTitle(title, keyword)) {
      return { title, url };
    }
  }
  return null;
}

function pageTitle(html) {
  const h1 = String(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return plainText(h1[1]);
  const title = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return title ? plainText(title[1]).split(' | ')[0] : '';
}

/**
 * The forecast period must be printed with the CAGR. Ignore segment forecasts,
 * historic one-year changes, and single-year projections. Never infer years.
 */
export function extractDirectForecast(html, keyword) {
  const heading = pageTitle(html);
  if (!isDirectMarketTitle(heading, keyword)) return null;
  const text = plainText(html);
  const rates = [...text.matchAll(/\b(?:CAGR|compound annual growth rate)\s+(?:of\s+)?(\d{1,2}(?:\.\d+)?)\s*%/gi)];
  for (const match of rates.slice(0, 30)) {
    const start = Math.max(0, match.index - 340);
    const end = Math.min(text.length, match.index + match[0].length + 160);
    const context = text.slice(start, end);
    if (!/\b(forecast|project(?:ed|ion)?|expect(?:ed)?|estimate(?:d)?|reach|grow(?:th)?|exhibit(?:ing)?)\b/i.test(context)) continue;
    if (/\b(segment|subsegment)\b.{0,100}\bfastest\b/i.test(context)) continue;
    const periods = [...context.matchAll(/\b(20\d{2})\s*(?:-|–|—|to)\s*(20\d{2})\b/gi)]
      .filter(m => Number(m[2]) - Number(m[1]) >= 2 && Number(m[2]) - Number(m[1]) <= 15);
    if (!periods.length) continue;
    const relativeRatePosition = match.index - start;
    periods.sort((a, b) => Math.abs(a.index - relativeRatePosition) - Math.abs(b.index - relativeRatePosition));
    const period = periods[0];
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value > 100) continue;
    return { growth_pct: value, metric: 'FORECAST_CAGR',
      period_start: Number(period[1]), period_end: Number(period[2]),
      excerpt: context, source_audit: 'FORECAST_TEXT_PERIOD_AND_MODEL_CHECK',
      report_title: heading };
  }
  return null;
}

async function readLimited(response, maxBytes, completed = () => false) {
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  if (!response.body?.getReader) throw new Error('RESPONSE_BODY_UNAVAILABLE');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  let bytes = 0;
  let lastCheckBytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return raw + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new Error('RESPONSE_TOO_LARGE');
      raw += decoder.decode(value, { stream: true });
      // Full HTML extraction is more expensive than streaming; check at most
      // once per 64 KiB instead of parsing the growing document every chunk.
      if (bytes - lastCheckBytes >= 65536 || raw.slice(-16384).includes('</html>')) {
        lastCheckBytes = bytes;
        if (completed(raw)) return raw;
      }
    }
  } finally { void reader.cancel().catch(() => {}); }
}

export async function measureFallback(keyword, source, {
  fetchFn = fetch, model = 'gemma3:4b', maxMs = FALLBACK_MAX_MS,
  now = () => performance.now()
} = {}) {
  const trustedSource = FALLBACK_SOURCES.find(x => x.id === source?.id);
  if (!trustedSource ||
      !Number.isInteger(maxMs) || maxMs < 1 || maxMs > 20000 ||
      typeof keyword !== 'string' || !keyword.trim()) throw new Error('INVALID_FALLBACK_OPTIONS');
  source = trustedSource;
  const began = now();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), maxMs);
  const result = { keyword, state: 'FAILED', publisher: source.publisher,
    search_engine: 'Bing RSS restricted to official publisher',
    search_query: `site:${source.host}${source.id === 'FORTUNE' ? '' : source.path} "${keyword.replace(/\bcyber security\b/gi, 'cybersecurity')}" market CAGR`,
    result_url: null, model, keyword_deadline_ms: maxMs,
    search_requests: 0, report_requests: 0, ollama_generations: 0,
    search_ms: null, report_ms: 0, ollama_ms: null, total_ms: null,
    growth_pct: null, metric: null, period_start: null, period_end: null,
    source_audit: 'NOT_RUN', failure: null, report_title: null,
    search_http_status: null, model_candidate_pct: null };
  try {
    const queryUrl = 'https://www.bing.com/search?format=rss&q=' +
      encodeURIComponent(result.search_query);
    const searchBegan = now();
    result.search_requests = 1;
    let xml;
    try {
      const response = await fetchFn(queryUrl, { signal: abort.signal,
        headers: { accept: 'application/rss+xml,application/xml,text/xml' } });
      result.search_http_status = response.status;
      if (new URL(response.url || queryUrl).origin !== 'https://www.bing.com')
        throw new Error('SEARCH_REDIRECT_BLOCKED');
      xml = await readLimited(response, 350_000, s => (s.match(/<\/item>/gi) || []).length >= 20);
    } finally { result.search_ms = Math.round(now() - searchBegan); }
    if (!/<rss\b|<rdf:RDF\b/i.test(xml)) throw new Error('SEARCH_NOT_RSS');
    const selected = findDirectPublisherResult(xml, keyword, source);
    if (!selected) throw new Error('SEARCH_NO_DIRECT_MARKET_REPORT');
    result.result_url = selected.url;

    const reportBegan = now();
    result.report_requests = 1;
    let html;
    try {
      const response = await fetchFn(selected.url, {
        signal: abort.signal, headers: { accept: 'text/html' }
      });
      if (!allowedSourceUrl(response.url || selected.url, source))
        throw new Error('PUBLISHER_REDIRECT_BLOCKED');
      html = await readLimited(response, 1_500_000,
        s => Boolean(extractDirectForecast(s, keyword)));
    } finally { result.report_ms = Math.round(now() - reportBegan); }
    const forecast = extractDirectForecast(html, keyword);
    if (!forecast) throw new Error('SOURCE_NO_DIRECT_FORECAST_WITH_PERIOD');
    result.source_audit = forecast.source_audit;
    result.report_title = forecast.report_title;
    if (now() - began >= maxMs) throw new Error('SOURCE_DEADLINE_EXCEEDED');

    const ollamaBegan = now();
    result.ollama_generations = 1;
    let completion;
    try {
      const response = await fetchFn('http://127.0.0.1:11434/api/generate', {
        method: 'POST', signal: abort.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, stream: false, think: false,
          format: FORECAST_RATE_ONLY_OUTPUT_SCHEMA,
          options: { temperature: 0, num_predict: 70 },
          prompt: 'Read ONLY the following quoted market-research forecast excerpt. ' +
            'Extract the global/main-market FORECAST CAGR percentage printed in this excerpt. ' +
            'Return ONLY growth_pct (number) and metric (literal FORECAST_CAGR). ' +
            'Never extract a regional, segment or historical growth rate. ' +
            'JSON schema: ' + JSON.stringify(FORECAST_RATE_ONLY_OUTPUT_SCHEMA) +
            '\nEXCERPT:\n' + forecast.excerpt })
      });
      if (!response.ok) throw new Error(`OLLAMA_HTTP_${response.status}`);
      completion = await response.json();
    } finally { result.ollama_ms = Math.round(now() - ollamaBegan); }
    const parsed = validateModelForecastRateOnly(completion.response, forecast.excerpt);
    result.model_candidate_pct = parsed.growth_pct;
    if (Math.abs(parsed.growth_pct - forecast.growth_pct) > 0.05)
      throw new Error('OLLAMA_NOT_MATCHING_SOURCE_FORECAST');
    result.growth_pct = parsed.growth_pct;
    result.metric = parsed.metric;
    result.period_start = forecast.period_start;
    result.period_end = forecast.period_end;
    result.state = 'PASS';
  } catch (error) {
    result.failure = abort.signal.aborted ? 'SOURCE_DEADLINE_EXCEEDED' :
      String(error?.message || 'UNKNOWN_ERROR');
  } finally {
    clearTimeout(timer);
    abort.abort();
    result.total_ms = Math.round(now() - began);
    if (result.total_ms > maxMs) {
      result.state = 'FAILED';
      result.failure = 'SOURCE_DEADLINE_EXCEEDED';
      result.growth_pct = null;
      result.metric = null;
      result.period_start = null;
      result.period_end = null;
    }
  }
  return result;
}
