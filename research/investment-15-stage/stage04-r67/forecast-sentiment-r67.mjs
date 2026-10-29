// Stage 04 R89: historical R63 forecast CAGR averages plus independent F context.
// This program deliberately does not fetch live data or change ZGMINI production scores.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const PUBLISHERS = ['TBRC', 'SkyQuest', 'Precedence'];
export const MIN_PUBLISHERS_FOR_MEAN = 2;

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function parseObservation(cell, publisher, officialUrl) {
  const raw = cell.trim();
  if (raw.startsWith('미확정')) {
    const reason = raw.match(/\(([^)]+)\)/)?.[1] ?? 'NOT_VERIFIED';
    return { publisher, cagr_pct: null, forecast_period: null, source_status: reason, official_url: officialUrl ?? null };
  }
  const match = raw.match(/^(-?\d+(?:\.\d+)?)%\s*\((\d{4}\s*[-–]\s*\d{4});\s*([^)]+)\)$/);
  if (!match) throw new Error(`Unrecognized ${publisher} observation: ${raw}`);
  const cagr = Number(match[1]);
  if (!Number.isFinite(cagr)) throw new Error(`Non-finite CAGR: ${raw}`);
  return {
    publisher,
    cagr_pct: cagr,
    forecast_period: match[2].replace(/\s/g, '').replace('–', '-'),
    source_status: match[3].trim(),
    official_url: officialUrl ?? null,
  };
}

function extractOfficialUrls(markdown) {
  const result = new Map();
  const section = markdown.split('## 공식 원문 링크 (전체 63개 슬롯)')[1] ?? '';
  let topicId = null;
  for (const line of section.split(/\r?\n/)) {
    const heading = line.match(/^###\s+(\d+)\.\s+/);
    if (heading) {
      topicId = Number(heading[1]);
      result.set(topicId, {});
      continue;
    }
    const link = line.match(/^-\s+(TBRC|SkyQuest|Precedence):\s+\[원문\]\((https:\/\/[^)]+)\)/);
    if (link && topicId !== null) result.get(topicId)[link[1]] = link[2];
  }
  return result;
}

export function parseR63Matrix(markdown) {
  if (typeof markdown !== 'string') throw new TypeError('Markdown is required');
  const sourceUrls = extractOfficialUrls(markdown);
  const topics = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cols = line.split('|').slice(1, -1).map(cell => cell.trim());
    if (cols.length !== 5) throw new Error(`Expected 5 columns: ${line}`);
    const id = Number(cols[0]);
    const [name, ...cells] = cols.slice(1);
    const observations = cells.map((cell, index) =>
      parseObservation(cell, PUBLISHERS[index], sourceUrls.get(id)?.[PUBLISHERS[index]]));
    const verified = observations.filter(item => item.cagr_pct !== null);
    const values = verified.map(item => item.cagr_pct);
    const ready = verified.length >= MIN_PUBLISHERS_FOR_MEAN;
    topics.push({
      topic_id: id,
      topic: name,
      group: id <= 11 ? 'SECTOR' : 'THEME',
      observation_count: verified.length,
      valid_publishers: verified.map(item => item.publisher),
      forecast_status: ready ? 'MEAN_CALCULABLE' : 'INSUFFICIENT_PUBLISHERS',
      average_cagr_pct: ready ? round(values.reduce((a, b) => a + b, 0) / values.length) : null,
      min_cagr_pct: values.length ? Math.min(...values) : null,
      max_cagr_pct: values.length ? Math.max(...values) : null,
      spread_pct_points: values.length > 1 ? round(Math.max(...values) - Math.min(...values)) : null,
      observations,
      caveats: [
        'PUBLISHER_DEFINED_MARKET_NOT_GICS_SECTOR_CERTIFICATION',
        ...(verified.some(item => item.source_status.includes('CONFLICT')) ? ['SOURCE_METADATA_CONFLICT_RETAINED'] : []),
        ...(new Set(verified.map(item => item.forecast_period)).size > 1 ? ['DIFFERENT_FORECAST_PERIODS'] : []),
      ],
    });
  }
  if (new Set(topics.map(item => item.topic_id)).size !== topics.length) throw new Error('Duplicate topic IDs');
  return topics;
}

