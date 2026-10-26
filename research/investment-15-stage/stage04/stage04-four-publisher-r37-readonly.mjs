/**
 * R37 research-only Ollama pilot: every sector/theme is investigated at each
 * of TBRC, BRI, SkyQuest and Precedence, regardless of earlier successes.
 * The R35 document supplies URL *addresses only*: its saved figures,
 * eligibility flags and averages are deliberately never read.
 * No DB, provider credentials, score, order, deployment, or scheduler writes.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const MATRIX_PATH = join(HERE, '..', 'STAGE04_R35_FOUR_MEDIA_CAGR_MATRIX_20261026.md');
export const PUBLISHERS = Object.freeze([
  { id: 'TBRC', host: 'www.thebusinessresearchcompany.com', path: '/report/' },
  { id: 'BRI', host: 'www.businessresearchinsights.com', path: '/market-reports/' },
  { id: 'SkyQuest', host: 'www.skyquestt.com', path: '/report/' },
  { id: 'Precedence', host: 'www.precedenceresearch.com', path: '/' },
]);

// Discovery aliases are not statements that two market definitions are equal.
const ALIASES = {
  '정보기술': ['information technology market', 'IT market'],
  '커뮤니케이션': ['telecommunications market', 'telecom market'],
  '임의소비재(경기소비재)': ['consumer discretionary market', 'consumer cyclicals market', 'discretionary consumer goods market'],
  '산업재': ['industrials market', 'industrial machinery market'],
  '금융': ['financial services market', 'finance market'],
  '유틸리티': ['utilities market', 'utility services market'],
  '헬스케어': ['healthcare services market', 'health care market'],
  '소재': ['materials market', 'advanced materials market'],
  '에너지': ['energy sector market', 'oil and gas market', 'energy equipment market'],
  '필수소비재': ['consumer staples market', 'staple food market'],
  '부동산': ['real estate market', 'property market'],
  '로봇·자동화': ['robotics market', 'industrial automation market'],
  '클라우드·SaaS': ['cloud computing market', 'SaaS market'],
  '자율주행': ['autonomous vehicles market', 'self driving vehicle market'],
  '원전·SMR': ['nuclear reactor market', 'small modular reactor market'],
  '방산': ['defense market', 'defence market', 'military equipment market'],
  '핀테크': ['fintech market', 'financial technology market'],
  '사이버보안': ['cyber security market', 'cybersecurity market'],
  '바이오·신약': ['biotechnology market', 'biopharmaceutical market'],
  '데이터센터·전력': ['data center market', 'data center power market'],
  '우주·위성': ['satellite market', 'space systems market'],
};

function domain(url, publisher) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password &&
      (u.hostname === publisher.host || u.hostname === publisher.host.replace(/^www\./, '')) &&
      u.pathname.startsWith(publisher.path);
  } catch { return false; }
}

export function parseUrlSeeds(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!/^\|\s*(섹터|테마)\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(s => s.trim());
    if (cells.length !== 7) throw new Error('MATRIX_COLUMN_COUNT');
    const [kind, name] = cells;
    const seeds = {};
    for (const [idx, p] of PUBLISHERS.entries()) {
      const url = cells[idx + 2].match(/\]\((https:\/\/[^)]+)\)/)?.[1] ?? null;
      if (url && !domain(url, p)) throw new Error(`SOURCE_DOMAIN_MISMATCH:${name}:${p.id}`);
      seeds[p.id] = url;
    }
    rows.push({ kind, name, keywords: ALIASES[name] || [name], seeds });
  }
  if (rows.length !== 21 || new Set(rows.map(x => x.name)).size !== 21)
    throw new Error(`EXPECTED_21_UNIQUE_TOPICS_GOT_${rows.length}`);
  return rows;
}

function unescapeHtml(s) {
  return String(s).replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/gi, (_, d) => String.fromCodePoint(Number(d)));
}

export function pagePlainText(html) {
  return unescapeHtml(String(html)
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|nav|footer)\b[^>]*>[^]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

function titleOf(html) {
  const h1 = html.match(/<h1\b[^>]*>([^]*?)<\/h1>/i)?.[1];
  const title = html.match(/<title\b[^>]*>([^]*?)<\/title>/i)?.[1];
  return pagePlainText(h1 || title || '').slice(0, 200);
}

export function extractCagrCandidates(text) {
  const regex = /\b(?:CAGR|compound annual growth rate)(?:\s*\(CAGR\))?\s*(?:of|at|is|was|:|=)?\s*(\d{1,2}(?:\.\d+)?)\s*%|\b(\d{1,2}(?:\.\d+)?)\s*%\s*(?:CAGR|compound annual growth rate)\b/gi;
  const out = [];
  for (const m of text.matchAll(regex)) {
    const pct = Number(m[1] ?? m[2]);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) continue;
    const excerpt = text.slice(Math.max(0, m.index - 300), Math.min(text.length, m.index + 270));
    if (out.some(c => c.pct === pct && c.excerpt === excerpt)) continue;
    out.push({ pct, excerpt });
    if (out.length === 16) break;
  }
  return out;
}

function periodFromExcerpt(excerpt) {
  const x = excerpt.match(/\b(20\d{2})\s*(?:-|–|—|to|through)\s*(20\d{2})\b/i);
  if (!x) return null;
  const start = Number(x[1]), end = Number(x[2]);
  return end > start && end - start <= 20 ? { start, end } : null;
}

async function getText(url, publisher, fetchFn, maxMs = 15000) {
  if (!domain(url, publisher)) throw Error('UNAPPROVED_REPORT_HOST');
  const response = await fetchFn(url, { signal: AbortSignal.timeout(maxMs),
    headers: { 'user-agent': 'ZGMINI research verification (public page)', accept: 'text/html' } });
  if (!response.ok) throw Error('HTTP_' + response.status);
  if (!domain(response.url || url, publisher)) throw Error('REDIRECT_HOST_MISMATCH');
  if (Number(response.headers?.get?.('content-length') || 0) > 2_000_000)
    throw Error('BODY_TOO_LARGE');
  const body = await response.text();
  if (Buffer.byteLength(body, 'utf8') > 2_000_000) throw Error('BODY_TOO_LARGE');
  return body;
}

/** One discovery lookup when no verified official URL was previously recorded. */
export async function discoverSource(topic, publisher, fetchFn) {
  // Alternatives are OR: requiring every synonym would itself cause false zero hits.
  const synonyms = topic.keywords.map(x => `"${x}"`).join(' OR ');
  const query = `site:${publisher.host} (${synonyms}) CAGR forecast`;
  const search = 'https://www.bing.com/search?format=rss&q=' + encodeURIComponent(query);
  const res = await fetchFn(search, { signal: AbortSignal.timeout(12000),
    headers: { accept: 'application/rss+xml' } });
  if (!res.ok) throw Error('SEARCH_HTTP_' + res.status);
  const xml = await res.text();
  if (xml.length > 500000 || !/<rss\b/i.test(xml)) throw Error('SEARCH_NOT_RSS');
  for (const m of xml.matchAll(/<item\b[^>]*>([^]*?)<\/item>/gi)) {
    const url = unescapeHtml(m[1].match(/<link>([^]*?)<\/link>/i)?.[1] || '').trim();
    if (domain(url, publisher)) return url;
  }
  return null;
}

