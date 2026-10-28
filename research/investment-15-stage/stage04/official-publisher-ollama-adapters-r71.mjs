/**
 * R71: live SkyQuest / Precedence adapters for the R70 forecast pipeline.
 * Reuses existing official-link, HTML, candidate, and local Ollama selectors.
 * No history lookup, report seeds, fixed CAGR numbers or G/D/M scoring.
 */
import { PUBLISHERS, pagePlainText, extractCagrCandidates,
  chooseUsingOllama } from './stage04-four-publisher-r37-readonly.mjs';
import { officialReportUrl, searchLinks, getOfficial, getSearch,
  titleOf } from './stage04-topic01-r45-readonly.mjs';
import { catalogLinks } from './stage04-topic01-r48-repeat.mjs';

const PUBLISHER_CATALOGS = Object.freeze({
  SkyQuest: 'https://www.skyquestt.com/report',
  Precedence: 'https://www.precedenceresearch.com/'
});
const PUBLISHER_TIMEOUT_MS = 20_000;
const MAX_REPORTS = 3;
const OMIT = new Set(['the', 'and', 'for', 'with', 'market', 'report',
  'global', 'worldwide', 'industry', 'industries', 'services', 'research']);

function terms(input) {
  return [...new Set(String(input).toLowerCase().replace(/[^a-z0-9]+/g, ' ')
    .split(' ').filter(v => v.length >= 3 && !OMIT.has(v)))];
}

function rankForTopic(url, keyword) {
  const slug = new URL(url).pathname.split('/').filter(Boolean).at(-1) || '';
  const tokens = terms(keyword);
  return tokens.reduce((sum, t) => sum + (slug.toLowerCase().includes(t) ? 1 : 0), 0);
}

function keywordSlug(keyword, keepAnd = false) {
  const cleaned = String(keyword).toLowerCase().replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/).filter(Boolean).filter(t => keepAnd || t !== 'and');
  return cleaned.join('-');
}

/** A direct market name must not be a longer, narrower submarket name. */
export function exactMarketIdentity(title, keyword) {
  const prefix = String(title).toLowerCase().split(/\b(?:market|industry)\b/)[0];
  if (!prefix || prefix === String(title).toLowerCase()) return false;
  const actual = terms(prefix);
  const requested = terms(keyword);
  return actual.length === requested.length &&
    actual.every((token, index) => token === requested[index]);
}

export function exactMarketSlug(url, keyword) {
  try {
    const slug = new URL(url).pathname.split('/').filter(Boolean).at(-1)?.toLowerCase() || '';
    const core = slug.replace(/(?:-global)?-market(?:-report)?(?:-20\d{2})?$/, '')
      .replace(/-global-market-report$/, '');
    return core === keywordSlug(keyword) || core === keywordSlug(keyword, true);
  } catch { return false; }
}

/** Candidate URL construction is NOT evidence. Each URL still needs a real GET. */
export function livePublisherSlugProbes(publisher, keyword) {
  if (!['SkyQuest', 'Precedence'].includes(publisher?.id)) return [];
  const base = publisher.id === 'SkyQuest' ?
    'https://www.skyquestt.com/report/' : 'https://www.precedenceresearch.com/';
  const slugs = [...new Set([keywordSlug(keyword, true), keywordSlug(keyword)])]
    .filter(Boolean).slice(0, 2);
  return slugs.map(s => `${base}${s}-market`).filter(url => officialReportUrl(url, publisher));
}

function sourcePeriods(excerpt) {
  const normalized = String(excerpt).replace(/&(?:ndash|mdash|minus);/gi, '-')
    .replace(/[\u2010-\u2015\u2212]/g, '-');
  const direct = [...normalized.matchAll(/\b(20\d{2})\s*(?:-|to|through)\s*(20\d{2})\b/gi)];
  // Some official leads state the period as market-size endpoints, e.g.
  // "from USD 31.51 billion in 2026 to USD 50.37 billion by 2034".
  // These years are explicit source text, not a calculated forecast.
  const endpoints = [...normalized.matchAll(/\bfrom\s+(?:USD|US\$|\$)\s*[\d,.]+\s*(?:billion|million|trillion|bn|mn)?\s+in\s+(20\d{2})\s+to\s+(?:approximately\s+)?(?:USD|US\$|\$)\s*[\d,.]+\s*(?:billion|million|trillion|bn|mn)?\s+by\s+(20\d{2})\b/gi)];
  // A baseline size year may precede the explicitly labelled forecast
  // period. Prefer published period ranges; use size endpoints only if the
  // source gives no direct year range. This avoids treating 2025 size vs
  // forecast 2026-2033 as two competing CAGR forecast periods.
  const periods = (direct.length ? direct : endpoints)
    .filter(match => Number(match[2]) > Number(match[1]) &&
      Number(match[2]) - Number(match[1]) <= 20)
    .map(match => [Number(match[1]), Number(match[2])]);
  const unique = [...new Map(periods.map(pair => [pair.join('-'), pair])).values()];
  return unique;
}