export function addReadOnlySentiment(topics, sentiment) {
  const records = sentiment?.records ?? [];
  if (!Array.isArray(records)) throw new TypeError('sentiment.records must be an array');
  const byId = new Map();
  for (const value of records) {
    if (!Number.isInteger(value.topic_id) || byId.has(value.topic_id)) throw new Error('Invalid/duplicate sentiment topic_id');
    if (typeof value.score !== 'number' || !Number.isFinite(value.score) || value.score < 0 || value.score > 100) {
      throw new Error(`Invalid sentiment score at topic ${value.topic_id}`);
    }
    if (!value.observed_at || !value.source || !['CONFIRMED', 'PROVISIONAL'].includes(value.status)) {
      throw new Error(`Missing provenance or status at topic ${value.topic_id}`);
    }
    byId.set(value.topic_id, value);
  }
  const known = new Set(topics.map(row => row.topic_id));
  for (const id of byId.keys()) if (!known.has(id)) throw new Error(`Unmapped sentiment topic ${id}`);
  return topics.map(row => {
    const f = byId.get(row.topic_id);
    const score = f?.score ?? null;
    return {
      ...row,
      sentiment_score: score,
      sentiment_observed_at: f?.observed_at ?? null,
      sentiment_status: f?.status ?? 'NOT_SUPPLIED',
      sentiment_source: f?.source ?? null,
      comparison_status: score === null ? 'SENTIMENT_NOT_AVAILABLE' : 'INDEPENDENT_CONTEXT_ONLY',
    };
  });
}

export function analyzeR63ResearchSnapshot(markdown, sentiment = null) {
  const topics = addReadOnlySentiment(parseR63Matrix(markdown), sentiment);
  return {
    schema_version: 'stage04-r89-forecast-with-independent-f-v2',
    source_document_sha256: createHash('sha256').update(markdown).digest('hex'),
    source_basis: 'R63_20261027_HISTORICAL_RESEARCH',
    result_status: 'RESEARCH_ONLY_NOT_CURRENT_VERIFIED_NOT_APPROVED_FOR_LIVE_SCORING',
    methodology: {
      minimum_distinct_publishers: MIN_PUBLISHERS_FOR_MEAN,
      mean: 'UNWEIGHTED_ARITHMETIC_MEAN_OF_VALID_PUBLISHER_FORECAST_CAGR_PCT',
      cohorts: ['11_SECTORS', '10_THEMES'],
      note: 'Historical research cannot replace fresh official source verification; do not deploy or trade.',
    },
    counts: {
      topics: topics.length,
      average_ready: topics.filter(row => row.forecast_status === 'MEAN_CALCULABLE').length,
      valid_observations: topics.reduce((sum, row) => sum + row.observation_count, 0),
      two_publishers: topics.filter(row => row.observation_count === 2).length,
      three_publishers: topics.filter(row => row.observation_count === 3).length,
      sentiment_observations: topics.filter(row => row.sentiment_score !== null).length,
    },
    topics,
  };
}

function cli() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--matrix');
  if (inputIndex < 0 || !args[inputIndex + 1]) {
    process.stderr.write('Usage: node forecast-sentiment-r67.mjs --matrix R63.md [--sentiment verified-read-only.json]\n');
    process.exitCode = 2;
    return;
  }
  const markdown = readFileSync(args[inputIndex + 1], 'utf8');
  const sentimentIndex = args.indexOf('--sentiment');
  const sentiment = sentimentIndex >= 0 ? JSON.parse(readFileSync(args[sentimentIndex + 1], 'utf8')) : null;
  process.stdout.write(`${JSON.stringify(analyzeR63ResearchSnapshot(markdown, sentiment), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) cli();