export const SELECT_SCHEMA = {
  type: 'object', properties: {
    index: { type: 'integer', minimum: -1, maximum: 15 },
    scope: { type: 'string', enum: ['DIRECT', 'PROXY', 'UNRELATED', 'UNCLEAR'] },
  }, required: ['index', 'scope'], additionalProperties: false,
};

/** The model selects among literal source percentages; it never invents rates. */
export async function chooseUsingOllama({ topic, title, candidates, model = 'gemma3:4b', fetchFn = fetch }) {
  const prompt = `Read ONLY the publisher's excerpts below. Select the forecast CAGR for the WHOLE report market, not a regional or fastest-growing segment, not historical growth. index=-1 if none. Classify scope: DIRECT if that market is the named topic itself, PROXY if a narrower or adjacent market, UNRELATED if unrelated, UNCLEAR if uncertain. Topic: ${topic.kind} ${topic.name}. Report heading: ${title}.\n` +
    candidates.map((c, i) => `[${i}] published CAGR=${c.pct}%; excerpt=${c.excerpt}`).join('\n') +
    '\nReturn JSON conforming to ' + JSON.stringify(SELECT_SCHEMA);
  const res = await fetchFn('http://127.0.0.1:11434/api/generate', {
    method: 'POST', signal: AbortSignal.timeout(90000),
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      model, prompt, format: SELECT_SCHEMA, stream: false, think: false,
      options: { temperature: 0, num_predict: 60 },
    }),
  });
  if (!res.ok) throw Error('OLLAMA_HTTP_' + res.status);
  const data = await res.json();
  const answer = JSON.parse(data.response);
  if (!Number.isInteger(answer.index) || answer.index < -1 || answer.index >= candidates.length ||
      !['DIRECT', 'PROXY', 'UNRELATED', 'UNCLEAR'].includes(answer.scope) ||
      Object.keys(answer).sort().join() !== 'index,scope')
    throw Error('OLLAMA_SCHEMA_VALIDATION');
  return answer;
}

