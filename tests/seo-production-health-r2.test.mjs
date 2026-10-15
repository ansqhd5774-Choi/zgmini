import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectHtml,jsonLdTypes,liveSitemapEntries} from '../scripts/seo-production-health.mjs';

const detailUrl='https://zgmini.kr/fear-greed/korea/';
const detailHtml=`<!doctype html><html><head>
<title>한국 공포탐욕지수 | ZGmini</title>
<meta name="description" content="설명">
<meta name="robots" content="index, follow">
<meta property="og:title" content="한국 공포탐욕지수 | ZGmini">
<meta property="og:description" content="설명">
<meta property="og:url" content="${detailUrl}">
<meta name="twitter:title" content="한국 공포탐욕지수 | ZGmini">
<meta name="twitter:description" content="설명">
<link rel="canonical" href="${detailUrl}">
</head><body><h1>한국 공포탐욕지수</h1>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList"}</script>
</body></html>`;

test('production SEO inspector accepts the detail-page contract',()=>{
  const result=inspectHtml(detailHtml,detailUrl);
  assert.deepEqual(result.errors,[]);
  assert.ok(result.types.includes('WebPage'));
  assert.ok(result.types.includes('BreadcrumbList'));
});

test('production SEO inspector requires guide Article JSON-LD',()=>{
  const guideUrl='https://zgmini.kr/guides/fomc/';
  const html=detailHtml.replaceAll(detailUrl,guideUrl);
  const result=inspectHtml(html,guideUrl);
  assert.ok(result.errors.includes('jsonld_article_missing'));
});

test('JSON-LD type parser reads graph and standalone nodes',()=>{
  const html='<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite"},{"@type":"Organization"}]}</script><script type="application/ld+json">{"@type":"BreadcrumbList"}</script>';
  const types=jsonLdTypes(html);
  assert.deepEqual([...types].sort(),['BreadcrumbList','Organization','WebSite']);
});

test('live sitemap parser distinguishes URL presence from lastmod presence',()=>{
  const xml='<urlset><url><loc>https://zgmini.kr/</loc><lastmod>2026-10-16</lastmod></url><url><loc>https://zgmini.kr/about/</loc></url></urlset>';
  const entries=liveSitemapEntries(xml);
  assert.equal(entries.get('https://zgmini.kr/'),'2026-10-16');
  assert.equal(entries.get('https://zgmini.kr/about/'),null);
  assert.equal(entries.size,2);
});

test('local public sitemap has all 16 URLs with truthful ISO lastmod values',()=>{
  const entries=liveSitemapEntries(readFileSync('public/sitemap.xml','utf8'));
  assert.equal(entries.size,16);
  for(const [url,lastmod] of entries){
    assert.match(url,/^https:\/\/zgmini\.kr\//);
    assert.match(lastmod,/^\d{4}-\d{2}-\d{2}$/);
  }
  assert.equal(entries.get('https://zgmini.kr/earnings-recession/'),'2026-10-16');
  assert.equal(entries.get('https://zgmini.kr/asset-bubble/'),'2026-10-16');
  assert.equal(entries.get('https://zgmini.kr/supply-shock/'),'2026-10-16');
});

test('production SEO workflow is push-only and deployment-gated',()=>{
  const workflow=readFileSync('.github/workflows/seo-production-health.yml','utf8');
  const script=readFileSync('scripts/seo-production-health.mjs','utf8');
  assert.match(workflow,/push:\s*\n\s*branches: \[main\]/);
  assert.doesNotMatch(workflow,/schedule:/);
  assert.doesNotMatch(workflow,/pull_request:/);
  assert.match(workflow,/checks: read/);
  assert.match(workflow,/SEO_HEALTH_GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.match(script,/waitForCloudflare/);
  assert.match(script,/EXPECTED_PUBLIC_URLS=16/);
  assert.match(script,/lastmod_missing:/);
  assert.match(script,/SEO_HEALTH_PASS=/);
});
