/**
 * R25 read-only, manual benchmark: keyword-specific indexed lookup of ONE
 * specialized growth publisher, ONE short excerpt, ONE local Ollama call.
 * No live investment scores and no retry or source switching.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractMarketExcerpt, validateModelReply } from './market-growth-ollama-r23-readonly.mjs';

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
} = {}) {
  if (maxMs <= 0 || maxMs > MAX_KEYWORD_MS) throw new Error('INVALID_TIMEOUT');
  if (!KEYWORDS.includes(keyword)) throw new Error('INVALID_TEST_KEYWORD');
  const began = now();
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), maxMs);
  const query = searchQuery || `site:thebusinessresearchcompany.com/report/ "${keyword}" market CAGR 2026 2030`;
  if (typeof query !== 'string' || query.length > 220) throw new Error('INVALID_QUERY');
  const searchUrl = `${SEARCH_HOST}/search?format=rss&q=${encodeURIComponent(query)}`;
  const result = { keyword, state: 'FAILED', publisher: PUBLISHER,
    search_engine: searchQuery ? 'Bing RSS publisher-named search' : 'Bing RSS site-filtered search',
    search_query: query,
    result_url: null, model, keyword_deadline_ms: maxMs,
    search_requests: 0, report_requests: 0, ollama_generations: 0,
    search_ms: null, report_ms: 0, ollama_ms: null,
    total_ms: null, ollama_reported_ms: null, growth_pct: null,
    metric: null, period_start: null, period_end: null, failure: null,
    search_http_status: null, rss_items: null, publisher_index_links: null,
    title_matched_links: null, indexed_sample: null };
  try {
    const searchBegan = now();
    result.search_requests = 1;
    let feed;
    try {
      const searchResponse = await fetchFn(searchUrl, {
        signal: controller.signal, headers: { accept: 'application/rss+xml,application/xml,text/xml' }
      });
      result.search_http_status = searchResponse.status;
      if (new URL(searchResponse.url || searchUrl).origin !== SEARCH_HOST) throw new Error('SEARCH_REDIRECT_BLOCKED');
      feed = await limitedRead(searchResponse, 350_000,
        (raw) => (raw.match(/<\/item>/gi) || []).length >= 20);
    } catch (error) { throw new Error(`SEARCH_${error.message}`); }
    finally { result.search_ms = Math.round(now() - searchBegan); }
    if (!/<rss\b|<rdf:RDF\b/i.test(feed)) throw new Error('SEARCH_NOT_RSS');
    Object.assign(result, searchDiagnostics(feed, keyword));
    const selected = parseOneSpecialistResult(feed, keyword);
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
        html = await limitedRead(reportResponse, 1_500_000,
          (raw) => Boolean(chooseShortExcerpt(raw, keyword)));
      } catch (error) { throw new Error(`PUBLISHER_${error.message}`); }
      finally { result.report_ms = Math.round(now() - reportBegan); }
      excerpt = chooseShortExcerpt(html, keyword);
    }
    if (!excerpt) throw new Error('PUBLISHER_NO_CAGR_EXCERPT');
    ensureInBudget(began, now, maxMs);

    const modelBegan = now();
    result.ollama_generations = 1;
    let completion;
    try {
      const modelResponse = await fetchFn('http://127.0.0.1:11434/api/generate', {
        method: 'POST', signal: controller.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, stream: false, think: false, format: 'json',
          options: { temperature: 0, num_predict: 90 },
          prompt: 'Extract ONLY the explicitly stated future CAGR from this one brief market research excerpt. ' +
            'Respond as JSON fields growth_pct (number), metric (exact FORECAST_CAGR), ' +
            'period_start (year), period_end (year). Do not invent values and do not use historic YoY.\n' + excerpt })
      });
      if (!modelResponse.ok) throw new Error(`OLLAMA_HTTP_${modelResponse.status}`);
      completion = await modelResponse.json();
    } finally { result.ollama_ms = Math.round(now() - modelBegan); }
    ensureInBudget(began, now, maxMs);
    Object.assign(result, validateModelReply(completion.response, excerpt));
    result.ollama_reported_ms = Number.isFinite(completion.total_duration)
      ? Math.round(completion.total_duration / 1e6) : null;
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

export function outputText(all, { reportName = 'STAGE04_KEYWORD_GROWTH_R25_READONLY' } = {}) {
  return [`REPORT=${reportName}`,
    'MODE=LIVE_KEYWORD_SEARCH_RESEARCH_ONLY',
    'EXTERNAL_SOURCE=BING_RSS_INDEX_TO_THE_BUSINESS_RESEARCH_COMPANY',
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
