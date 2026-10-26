/**
 * R34 research-only: preserves R33's four publishers and all one-shot caps,
 * but first uses Grand View Research's official report sitemap once per batch
 * and Mordor's exact report URL once per unresolved topic. Fortune's R33
 * search remains diagnostic-only until a licensed official index is confirmed.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { researchFourSources } from './keyword-growth-all-r33-readonly.mjs';
import { measureFallback } from './keyword-growth-fallback-r33-readonly.mjs';

export const REPORT_NAME = 'STAGE04_ALL_SECTOR_THEME_R34_OFFICIAL_INDEX_ONE_SHOT_READONLY';
export const GVR_REPORT_CATALOG = 'https://www.grandviewresearch.com/reports.xml';

export function directMordorUrl(keyword) {
  const slug = String(keyword).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) throw new Error('MISSING_MARKET_SLUG');
  return `https://www.mordorintelligence.com/industry-reports/${slug}-market`;
}

/** No concurrent duplicate catalog fetch, no retry after an error. */
export function makeOfficialIndexFallback({ fetchFn = fetch,
  now = () => performance.now() } = {}) {
  let catalogPromise = null;
  const diagnostics = { gvr_catalog_requests: 0, gvr_catalog_bytes: 0,
    gvr_catalog_http_status: null, gvr_catalog_ms: null };

  async function catalog() {
    const started = now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    diagnostics.gvr_catalog_requests++;
    try {
      const response = await fetchFn(GVR_REPORT_CATALOG, {
        signal: controller.signal, headers: { accept: 'application/xml,text/xml' }
      });
      diagnostics.gvr_catalog_http_status = response.status;
      if (!response.ok) throw new Error('GVR_CATALOG_HTTP_' + response.status);
      if ((response.url || GVR_REPORT_CATALOG) !== GVR_REPORT_CATALOG)
        throw new Error('GVR_CATALOG_REDIRECT_BLOCKED');
      const buf = await response.arrayBuffer();
      diagnostics.gvr_catalog_bytes = buf.byteLength;
      if (buf.byteLength > 4_000_000) throw new Error('GVR_CATALOG_TOO_LARGE');
      const xml = new TextDecoder().decode(buf);
      if (!/<urlset\b/i.test(xml)) throw new Error('GVR_CATALOG_NOT_URLSET');
      return xml;
    } finally {
      clearTimeout(timer);
      controller.abort();
      diagnostics.gvr_catalog_ms = Math.round(now() - started);
    }
  }

  async function fallback(keyword, source, options = {}) {
    if (source.id === 'MORDOR') return measureFallback(keyword, source, {
      ...options, fetchFn, directUrl: directMordorUrl(keyword)
    });
    if (source.id !== 'GVR') return measureFallback(keyword, source, {
      ...options, fetchFn
    });
    const started = now();
    let firstCaller = false;
    if (!catalogPromise) {
      firstCaller = true;
      catalogPromise = catalog();
    }
    let xml;
    try { xml = await catalogPromise; }
    catch (error) {
      return { keyword, publisher: source.publisher, state: 'FAILED',
        failure: 'OFFICIAL_CATALOG_' + String(error?.message || 'UNKNOWN').replace(/[\r\n=|]/g, '_'),
        search_engine: 'Official GVR reports.xml (once per batch)',
        search_requests: firstCaller ? 1 : 0, report_requests: 0,
        ollama_generations: 0, search_ms: firstCaller ? diagnostics.gvr_catalog_ms : 0,
        report_ms: 0, ollama_ms: null, total_ms: Math.round(now() - started),
        growth_pct: null, period_start: null, period_end: null,
        source_audit: 'NOT_RUN', result_url: null };
    }
    const spent = Math.round(now() - started);
    if (spent >= (options.maxMs || 5000)) {
      return { keyword, publisher: source.publisher, state: 'FAILED',
        failure: 'SOURCE_DEADLINE_EXCEEDED',
        search_engine: 'Official GVR reports.xml (once per batch)',
        search_requests: firstCaller ? 1 : 0, report_requests: 0,
        ollama_generations: 0, search_ms: spent,
        report_ms: 0, ollama_ms: null, total_ms: spent,
        growth_pct: null, period_start: null, period_end: null,
        source_audit: 'NOT_RUN', result_url: null };
    }
    const result = await measureFallback(keyword, source, {
      ...options, fetchFn, catalogText: xml,
      maxMs: (options.maxMs || 5000) - spent
    });
    result.search_requests = firstCaller ? 1 : 0;
    result.search_ms = firstCaller ? diagnostics.gvr_catalog_ms : 0;
    result.total_ms += spent;
    result.search_engine = 'Official GVR reports.xml (once per batch)';
    return result;
  }
  return { fallback, diagnostics };
}

export async function researchR34({ fetchFn = fetch, fallbackResearch = null,
  ...options } = {}) {
  const shared = makeOfficialIndexFallback({ fetchFn });
  const report = await researchFourSources({ ...options, fetchFn,
    fallbackResearch: fallbackResearch || shared.fallback,
    reportName: REPORT_NAME, mode: 'LIVE_READONLY_OFFICIAL_INDEX_ONE_SHOT',
  });
  return { ...report, catalog: shared.diagnostics };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputFile = join(dirname(fileURLToPath(import.meta.url)),
    'R34_ALL_SECTOR_THEME_GROWTH_RESULT.txt');
  const model = process.argv[2] || 'gemma3:4b';
  researchR34({ model, outputFile, onProgress: (row, index, total) => {
    console.log(`${index}/${total} ${row.type}=${row.name} STATE=${row.state} ` +
      `CAGR=${row.growth_pct ?? 'NULL'} SOURCE=${row.publisher || 'NONE'} ` +
      `ATTEMPTS=${row.attempts.length} MS=${row.total_ms} FAILURE=${row.failure || 'NULL'}`);
  } }).then(({ status, counts, catalog }) => {
    console.log(`STATUS=${status} PASS=${counts.passed} PENDING=${counts.missing} ` +
      `ATTEMPTS=${counts.attempts}`);
    console.log(`GVR_CATALOG_REQUESTS=${catalog.gvr_catalog_requests} ` +
      `BYTES=${catalog.gvr_catalog_bytes} MS=${catalog.gvr_catalog_ms ?? 'NULL'}`);
    console.log('MODE=READONLY_NO_DEPLOYMENT_NO_DB_OR_SCORE_WRITES');
    console.log(`RESULT_FILE=${outputFile}`);
    process.exitCode = status === 'RESEARCH_PASS' ? 0 : 2;
  }).catch(error => {
    console.error('R34_RUN_FAILED=' + String(error?.message || error));
    process.exitCode = 1;
  });
}
