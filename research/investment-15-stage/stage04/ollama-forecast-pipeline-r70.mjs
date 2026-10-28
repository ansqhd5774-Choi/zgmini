/**
 * R70: reusable, read-only Stage04 forecast pipeline.
 * Each publisher adapter fetches live source evidence and asks local Ollama;
 * this layer independently checks publisher identity, R30/R71 audit provenance,
 * duplicate publishers, and the >=2 independent publisher mean gate.
 * It never assigns investment attractiveness, G/D/M, or trade scores.
 */

export const ACTIVE_PUBLISHERS = Object.freeze(['TBRC', 'SkyQuest', 'Precedence']);
export const MIN_INDEPENDENT_PUBLISHERS = 2;

function validText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function officialUrl(url, allowedHosts) {
  if (!validText(url) || !Array.isArray(allowedHosts) || !allowedHosts.length) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && allowedHosts.includes(parsed.hostname.toLowerCase());
  } catch { return false; }
}

function normalizedCandidate(raw, adapter, observedAt) {
  const result = {
    publisher: adapter.id,
    state: 'REJECTED',
    reason: null,
    report_url: typeof raw?.result_url === 'string' ? raw.result_url : null,
    observed_at: observedAt,
    model: validText(raw?.model) ? raw.model : null,
    metric: 'FORECAST_CAGR',
    growth_pct: null,
    period_start: null,
    period_end: null,
    source_audit: validText(raw?.source_audit) ? raw.source_audit : 'NOT_RUN',
    market_scope: validText(raw?.market_scope) ? raw.market_scope : null,
    research_market_keyword: validText(raw?.research_market_keyword)
      ? raw.research_market_keyword : null,
    research_market_provenance: validText(raw?.research_market_provenance)
      ? raw.research_market_provenance : null,
    publisher_attempts: Array.isArray(raw?.publisher_attempts)
      ? raw.publisher_attempts.slice(0, 3) : [],
    discovery_diagnostics: Array.isArray(raw?.discovery_diagnostics)
      ? raw.discovery_diagnostics.slice(0, 6) : [],
    discovery_candidates: Array.isArray(raw?.discovery_candidates)
      ? raw.discovery_candidates.slice(0, 8) : [],
    source_conflict_reason: validText(raw?.source_conflict_reason) ? raw.source_conflict_reason : null,
    evidence_region: validText(raw?.evidence_region) ? raw.evidence_region : null,
    model_candidate_pct: Number.isFinite(raw?.model_candidate_pct) ? raw.model_candidate_pct : null,
    search_requests: Number.isInteger(raw?.search_requests) ? raw.search_requests : null,
    report_requests: Number.isInteger(raw?.report_requests) ? raw.report_requests : null,
    ollama_generations: Number.isInteger(raw?.ollama_generations) ? raw.ollama_generations : null,
    search_ms: Number.isFinite(raw?.search_ms) ? raw.search_ms : null,
    report_ms: Number.isFinite(raw?.report_ms) ? raw.report_ms : null,
    ollama_ms: Number.isFinite(raw?.ollama_ms) ? raw.ollama_ms : null,
    total_ms: Number.isFinite(raw?.total_ms) ? raw.total_ms : null
  };
  if (raw?.state === 'SOURCE_CONFLICT' || raw?.source_audit === 'SOURCE_CONFLICT') {
    result.state = 'SOURCE_CONFLICT';
    result.reason = raw?.failure || raw?.source_conflict_reason || 'SOURCE_FORECAST_VALUES_DISAGREE';
    return result;
  }
  if (raw?.state !== 'PASS') {
    result.state = 'SOURCE_OR_MODEL_FAILED';
    result.reason = validText(raw?.failure) ? raw.failure : 'SOURCE_DID_NOT_PASS';
    return result;
  }
  if (!officialUrl(raw?.result_url, adapter.officialHosts)) {
    result.reason = 'UNVERIFIED_PUBLISHER_URL';
    return result;
  }
  if (!['CONSISTENT', 'EXCERPT_PERIOD_VERIFIED'].includes(raw.source_audit)) {
    result.reason = 'SOURCE_AUDIT_NOT_CONSISTENT';
    return result;
  }
  // R67 explicitly permits historical, publisher-specific report markets
  // for RESEARCH averages only. This is never a GICS-sector CAGR claim.
  const verifiedReference = raw.market_scope === 'R63_REFERENCE' &&
    raw.verified_scope === 'DIRECT' &&
    raw.research_market_provenance === 'R63_OFFICIAL_REPORT_URL' &&
    validText(raw.research_market_keyword);
  if (raw.market_scope === 'R63_REFERENCE' && !verifiedReference) {
    result.reason = 'R63_REFERENCE_PROVENANCE_NOT_VERIFIED';
    return result;
  }
  if (raw.source_audit === 'EXCERPT_PERIOD_VERIFIED' &&
      raw.market_scope !== 'DIRECT' && !verifiedReference) {
    result.reason = 'PROXY_MARKET_SCOPE_EXCLUDED';
    return result;
  }
  if (raw.metric !== 'FORECAST_CAGR' || !Number.isFinite(raw.growth_pct) ||
      raw.growth_pct < 0 || raw.growth_pct > 100) {
    result.reason = 'INVALID_VERIFIED_CAGR';
    return result;
  }
  if (!Number.isInteger(raw.period_start) || !Number.isInteger(raw.period_end) ||
      raw.period_start < 2000 || raw.period_end > 2100 || raw.period_end <= raw.period_start ||
      raw.period_start !== raw.forecast_base_year ||
      raw.period_end !== raw.forecast_end_year) {
    result.reason = 'FORECAST_PERIOD_NOT_SOURCE_VERIFIED';
    return result;
  }
  if (!Number.isFinite(raw.forecast_narrative_pct) ||
      Math.abs(raw.forecast_narrative_pct - raw.growth_pct) > 0.05) {
    result.reason = 'SOURCE_CAGR_NOT_VERIFIED';
    return result;
  }
  result.state = 'PASS';
  result.growth_pct = raw.growth_pct;
  result.period_start = raw.period_start;
  result.period_end = raw.period_end;
  return result;
}

