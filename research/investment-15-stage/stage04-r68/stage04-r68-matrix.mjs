/**
 * R68: Stage04 independent research axes, no unapproved attractiveness arithmetic.
 * Preserves R63/R67 publisher means; optional live F is a single read-only GET.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { applyPeerPercentiles, parseR63Matrix } from '../stage04-r67/forecast-sentiment-r67.mjs';
import { readLiveThemeSentiment, STAGE03_THEME_IDS } from '../stage04-r67/live-f-adapter-r67.mjs';

const APPROVED_TOPIC_IDS = Object.freeze(Object.values(STAGE03_THEME_IDS));

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function auditPeerUniverseInstability(topics) {
  const allThemeRows = topics.filter(row => row.group === 'THEME');
  const approvedThemeRows = allThemeRows.filter(row => APPROVED_TOPIC_IDS.includes(row.topic_id));
  const tenThemeRanks = new Map(applyPeerPercentiles(allThemeRows)
    .map(row => [row.topic_id, row.growth_peer_percentile]));
  const nineThemeRanks = new Map(applyPeerPercentiles(approvedThemeRows)
    .map(row => [row.topic_id, row.growth_peer_percentile]));
  return approvedThemeRows.map(row => ({
    topic_id: row.topic_id,
    topic: row.topic,
    unchanged_mean_cagr_pct: row.average_cagr_pct,
    nine_approved_theme_percentile: nineThemeRanks.get(row.topic_id) ?? null,
    ten_research_theme_percentile: tenThemeRanks.get(row.topic_id) ?? null,
    percentile_change_only_from_peer_universe:
      nineThemeRanks.has(row.topic_id) && tenThemeRanks.has(row.topic_id)
        ? round(tenThemeRanks.get(row.topic_id) - nineThemeRanks.get(row.topic_id)) : null,
  }));
}

export function buildR68Comparison(markdown, { records = [], fStatus = 'NOT_REQUESTED', fError = null } = {}) {
  const topics = parseR63Matrix(markdown);
  if (!Array.isArray(records)) throw new TypeError('F records must be an array');
  const allowed = new Set(APPROVED_TOPIC_IDS);
  const byTopic = new Map();
  for (const record of records) {
    if (!allowed.has(record.topic_id) || byTopic.has(record.topic_id)) {
      throw new Error(`Unexpected or duplicate approved F topic ${record.topic_id}`);
    }
    if (typeof record.score !== 'number' || !Number.isFinite(record.score)
      || record.score < 0 || record.score > 100) throw new Error(`Invalid F score for ${record.topic_id}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.observed_at ?? '')
      || !['PROVISIONAL', 'CONFIRMED'].includes(record.status)
      || typeof record.source !== 'string' || !record.source) throw new Error(`Incomplete F provenance for ${record.topic_id}`);
    byTopic.set(record.topic_id, record);
  }
  return {
    schema_version: 'stage04-r68-independent-axes-v1',
    source_basis: 'R63_HISTORICAL_FORECAST_RESEARCH_NOT_REVERIFIED',
    source_sha256: createHash('sha256').update(markdown).digest('hex'),
    model_status: 'R68_AUDIT_ONLY_NO_ATTRACTIVENESS_FORMULA_APPROVAL',
    policy: {
      minimum_publishers_for_reference_mean: 2,
      comparison: 'DESCRIPTIVE_CAGR_MEAN_AND_READ_ONLY_F_AS_SEPARATE_AXES',
      forbidden_equivalence: 'FORECAST_PERCENTILE_IS_NOT_REALIZED_INDUSTRY_G_AND_NOT_MARKET_MISPRICING',
      approved_future_input: 'R2_SAME_SERIES_ACTUAL_GROWTH_AND_ACCELERATION_REQUIRES_SOURCE_VERIFICATION',
      investment_attractiveness_formula_approved: false,
    },
    f_status: fStatus,
    f_error: fError,
    counts: {
      forecast_topics: topics.length,
      forecast_mean_ready: topics.filter(row => row.average_cagr_pct !== null).length,
      valid_publisher_values: topics.reduce((sum, row) => sum + row.observation_count, 0),
      approved_stage03_theme_count: APPROVED_TOPIC_IDS.length,
      paired_f_observations: byTopic.size,
      calculated_attractiveness_scores: 0,
    },
    topics: topics.map(row => {
      const f = byTopic.get(row.topic_id);
      return {
        topic_id: row.topic_id,
        topic: row.topic,
        group: row.group,
        approved_stage03_theme: allowed.has(row.topic_id),
        forecast: {
          mean_calculable: row.average_cagr_pct !== null,
          publishers: row.valid_publishers,
          publisher_count: row.observation_count,
          mean_cagr_pct: row.average_cagr_pct,
          min_cagr_pct: row.min_cagr_pct,
          max_cagr_pct: row.max_cagr_pct,
          spread_pct_points: row.spread_pct_points,
          forecast_periods: [...new Set(row.observations.filter(o => o.cagr_pct !== null)
            .map(o => o.forecast_period))],
          caveats: row.caveats,
          claim_scope: 'PUBLISHER_DEFINED_MARKETS_ONLY_NOT_CERTIFIED_GICS_OR_WHOLE_THEME',
        },
        sentiment_f: f ? {
          score: f.score,
          observation_date: f.observed_at,
          status: f.status,
          source: f.source,
          source_version: f.source_version ?? null,
          source_stored_at: f.source_stored_at ?? null,
        } : null,
        realized_industry_growth_g: null,
        forecast_minus_sentiment_gap: null,
        investment_attractiveness_m: null,
        screening_rank: null,
        comparison_status: f ? 'TWO_AXES_DISPLAY_ONLY' : 'F_NOT_MAPPED_OR_UNAVAILABLE',
      };
    }),
    percentile_universe_sensitivity_not_a_score: auditPeerUniverseInstability(topics),
  };
}

async function cli() {
  const args = process.argv.slice(2);
  const at = args.indexOf('--matrix');
  if (at < 0 || !args[at + 1]) throw new Error('Usage: --matrix R63.md [--live-f] [--output output.json]');
  const markdown = readFileSync(args[at + 1], 'utf8');
  let live = { records: [], fStatus: 'NOT_REQUESTED', fError: null };
  if (args.includes('--live-f')) {
    try {
      const result = await readLiveThemeSentiment();
      live = { records: result.records, fStatus: result.diagnostics.source_status, fError: null };
    } catch (error) {
      live = { records: [], fStatus: 'LIVE_GET_FAILED', fError: error.message };
      process.exitCode = 2;
    }
  }
  const report = buildR68Comparison(markdown, live);
  const outputAt = args.indexOf('--output');
  if (outputAt >= 0) {
    if (!args[outputAt + 1]) throw new Error('--output needs a path');
    writeFileSync(args[outputAt + 1], `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  process.stdout.write(`R68 audit: historical CAGR ${report.counts.forecast_mean_ready}/${report.counts.forecast_topics}, `
    + `valid publisher rates ${report.counts.valid_publisher_values}, read-only F ${report.counts.paired_f_observations}/9, `
    + `F_STATUS=${report.f_status}, attractiveness scores=0 (not approved)\n`);
  if (report.f_error) process.stderr.write(`R68_LIVE_F_FETCH_ERROR: ${report.f_error}\n`);
  if (outputAt < 0) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cli().catch(error => {
    process.stderr.write(`R68_INPUT_OR_OUTPUT_ERROR: ${error.message}\n`);
    process.exitCode = 1;
  });
}