function serialQueue() {
  let previous = Promise.resolve();
  return async (work) => {
    const next = previous.then(work, work);
    previous = next.catch(() => {});
    return next;
  };
}

export async function researchR37({ matrixText, fetchFn = fetch,
  selectFn = chooseUsingOllama, model = 'gemma3:4b', limit = 3,
  now = () => performance.now(), onRow = () => {} } = {}) {
  const topics = parseUrlSeeds(matrixText).slice(0, limit);
  const enqueueModel = serialQueue();
  const rows = [];
  for (const topic of topics) {
    const results = await Promise.all(PUBLISHERS.map(async publisher => {
      const started = now();
      let url = topic.seeds[publisher.id];
      const r = { publisher: publisher.id, source_url: url, discovery: url ? 'SEED_URL' : 'LOOKUP',
        status: 'FAILED', reason: null, growth_pct: null, period: null, scope: null,
        article_title: null, model_calls: 0, research_ms: 0, arithmetic_check: 'NOT_CHECKED' };
      try {
        if (!url) {
          url = await discoverSource(topic, publisher, fetchFn);
          if (!url) throw Error('NO_SEARCH_RESULT_NOT_PROOF_OF_ABSENCE');
          r.source_url = url;
        }
        const html = await getText(url, publisher, fetchFn);
        const title = titleOf(html);
        const candidates = extractCagrCandidates(pagePlainText(html));
        r.article_title = title;
        if (!candidates.length) throw Error('NO_LITERAL_CAGR_IN_PAGE');
        r.model_calls = 1;
        const selection = await enqueueModel(() => selectFn({ topic, title, candidates, model, fetchFn }));
        if (!Number.isInteger(selection.index) || selection.index < -1 ||
            selection.index >= candidates.length ||
            !['DIRECT', 'PROXY', 'UNRELATED', 'UNCLEAR'].includes(selection.scope))
          throw Error('MODEL_SELECTION_INVALID');
        if (selection.index < 0 || ['UNRELATED', 'UNCLEAR'].includes(selection.scope))
          throw Error('MODEL_CANNOT_CONFIRM_CAGR');
        const chosen = candidates[selection.index];
        r.growth_pct = chosen.pct;
        r.scope = selection.scope;
        r.period = periodFromExcerpt(chosen.excerpt);
        r.status = selection.scope === 'DIRECT' ? 'CANDIDATE' : 'PROXY_ONLY';
        // A quoted rate is not the same as verification against market-size endpoints.
        r.arithmetic_check = 'PUBLISHED_RATE_QUOTED_ENDPOINTS_UNCHECKED';
      } catch (error) { r.reason = String(error?.message || error).slice(0, 160); }
      finally { r.research_ms = Math.round(now() - started); }
      return r;
    }));
    const valid = results.filter(x => x.status === 'CANDIDATE');
    const average = valid.length ? Math.round(valid.reduce((s, r) => s + r.growth_pct, 0) / valid.length * 100) / 100 : null;
    // Provisional average, never promoted to final unless arithmetic and scope audited.
    const row = { kind: topic.kind, name: topic.name, results,
      provisional_mean: average, n: valid.length, mean_state: 'UNVERIFIED_RESEARCH_ONLY' };
    rows.push(row);
    await onRow(row, rows.length, topics.length);
  }
  const providers = PUBLISHERS.map(p => {
    const attempts = rows.flatMap(row => row.results.filter(r => r.publisher === p.id));
    return { id: p.id, attempts: attempts.length,
      candidate: attempts.filter(r => r.status === 'CANDIDATE').length,
      proxy: attempts.filter(r => r.status === 'PROXY_ONLY').length,
      failed: attempts.filter(r => r.status === 'FAILED').length,
      total_ms: attempts.reduce((n, a) => n + a.research_ms, 0),
      avg_ms: attempts.length ? Math.round(attempts.reduce((n, a) => n + a.research_ms, 0) / attempts.length) : null };
  });
  return { report: 'STAGE04_R37_FOUR_PUBLISHER_OLLAMA_READONLY',
    mode: 'LIVE_HTML_OLLAMA_SOURCE_QUOTE_VERIFICATION',
    total: rows.length, expected_providers_per_row: 4, providers, rows,
    publication: 'NONE', db_changes: false, score_changes: false,
    completed_at: new Date().toISOString() };
}

