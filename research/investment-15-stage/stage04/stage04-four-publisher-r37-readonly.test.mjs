import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLISHERS, parseUrlSeeds, extractCagrCandidates,
  pagePlainText, researchR37, resultCsv, formatRowTxt,
  formatSummaryTxt } from './stage04-four-publisher-r37-readonly.mjs';

function fixtureSeeds({ blanks = false } = {}) {
  const labels = [
    '정보기술', '커뮤니케이션', '임의소비재(경기소비재)', '산업재',
    '금융', '유틸리티', '헬스케어', '소재', '에너지', '필수소비재', '부동산',
    '로봇·자동화', '클라우드·SaaS', '자율주행', '원전·SMR',
    '방산', '핀테크', '사이버보안', '바이오·신약', '데이터센터·전력', '우주·위성'
  ];
  return [
    '| 분류 | 섹터·테마 | TBRC | BRI | SkyQuest | Precedence | 잠정평균 |',
    '|---|---|---|---|---|---|---|',
    ...labels.map((name, index) => {
      const kind = index < 11 ? '섹터' : '테마';
      const cells = PUBLISHERS.map((p, i) =>
        blanks && i === 1 ? '—' : `[${(i + 1) * 10}%](https://${p.host}${p.path}test-${index})`);
      return `| ${kind} | ${name} | ${cells.join(' | ')} | 25% |`;
    }),
  ].join('\n');
}

function fakeFetch(url) {
  if (url.startsWith('https://www.bing.com')) return Promise.resolve({
    ok: true, status: 200, text: async () => '<rss><channel></channel></rss>'
  });
  const host = new URL(url).host;
  const pct = PUBLISHERS.findIndex(p => p.host === host) * 10 + 10;
  return Promise.resolve({
    ok: true, status: 200, url, headers: { get: () => null },
    text: async () => `<html><title>Information Technology Market</title><script>CAGR of 98%</script><h1>Information Technology Market</h1><p>The global market is forecast 2026–2035 with a CAGR of ${pct}%.</p></html>`
  });
}

test('seed document gives 21 unique rows, URLs only (never stored rates)', () => {
  const rows = parseUrlSeeds(fixtureSeeds());
  assert.equal(rows.length, 21);
  assert.equal(rows[2].keywords.includes('consumer discretionary market'), true);
  assert.equal(rows[15].keywords.includes('defence market'), true);
  assert.equal(rows[0].seeds.TBRC, 'https://www.thebusinessresearchcompany.com/report/test-0');
  assert.equal(JSON.stringify(rows).includes('25%'), false);
});

test('page text removes scripts and extracts actual literal candidate', () => {
  const html = '<h1>X Market</h1><script>CAGR of 99%</script><p>forecast 2026–2035 CAGR of 7.25%</p>';
  assert.deepEqual(extractCagrCandidates(pagePlainText(html)).map(x => x.pct), [7.25]);
});

test('all 4 publishers are attempted even after first succeeds; mean excludes proxy', async () => {
  const selected = [];
  const out = await researchR37({ matrixText: fixtureSeeds(), limit: 1,
    fetchFn: fakeFetch,
    selectFn: async ({ topic, candidates }) => {
      selected.push(topic.name);
      return { index: 0, scope: candidates[0].pct === 40 ? 'PROXY' : 'DIRECT' };
    },
  });
  assert.equal(selected.length, 4);
  assert.deepEqual(out.rows[0].results.map(x => x.growth_pct), [10, 20, 30, 40]);
  assert.equal(out.rows[0].n, 3);
  assert.equal(out.rows[0].provisional_mean, 20);
  assert.equal(out.providers.reduce((sum, p) => sum + p.attempts, 0), 4);
  assert.equal(out.rows[0].mean_state, 'UNVERIFIED_RESEARCH_ONLY');
  assert.match(resultCsv(out), /정보기술/);
  assert.match(formatRowTxt(out.rows[0], 1, 1), /MEDIA_TBRC_CAGR_PCT=10/);
  assert.match(formatRowTxt(out.rows[0], 1, 1), /MEDIA_PRECEDENCE_STATUS=PROXY_ONLY/);
  assert.match(formatSummaryTxt(out), /PROVIDER_BRI_DIRECT=1/);
  assert.match(formatSummaryTxt(out), /STATUS=FINISHED_RESEARCH_ONLY/);
});

test('missing BRI seed still triggers independent synonym discovery, without fake zero', async () => {
  let searches = 0;
  const fetchFn = async (url, options) => {
    if (url.startsWith('https://www.bing.com')) {
      searches++;
      const parsed = new URL(url).searchParams.get('q');
      assert.match(parsed, / OR /);
    }
    return fakeFetch(url, options);
  };
  const out = await researchR37({ matrixText: fixtureSeeds({ blanks: true }), limit: 1,
    fetchFn, selectFn: async () => ({ index: 0, scope: 'DIRECT' }) });
  assert.equal(searches, 1);
  assert.equal(out.rows[0].results[1].status, 'FAILED');
  assert.equal(out.rows[0].results[1].growth_pct, null);
  assert.equal(out.rows[0].n, 3);
  assert.equal(out.rows[0].provisional_mean, 26.67);
});

test('non-official linked host fails closed', () => {
  const input = fixtureSeeds().replace('https://www.skyquestt.com/report/test-0', 'https://evil.test/report/test-0');
  assert.throws(() => parseUrlSeeds(input), /SOURCE_DOMAIN_MISMATCH/);
});
