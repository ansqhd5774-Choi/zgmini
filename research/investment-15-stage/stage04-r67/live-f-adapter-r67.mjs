// Stage04 R67: ONE authorized public GET for read-only theme sentiment.
// Reuses the already implemented Stage04 F selection contract (provisional precedence).
// Research simulation only: R63 forecast inputs are historical, not freshly attested.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { analyzeR63ResearchSnapshot } from './forecast-sentiment-r67.mjs';

// These are the 9 themes carried by Stage03 in the R2/R17 investment plan.
// The 21-topic CAGR survey and other theme projects do not approve new ETF themes.
export const STAGE03_THEME_IDS = Object.freeze({
  '로봇·자동화': 12,
  '클라우드·SaaS': 13,
  '자율주행': 14,
  '원전·SMR': 15,
  '방산': 16,
  '핀테크': 17,
  '사이버보안': 18,
  '바이오·신약': 19,
  '데이터센터·전력': 20,
});

export function normalizeSelectedThemeF(selected, endpoint) {
  if (!selected || !Array.isArray(selected.themes)) throw new Error('Invalid selected theme F payload');
  const records = [];
  const unmatchedThemeNames = [];
  for (const theme of selected.themes) {
    const topicId = STAGE03_THEME_IDS[theme.theme];
    if (!topicId) {
      unmatchedThemeNames.push(theme.theme);
      continue;
    }
    if (theme.currentInput === null || theme.phase === 'UNAVAILABLE') continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(theme.observationDate || '')) {
      throw new Error(`Missing actual observation date for ${theme.theme}`);
    }
    const status = theme.phase === 'PROVISIONAL' ? 'PROVISIONAL'
      : theme.phase === 'BASE_OBSERVED' ? 'CONFIRMED' : null;
    if (!status) throw new Error(`Unrecognized source phase for ${theme.theme}`);
    records.push({
      topic_id: topicId,
      score: theme.currentInput,
      observed_at: theme.observationDate,
      status,
      source: endpoint,
      source_version: selected.sourceVersion ?? null,
      source_stored_at: selected.sourceStoredAt ?? null,
      fetched_at: selected.fetchedAt ?? null,
    });
  }
  return { records, diagnostics: {
    expected_approved_theme_count: 9,
    matched_with_observed_f: records.length,
    missing_approved_themes: Object.keys(STAGE03_THEME_IDS)
      .filter(name => !records.some(record => record.topic_id === STAGE03_THEME_IDS[name])),
    ignored_unapproved_theme_names: unmatchedThemeNames,
    source_status: selected.status,
    source_version: selected.sourceVersion ?? null,
    fetched_at: selected.fetchedAt ?? null,
  } };
}

export async function readLiveThemeSentiment({ fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  // Import the existing Stage04 selector only on actual live read. No selector duplication.
  const { F_ENDPOINT, selectThemeF } = await import('../stage04/latest-f-readonly.mjs');
  const response = await fetchImpl(F_ENDPOINT, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`THEME_F_HTTP_${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload?.themes)) throw new Error('THEME_F_PAYLOAD_MISSING_THEMES');
  const selected = selectThemeF(payload, { expectedThemes: payload.themes.length });
  return normalizeSelectedThemeF(selected, F_ENDPOINT);
}

async function cli() {
  const args = process.argv.slice(2);
  const at = args.indexOf('--matrix');
  if (at < 0 || !args[at + 1]) throw new Error('Usage: node live-f-adapter-r67.mjs --matrix R63.md');
  const markdown = readFileSync(args[at + 1], 'utf8');
  const live = await readLiveThemeSentiment();
  const comparison = analyzeR63ResearchSnapshot(markdown, { records: live.records });
  process.stdout.write(`${JSON.stringify({ ...comparison, live_f_diagnostics: live.diagnostics }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cli().catch(error => {
    process.stderr.write(`R67_READ_ONLY_THEME_F_UNAVAILABLE: ${error.message}\n`);
    process.exitCode = 1;
  });
}