const csv = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
export function resultCsv(report) {
  const out = [['분류', '섹터·테마', ...PUBLISHERS.map(p => p.id), '잠정평균', '반영기관수', '검증상태']];
  for (const row of report.rows) out.push([row.kind, row.name,
    ...row.results.map(r => r.growth_pct == null ? '—' : r.growth_pct + (r.scope === 'PROXY' ? '†' : '')),
    row.provisional_mean ?? '—', row.n, row.mean_state]);
  out.push([]);
  out.push(['기관', '조회', '직접후보', '대용시장', '실패', '총처리ms', '평균ms']);
  for (const p of report.providers) out.push([p.id, p.attempts, p.candidate, p.proxy, p.failed, p.total_ms, p.avg_ms]);
  return '\uFEFF' + out.map(r => r.map(csv).join(',')).join('\r\n') + '\r\n';
}

export async function runCli(args = process.argv.slice(2)) {
  const all = args.includes('--all');
  const match = args.find(a => /^--limit=\d+$/.test(a));
  const limit = all ? 21 : match ? Math.min(21, Number(match.split('=')[1])) : 3;
  if (limit <= 0) throw Error('LIMIT_MUST_BE_POSITIVE');
  const modelArg = args.find(a => a.startsWith('--model='));
  const model = modelArg?.slice('--model='.length) || 'gemma3:4b';
  const matrixText = await readFile(MATRIX_PATH, 'utf8');
  const tag = limit === 21 ? 'FULL' : 'PILOT_' + limit;
  const stem = join(HERE, `R37_${tag}_FOUR_MEDIA_OLLAMA_RESULT`);
  const checkpoint = [];
  const result = await researchR37({ matrixText, model, limit, onRow: async (r, i, total) => {
    console.log(`${i}/${total} ${r.kind} ${r.name} ${r.results.map(x => x.publisher + ':' + (x.growth_pct ?? x.reason)).join(' | ')} MEAN=${r.provisional_mean ?? 'NULL'} N=${r.n}`);
    checkpoint.push(r);
    await writeFile(stem + '.progress.json', JSON.stringify({
      state: 'RUNNING', completed: i, total, rows: checkpoint,
    }, null, 2), 'utf8');
  } });
  await writeFile(stem + '.json', JSON.stringify(result, null, 2), 'utf8');
  await writeFile(stem + '.csv', resultCsv(result), 'utf8');
  await writeFile(stem + '.progress.json', JSON.stringify({
    state: 'FINISHED_RESEARCH_ONLY', completed: result.total, total: limit,
    result_json: stem + '.json', result_csv: stem + '.csv',
  }, null, 2), 'utf8');
  for (const p of result.providers) console.log(`PROVIDER=${p.id} ATTEMPTS=${p.attempts} DIRECT=${p.candidate} PROXY=${p.proxy} FAILED=${p.failed} AVG_MS=${p.avg_ms}`);
  console.log('RESULT_CSV=' + stem + '.csv');
  console.log('RESULT_JSON=' + stem + '.json');
  console.log('STATUS=RESEARCH_ONLY_ARITHMETIC_NOT_FULLY_VERIFIED');
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli().catch(error => { console.error('R37_FATAL=' + String(error?.message || error)); process.exitCode = 1; });
}