function sourcePeriod(excerpt) {
  const periods = sourcePeriods(excerpt);
  return periods.length === 1 ? periods[0] : null;
}

/** Main report lead is separated from regional and product segment sections. */
export function reportLeadEvidence(html) {
  const h1 = /<h1\b[^>]*>[\s\S]*?<\/h1\s*>/i.exec(String(html));
  if (!h1) return '';
  const following = String(html).slice(h1.index + h1[0].length);
  const nextSection = following.search(/<h[2-6]\b/i);
  return pagePlainText(nextSection >= 0 ? following.slice(0, nextSection) :
    following.slice(0, 8_000)).slice(0, 3_500);
}

/**
 * R75: the first h2 is often "List of Contents", before the publisher's
 * actual whole-market forecast. Select the first matching market-size section
 * instead of treating a no-CAGR lead as permission to mix the entire article
 * (including U.S. and fastest-growing submarket CAGRs).
 */
export function primaryWholeMarketEvidence(html, keyword) {
  const input = String(html);
  const headings = [...input.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2\s*>/gi)];
  const requested = terms(keyword);
  for (let i = 0; i < headings.length; i++) {
    const heading = pagePlainText(headings[i][1]);
    const label = heading.toLowerCase();
    if (!/\bmarket\b/.test(label) || !/\b(size|forecast|growth|outlook|insights)\b/.test(label) ||
        !requested.every(token => label.includes(token)) ||
        /\b(?:regional|segment|component|north america|united states|europe|asia pacific|u\.?s\.?)\b/i.test(label)) continue;
    const start = headings[i].index + headings[i][0].length;
    const end = headings[i + 1]?.index ?? input.length;
    const section = `${heading}. ${pagePlainText(input.slice(start, end))}`.slice(0, 3_500);
    if (extractCagrCandidates(section).length) return section;
  }
  return '';
}

function failure(id, keyword, reason, partial = {}) {
  return { publisher: id, keyword, state: 'FAILED', failure: reason,
    result_url: partial.url || null, model: partial.model || null,
    metric: null, growth_pct: null, period_start: null, period_end: null,
    source_audit: 'NOT_VERIFIED', source_conflict_reason: null,
    model_candidate_pct: null, search_requests: partial.search_requests ?? 0,
    report_requests: partial.report_requests ?? 0,
    ollama_generations: partial.ollama_generations ?? 0,
    discovery_diagnostics: partial.discovery_diagnostics || [],
    discovery_candidates: partial.discovery_candidates || [],
    search_ms: partial.search_ms ?? null, report_ms: partial.report_ms ?? null,
    ollama_ms: partial.ollama_ms ?? null, total_ms: partial.total_ms ?? null };
}

