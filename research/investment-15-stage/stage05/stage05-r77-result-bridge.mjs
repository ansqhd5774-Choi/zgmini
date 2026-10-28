/**
 * Reuse the already-saved R77 Windows Ollama result in Stage05.
 * No Stage04 calls, web access, score conversion, source re-audit or rerun.
 */
export const R77_BRIDGE_VERSION = 'STAGE05_R77_SAVED_FORECAST_BRIDGE_R83';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const requiredString = value => typeof value === 'string' && value.trim().length > 0;

export function readSavedR77Forecast(report) {
  if (report?.report !== 'STAGE04_OLLAMA_FORECAST_PIPELINE_R72'
    || report.publisher_adapter_revision !== 'R77_OFFICIAL_SITEMAP_DISCOVERY'
    || report.run_state !== 'COMPLETED'
    || report.fatal_error
    || !Number.isInteger(report.topics_total)
    || report.topics_total < 1
    || report.topics_done !== report.topics_total
    || !Array.isArray(report.results)
    || report.results.length !== report.topics_total
    || !Number.isInteger(report.means_calculable))
    throw new Error('STAGE05_R77_SAVED_RUN_NOT_COMPLETE');

  const keywords = new Set();
  const topics = report.results.map(topic => {
    if (!requiredString(topic?.keyword) || keywords.has(topic.keyword)
      || !Number.isInteger(topic.source_count) || topic.source_count < 0
      || (topic.mean_pct !== null && !finite(topic.mean_pct))
      || !Array.isArray(topic.publishers))
      throw new Error('STAGE05_R77_SAVED_TOPIC_INVALID');
    keywords.add(topic.keyword);
    return {
      keyword: topic.keyword,
      state: requiredString(topic.state) ? topic.state : null,
      sourceCount: topic.source_count,
      meanCagrPct: topic.mean_pct,
      warnings: Array.isArray(topic.warnings) ? topic.warnings.map(String) : [],
      publishers: topic.publishers.map(p => ({
        publisher: String(p?.publisher ?? ''),
        state: String(p?.state ?? ''),
        reportUrl: requiredString(p?.report_url) ? p.report_url : null,
        cagrPct: finite(p?.growth_pct) ? p.growth_pct : null,
        sourceAudit: String(p?.source_audit ?? ''),
        reason: p?.reason ? String(p.reason) : null,
      })),
    };
  });
  const calculated = topics.filter(t => t.meanCagrPct !== null).length;
  if (calculated !== report.means_calculable)
    throw new Error('STAGE05_R77_SAVED_MEAN_COUNT_MISMATCH');

  return {
    version: R77_BRIDGE_VERSION,
    status: 'CONNECTED_R77_RESEARCH_ONLY',
    sourceReport: report.report,
    publisherAdapterRevision: report.publisher_adapter_revision,
    sourceRunState: report.run_state,
    sourceFinishedAt: report.last_updated_at || null,
    coverage: {topicsDone: report.topics_done, topicsTotal: report.topics_total,
      meansCalculable: calculated},
    topics,
    scoreStatus: 'NOT_STAGE04_M4_OR_STAGE05_S5',
    caveat: '기존 Windows R77 원본을 읽기 전용 전달한다. 보고서 전망 CAGR은 확정 M4/E/T/S5가 아니며, 원문 재조사·독립 검산을 뜻하지 않는다.',
  };
}

export function attachSavedR77ToStage05({handoff, savedR77} = {}) {
  if (handoff?.version !== 'STAGE05_VERIFIED_RESULTS_HANDOFF_R81')
    throw new Error('STAGE05_HANDOFF_REQUIRED');
  const forecast = readSavedR77Forecast(savedR77);
  return {
    ...handoff,
    stage04SavedR77Forecast: forecast,
    ollamaInput: handoff.ollamaInput
      ? {...handoff.ollamaInput, stage04SavedR77Forecast: forecast}
      : null,
  };
}