/**
 * The caller supplies real source adapters. No missing publisher is simulated.
 * adapter.run(topic) must produce a validated R30-compatible result, not a
 * manually curated historical CAGR. One adapter = one independent publisher.
 */
export async function runForecastPipeline(topics, adapters, {
  observedAt = () => new Date().toISOString()
} = {}) {
  if (!Array.isArray(topics) || !topics.length ||
      topics.some(t => !t || !validText(t.id) || !validText(t.keyword))) {
    throw new Error('INVALID_TOPICS');
  }
  if (new Set(topics.map(t => t.id)).size !== topics.length) throw new Error('DUPLICATE_TOPIC_ID');
  if (!Array.isArray(adapters) || !adapters.length ||
      adapters.some(a => !a || !ACTIVE_PUBLISHERS.includes(a.id) ||
        !Array.isArray(a.officialHosts) || !a.officialHosts.length ||
        typeof a.run !== 'function')) throw new Error('INVALID_PUBLISHER_ADAPTERS');
  if (new Set(adapters.map(a => a.id)).size !== adapters.length) {
    throw new Error('DUPLICATE_PUBLISHER_ADAPTER');
  }

  const results = [];
  for (const topic of topics) {
    const publishers = [];
    for (const adapter of adapters) {
      const time = observedAt();
      try {
        const raw = await adapter.run(topic);
        publishers.push(normalizedCandidate(raw, adapter, time));
      } catch (error) {
        publishers.push({ publisher: adapter.id, state: 'SOURCE_OR_MODEL_FAILED',
          reason: String(error?.message || 'ADAPTER_EXECUTION_FAILED').slice(0, 160),
          observed_at: time, report_url: null, growth_pct: null,
          period_start: null, period_end: null, source_audit: 'NOT_RUN' });
      }
    }
    const accepted = publishers.filter(p => p.state === 'PASS');
    const enough = accepted.length >= MIN_INDEPENDENT_PUBLISHERS;
    const periodKeys = new Set(accepted.map(p => `${p.period_start}-${p.period_end}`));
    results.push({
      topic_id: topic.id,
      keyword: topic.keyword,
      state: enough ? 'RESEARCH_MEAN_CALCULABLE' : 'INSUFFICIENT_INDEPENDENT_PUBLISHERS',
      metric: 'FORECAST_CAGR',
      source_count: accepted.length,
      required_source_count: MIN_INDEPENDENT_PUBLISHERS,
      mean_pct: enough ? Number((accepted.reduce((sum, p) => sum + p.growth_pct, 0) /
        accepted.length).toFixed(6)) : null,
      included_publishers: accepted.map(p => p.publisher),
      warnings: [
        'RESEARCH_FORECAST_ONLY_NOT_GICS_OR_INVESTMENT_SCORE',
        ...(accepted.some(p => p.source_audit === 'EXCERPT_PERIOD_VERIFIED')
          ? ['EXCERPT_ONLY_AUDIT_NO_SIZE_TRIANGULATION'] : []),
        ...(periodKeys.size > 1 ? ['DIFFERENT_FORECAST_PERIODS_REVIEW_SCOPE'] : []),
        ...(accepted.some(p => p.market_scope === 'R63_REFERENCE')
          ? ['R63_REFERENCE_REPORT_MARKET_NOT_GICS_SECTOR_CAGR'] : []),
        ...(new Set(accepted.map(p => p.research_market_keyword || topic.keyword)).size > 1
          ? ['DIFFERENT_RESEARCH_MARKET_DEFINITIONS_REVIEW_SCOPE'] : [])
      ],
      publishers
    });
  }
  return {
    report: 'STAGE04_OLLAMA_FORECAST_PIPELINE_R70',
    mode: 'READONLY_LOCAL_OLLAMA_OFFICIAL_PUBLISHERS',
    model_training_completed: false,
    score_or_trade: 'NONE',
    configured_publishers: adapters.map(a => a.id),
    missing_publisher_adapters: ACTIVE_PUBLISHERS.filter(id => !adapters.some(a => a.id === id)),
    results
  };
}

/** Keep R30 defaults intact; R70 opts into direct-market title filtering. */
export function tbrcR30Adapter(measureKeyword, {
  model = 'gemma3:4b', fetchFn, researchMarketFn = null
} = {}) {
  if (typeof measureKeyword !== 'function') throw new Error('INVALID_R30_MEASURE');
  return {
    id: 'TBRC',
    officialHosts: ['www.thebusinessresearchcompany.com', 'thebusinessresearchcompany.com'],
    run: async topic => {
      const researchKeyword = researchMarketFn?.(topic.keyword, 'TBRC') || topic.keyword;
      const raw = await measureKeyword(researchKeyword, {
        model,
        ...(fetchFn ? { fetchFn } : {}),
        searchMode: 'publisher-site',
        structuredOutput: true,
        auditForecast: true,
        rateOnlyFromSource: true,
        strictMarketScope: true,
        resolveHistoricTableMislabel: false,
        allowedKeywords: [researchKeyword]
      });
      return researchKeyword === topic.keyword ? raw : {
        ...raw, research_market_keyword: researchKeyword,
        research_market_provenance: 'R63_OFFICIAL_REPORT_URL',
        ...(raw?.state === 'PASS' ? {
          market_scope: 'R63_REFERENCE', verified_scope: 'DIRECT'
        } : {})
      };
    }
  };
}