async function officialCatalog(url, publisher, fetchFn) {
  const started = performance.now();
  const response = await fetchFn(url, { redirect: 'manual',
    signal: AbortSignal.timeout(8_000), headers: { accept: 'text/html' } });
  if (!response.ok) throw Error(`CATALOG_HTTP_${response.status}`);
  if (response.url && new URL(response.url).hostname !== new URL(url).hostname) {
    throw Error('CATALOG_REDIRECT_OUTSIDE_PUBLISHER');
  }
  if (Number(response.headers?.get?.('content-length') || 0) > 1_000_000) {
    throw Error('CATALOG_TOO_LARGE');
  }
  const html = await response.text();
  if (Buffer.byteLength(html, 'utf8') > 1_000_000) throw Error('CATALOG_TOO_LARGE');
  // Avoid accepting a foreign URL's /report/... suffix as if it were an
  // official relative path. Valid absolute official hrefs come from searchLinks.
  const relativeOnly = html.replace(/https?:\/\/[^\s"'<>\\]+/gi, ' ');
  return { urls: [...new Set([
    ...searchLinks(html, url, publisher),
    ...catalogLinks(relativeOnly, url, publisher)
  ])],
    ms: Math.round(performance.now() - started) };
}

/** First-party catalog first; only then bounded public search discovery. */
export async function discoverPublisherReports(publisher, keyword, {
  fetchFn = fetch, searchFn = getSearch, maxSearchEngines = 3
} = {}) {
  if (!PUBLISHER_CATALOGS[publisher?.id] || !terms(keyword).length) {
    throw Error('INVALID_R71_PUBLISHER_OR_KEYWORD');
  }
  const began = performance.now(), diagnostics = [], discovered = [];
  const catalog = PUBLISHER_CATALOGS[publisher.id];
  let count = 0;
  try {
    count++;
    const result = await officialCatalog(catalog, publisher, fetchFn);
    discovered.push(...result.urls);
    diagnostics.push({ method: 'OFFICIAL_CATALOG', state: 'PASS', found: result.urls.length });
  } catch (error) {
    diagnostics.push({ method: 'OFFICIAL_CATALOG', state: String(error?.message).slice(0,100), found: 0 });
  }
  // A catalog submarket is not proof of a direct-market report. Continue
  // searching instead of hiding search engines behind a weak token match.
  const discoveredRelevant = discovered.some(url =>
    officialReportUrl(url, publisher) && exactMarketSlug(url, keyword));
  const query = `site:${publisher.host} ${keyword} market report CAGR`;
  for (const [engine, url] of (discoveredRelevant ? [] : [
    ['BING_RSS', `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`],
    ['GOOGLE', `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`],
    ['BING', `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=20`]
  ]).slice(0, maxSearchEngines)) {
    try {
      count++;
      const html = await searchFn(url, fetchFn);
      const links = searchLinks(html, url, publisher);
      discovered.push(...links);
      diagnostics.push({ method: engine, state: 'PASS', found: links.length });
      if (links.some(url => exactMarketSlug(url, keyword))) break;
    } catch (error) {
      diagnostics.push({ method: engine, state: String(error?.message).slice(0,100), found: 0 });
    }
  }
  const catalogAndSearch = [...new Set(discovered)].filter(url =>
    officialReportUrl(url, publisher) && rankForTopic(url, keyword) > 0)
    .sort((a, b) => Number(exactMarketSlug(b, keyword)) - Number(exactMarketSlug(a, keyword)) ||
      rankForTopic(b, keyword) - rankForTopic(a, keyword) || a.localeCompare(b));
  const probes = livePublisherSlugProbes(publisher, keyword);
  const candidates = [...new Set([
    ...catalogAndSearch.filter(url => exactMarketSlug(url, keyword)),
    ...probes,
    ...catalogAndSearch.filter(url => !exactMarketSlug(url, keyword))
  ])];
  diagnostics.push({ method: 'UNVERIFIED_SLUG_PROBES', state: 'CANDIDATES_ONLY',
    found: probes.length });
  return { candidates, diagnostics, proposed_urls: probes,
    search_requests: count,
    search_ms: Math.round(performance.now() - began) };
}

async function inspectOnePublisherReport(publisher, url, keyword, {
  fetchFn, chooseFn, model, searchMeta, reportCount
}) {
  const began = performance.now();
  let html;
  try { html = await getOfficial(url, publisher, fetchFn); }
  catch (error) {
    return failure(publisher.id, keyword, String(error?.message || 'OFFICIAL_GET_FAILED'), {
      url, model, ...searchMeta, report_requests: reportCount,
      report_ms: Math.round(performance.now() - began) });
  }
  const reportMs = Math.round(performance.now() - began);
  const title = titleOf(html);
  const evidence = pagePlainText(html);
  if (!title || rankForTopic(url, keyword) <= 0) {
    return failure(publisher.id, keyword, 'REPORT_MARKET_IDENTITY_UNVERIFIED', {
      url, model, ...searchMeta, report_requests: reportCount, report_ms: reportMs });
  }
  if (!exactMarketIdentity(title, keyword)) {
    return failure(publisher.id, keyword, 'SUBMARKET_OR_PROXY_REPORT_EXCLUDED', {
      url, model, ...searchMeta, report_requests: reportCount, report_ms: reportMs });
  }
  // Prefer the publisher's explicit whole-market size/forecast section. On
  // some official pages an early "List of Contents" h2 makes the lead contain
  // no CAGR; the old full-page fallback then falsely mixed global and U.S.
  // rates. Only if no market-size section exists do we use the lead/full page.
  const primary = primaryWholeMarketEvidence(html, keyword);
  const lead = reportLeadEvidence(html);
  const primaryCandidates = extractCagrCandidates(primary);
  const leadCandidates = extractCagrCandidates(lead);
  const candidates = primaryCandidates.length ? primaryCandidates :
    leadCandidates.length ? leadCandidates : extractCagrCandidates(evidence);
  const evidence_region = primaryCandidates.length ? 'PRIMARY_WHOLE_MARKET_SECTION' :
    leadCandidates.length ? 'REPORT_LEAD' : 'FULL_PAGE_FALLBACK';
  if (!candidates.length) {
    return failure(publisher.id, keyword, 'SOURCE_NO_LITERAL_CAGR', {
      url, model, ...searchMeta, report_requests: reportCount, report_ms: reportMs });
  }
  const topic = { kind: '연구 주제', name: keyword };
  let selected;
  const modelStart = performance.now();
  try {
    selected = await chooseFn({ topic, title, candidates, model, fetchFn });
  } catch (error) {
    return failure(publisher.id, keyword, String(error?.message || 'OLLAMA_FAILED'), {
      url, model, ...searchMeta, report_requests: reportCount,
      report_ms: reportMs, ollama_ms: Math.round(performance.now()-modelStart),
      ollama_generations: 1 });
  }
  const modelMs = Math.round(performance.now() - modelStart);
  if (!Number.isInteger(selected?.index) || selected.index < 0 ||
      selected.index >= candidates.length ||
      !['DIRECT','PROXY'].includes(selected.scope)) {
    return failure(publisher.id, keyword, 'OLLAMA_CANDIDATE_OR_SCOPE_UNVERIFIED', {
      url, model, ...searchMeta, report_requests: reportCount,
      report_ms: reportMs, ollama_ms: modelMs, ollama_generations: 1 });
  }
  const chosen = candidates[selected.index];
  // Cross-check two independently visible whole-market declarations. A
  // contradictory period or rate on the same publisher page remains NULL.
  if (primaryCandidates.length && leadCandidates.length) {
    const periods = [...new Set([...sourcePeriods(primary), ...sourcePeriods(lead)]
      .map(pair => pair.join('-')))];
    const inconsistentRate = leadCandidates.some(c =>
      primaryCandidates.every(p => Math.abs(p.pct - c.pct) > 0.15));
    if (periods.length > 1 || inconsistentRate) {
      return { ...failure(publisher.id, keyword, periods.length > 1 ?
        'SOURCE_FORECAST_PERIODS_DISAGREE' : 'SOURCE_FORECAST_VALUES_DISAGREE', {
        url, model, ...searchMeta, report_requests: reportCount,
        report_ms: reportMs, ollama_ms: modelMs, ollama_generations: 1 }),
        state: 'SOURCE_CONFLICT', source_audit: 'SOURCE_CONFLICT',
        source_conflict_reason: periods.length > 1 ?
          'WHOLE_MARKET_LEAD_AND_SECTION_PERIOD_MISMATCH' :
          'WHOLE_MARKET_LEAD_AND_SECTION_RATE_MISMATCH',
        model_candidate_pct: chosen.pct, evidence_region };
    }
  }
  if (sourcePeriods(chosen.excerpt).length > 1) {
    return { ...failure(publisher.id, keyword, 'SOURCE_FORECAST_PERIODS_DISAGREE', {
      url, model, ...searchMeta, report_requests: reportCount,
      report_ms: reportMs, ollama_ms: modelMs, ollama_generations: 1 }),
      state: 'SOURCE_CONFLICT', source_audit: 'SOURCE_CONFLICT',
      source_conflict_reason: 'MULTIPLE_EXPLICIT_FORECAST_PERIODS_IN_SAME_CAGR_EXCERPT',
      model_candidate_pct: chosen.pct, evidence_region };
  }
  const period = sourcePeriod(chosen.excerpt);
  if (!period || !/\b(?:forecast|projected|expected|estimated|by 20\d{2})\b/i.test(chosen.excerpt)) {
    return failure(publisher.id, keyword, 'FORECAST_PERIOD_NOT_EXPLICIT_IN_CAGR_EXCERPT', {
      url, model, ...searchMeta, report_requests: reportCount,
      report_ms: reportMs, ollama_ms: modelMs, ollama_generations: 1 });
  }
  const samePeriod = candidates.filter(c => {
    const candidateYears = sourcePeriod(c.excerpt);
    return candidateYears?.[0] === period[0] && candidateYears?.[1] === period[1];
  });
  const contradictory = samePeriod.some(c => Math.abs(c.pct - chosen.pct) > 0.15);
  if (contradictory) {
    return { ...failure(publisher.id, keyword, 'SOURCE_FORECAST_VALUES_DISAGREE', {
      url, model, ...searchMeta, report_requests: reportCount,
      report_ms: reportMs, ollama_ms: modelMs, ollama_generations: 1 }),
      state: 'SOURCE_CONFLICT', source_audit: 'SOURCE_CONFLICT',
      source_conflict_reason: 'MULTIPLE_CAGR_VALUES_SAME_EXPLICIT_PERIOD',
      model_candidate_pct: chosen.pct, evidence_region };
  }
  const scope = selected.scope === 'DIRECT' ? 'DIRECT' : 'PROXY';
  return { publisher: publisher.id, keyword, state: 'PASS', failure: null,
    result_url: url, model, metric: 'FORECAST_CAGR', growth_pct: chosen.pct,
    period_start: period[0], period_end: period[1],
    forecast_base_year: period[0], forecast_end_year: period[1],
    forecast_narrative_pct: chosen.pct, source_audit: 'EXCERPT_PERIOD_VERIFIED',
    source_conflict_reason: null, model_candidate_pct: chosen.pct,
    model_scope: selected.scope, market_scope: scope, report_market_title: title.slice(0,140),
    evidence_region,
    period_source: 'OFFICIAL_REPORT_CAGR_EXCERPT',
    discovery_diagnostics: searchMeta.discovery_diagnostics || [],
    discovery_candidates: searchMeta.discovery_candidates || [],
    ...searchMeta, report_requests: reportCount, ollama_generations: 1,
    report_ms: reportMs, ollama_ms: modelMs,
    total_ms: searchMeta.search_ms + reportMs + modelMs };
}

/** Connect one real official publisher; never provide fake second-media data. */
export function firstPartyOllamaAdapter(publisherId, {
  fetchFn = fetch, searchFn = getSearch, model = 'gemma3:4b',
  chooseFn = chooseUsingOllama, discoverFn = discoverPublisherReports
} = {}) {
  if (!['SkyQuest', 'Precedence'].includes(publisherId)) throw Error('R71_UNSUPPORTED_PUBLISHER');
  const publisher = PUBLISHERS.find(p => p.id === publisherId);
  return { id: publisherId, officialHosts: [publisher.host, publisher.host.replace(/^www\./, '')],
    run: async topic => {
      const began = performance.now();
      // The same abort budget covers publisher catalog, search, report and
      // local Ollama selection, including the time spent across retries.
      const budget = AbortSignal.timeout(PUBLISHER_TIMEOUT_MS);
      const boundedFetch = (url, options = {}) => fetchFn(url, {
        ...options,
        signal: options.signal ? AbortSignal.any([budget, options.signal]) : budget
      });
      let discovery;
      try { discovery = await discoverFn(publisher, topic.keyword, { fetchFn: boundedFetch, searchFn }); }
      catch (error) { return failure(publisherId, topic.keyword, String(error?.message), { model }); }
      const searchMeta = { search_requests: discovery.search_requests,
        search_ms: discovery.search_ms,
        discovery_diagnostics: discovery.diagnostics,
        discovery_candidates: discovery.candidates.slice(0, 8) };
      if (!discovery.candidates.length) {
        return failure(publisherId, topic.keyword, 'NO_VERIFIED_OFFICIAL_REPORT_DISCOVERED', {
          model, ...searchMeta, total_ms: Math.round(performance.now() - began) });
      }
      const attempts = [];
      let reportCount = 0;
      for (const url of discovery.candidates.slice(0, MAX_REPORTS)) {
        if (budget.aborted) break;
        reportCount++;
        const result = await inspectOnePublisherReport(publisher, url, topic.keyword, {
          fetchFn: boundedFetch, chooseFn, model, searchMeta, reportCount
        });
        attempts.push(result);
        if (result.state === 'PASS') return { ...result,
          total_ms: Math.round(performance.now() - began) };
        if (result.state === 'SOURCE_CONFLICT') return { ...result,
          total_ms: Math.round(performance.now() - began) };
      }
      const last = attempts.at(-1);
      if (!last) return failure(publisherId, topic.keyword, 'PUBLISHER_TIME_BUDGET_EXCEEDED', {
        model, ...searchMeta, report_requests: reportCount,
        total_ms: Math.round(performance.now() - began) });
      return { ...last, report_requests: reportCount,
        total_ms: Math.round(performance.now() - began) };
    } };
}
