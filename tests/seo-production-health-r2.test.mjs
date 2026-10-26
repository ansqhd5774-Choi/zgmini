import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SEO_RUNTIME_MARKERS,inspectCanonicalRedirect,inspectCrawlResponse,inspectGuideInboundLink,inspectHtml,jsonLdTypes,liveSitemapEntries} from '../scripts/seo-production-health.mjs';

const detailUrl='https://zgmini.kr/fear-greed/korea/';
const detailDescription='한국 공포탐욕지수의 최근 점수와 504개 유효 관측치 기준창을 확인하세요.';
const detailHtml=`<!doctype html><html><head>
<title>한국 공포탐욕지수 | ZGmini</title>
<meta name="description" content="${detailDescription}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="한국 공포탐욕지수 | ZGmini">
<meta property="og:description" content="${detailDescription}">
<meta property="og:url" content="${detailUrl}">
<meta name="twitter:title" content="한국 공포탐욕지수 | ZGmini">
<meta name="twitter:description" content="${detailDescription}">
<link rel="canonical" href="${detailUrl}">
</head><body><h1>한국 공포탐욕지수</h1><p>한국 공탐지수라고도 부르며 국내 시장 투자심리를 보여줍니다.</p>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList"}</script>
</body></html>`;

test('production SEO inspector accepts the detail-page contract',()=>{
  const result=inspectHtml(detailHtml,detailUrl);
  assert.deepEqual(result.errors,[]);
  assert.ok(result.types.includes('WebPage'));
  assert.ok(result.types.includes('BreadcrumbList'));
});

test('robots inspection rejects negative directives instead of matching index inside noindex',()=>{
  for(const policy of ['noindex, follow','index, nofollow','index, follow, noindex','index, follow, nofollow']){
    const result=inspectHtml(detailHtml.replace('content="index, follow"',`content="${policy}"`),detailUrl);
    assert.ok(result.errors.includes(`robots_invalid:${policy}`),policy);
  }
});

test('production SEO inspector rejects stale current-page metadata even when all tags exist',()=>{
  const url='https://zgmini.kr/earnings-recession/';
  const oldDescription='미국 기업 실적 침체를 EPS 성장, 매출 성장, 영업이익률, 이익 성장 기업 비율로 확인하세요. E1-R4 저장 데이터와 메인 진단 상태를 구분해 제공합니다.';
  const html=`<!doctype html><html><head>
<title>미국 실적 침체 | EPS·매출·마진·이익 폭 - ZGmini</title>
<meta name="description" content="${oldDescription}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="미국 실적 침체 | EPS·매출·마진·이익 폭 - ZGmini">
<meta property="og:description" content="${oldDescription}">
<meta property="og:url" content="${url}">
<meta name="twitter:title" content="미국 실적 침체 | EPS·매출·마진·이익 폭 - ZGmini">
<meta name="twitter:description" content="${oldDescription}">
<link rel="canonical" href="${url}">
</head><body><h1>실적 침체란?</h1><p>미국 기업 실적의 둔화와 침체 위험을 EPS 성장, 매출 성장, 영업이익률, 이익 성장 기업 비율로 확인하세요.</p>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList"}</script>
</body></html>`;
  const result=inspectHtml(html,url);
  assert.ok(result.errors.some(error=>error.startsWith('description_stale:')));
});

test('production SEO inspector requires social metadata to match the primary title and description',()=>{
  const html=detailHtml.replace(`<meta property="og:description" content="${detailDescription}">`,'<meta property="og:description" content="오래된 설명">');
  const result=inspectHtml(html,detailUrl);
  assert.ok(result.errors.includes('og_description_mismatch'));
});

test('USA SEO inspector accepts approved description and rejects the obsolete description',()=>{
  const url='https://zgmini.kr/fear-greed/usa/';
  const page=readFileSync('app/fear-greed/usa/page.tsx','utf8');
  const description=page.match(/const description = "([^"]+)";/)[1];
  const html=detailHtml.replaceAll(detailUrl,url).replaceAll(detailDescription,description).replace('한국 공탐지수라고도 부르며','미국 공탐 지수는 CNN이 제공하는');
  assert.deepEqual(inspectHtml(html,url).errors,[]);
  const obsolete=html.replaceAll(description,'원시값과 환산점수의 차이');
  assert.ok(inspectHtml(obsolete,url).errors.some(error=>error.startsWith('description_stale:')));
});

test('risk indicators SEO contract follows actual page metadata and rejects obsolete copy',()=>{
  const url='https://zgmini.kr/risk-indicators/';
  const page=readFileSync('app/risk-indicators/page.tsx','utf8');
  const match=page.match(/const description\s*=\s*'([^']+)';/);
  assert.ok(match,'risk page must expose its approved description for the contract check');
  const description=match[1];
  assert.ok(description.includes(SEO_RUNTIME_MARKERS.get(url).descriptionIncludes));
  const html=detailHtml.replaceAll(detailUrl,url).replaceAll(detailDescription,description);
  assert.deepEqual(inspectHtml(html,url).errors,[]);
  const obsolete=html.replaceAll(description,'경기침체, 인플레이션, 유동성 위기, 신용 위험, 실적 침체, 자산 버블, 부채 위험, 공급 충격의 저장 점수를 비교하세요.');
  assert.ok(inspectHtml(obsolete,url).errors.some(error=>error.startsWith('description_stale:')));
});

test('production SEO inspector requires guide Article JSON-LD',()=>{
  const guideUrl='https://zgmini.kr/guides/fomc/';
  const html=detailHtml.replaceAll(detailUrl,guideUrl);
  const result=inspectHtml(html,guideUrl);
  assert.ok(result.errors.includes('jsonld_article_missing'));
});

test('runtime freshness contracts cover every public sitemap URL',()=>{
  const entries=liveSitemapEntries(readFileSync('public/sitemap.xml','utf8'));
  assert.equal(SEO_RUNTIME_MARKERS.size,35);
  for(const url of entries.keys()) assert.ok(SEO_RUNTIME_MARKERS.has(url),`missing runtime contract for ${url}`);
});

test('inflation freshness contract follows approved introduction and preserves official-source checks',()=>{
  const contract=SEO_RUNTIME_MARKERS.get('https://zgmini.kr/inflation/');
  const intro=readFileSync('app/search-intent-intro.tsx','utf8');
  const page=readFileSync('app/inflation/page.tsx','utf8');
  assert.ok(intro.includes(contract.htmlIncludes[0]));
  assert.ok(page.includes(contract.htmlIncludes[1]));
  assert.ok(page.includes(contract.htmlIncludes[2]));
  const html=detailHtml.replaceAll(detailUrl,'https://zgmini.kr/inflation/').replaceAll(detailDescription,contract.descriptionIncludes).replace('</body>',`<p>${contract.htmlIncludes[0]}</p><a>${contract.htmlIncludes[1]}</a><a>${contract.htmlIncludes[2]}</a></body>`);
  assert.deepEqual(inspectHtml(html,'https://zgmini.kr/inflation/').errors,[]);
  for(const marker of contract.htmlIncludes){
    assert.ok(inspectHtml(html.replace(marker,''),'https://zgmini.kr/inflation/').errors.includes('html_stale:'+marker));
  }
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

test('canonical redirect inspector requires a permanent redirect and exact HTTPS location',()=>{
  assert.deepEqual(inspectCanonicalRedirect({status:308,location:'https://zgmini.kr/recession/?x=1'},'https://zgmini.kr/recession/?x=1'),[]);
  assert.deepEqual(inspectCanonicalRedirect({status:301,location:'https://zgmini.kr/'},'https://zgmini.kr/'),[]);
  assert.deepEqual(inspectCanonicalRedirect({status:200,location:''},'https://zgmini.kr/'),['http_200','location:missing']);
  assert.deepEqual(inspectCanonicalRedirect({status:308,location:'https://zgmini.kr/'},'https://zgmini.kr/about/'),['location:https://zgmini.kr/']);
});

test('local public sitemap has all 35 URLs with truthful ISO lastmod values',()=>{
  const entries=liveSitemapEntries(readFileSync('public/sitemap.xml','utf8'));
  assert.equal(entries.size,35);
  for(const [url,lastmod] of entries){
    assert.match(url,/^https:\/\/zgmini\.kr\//);
    assert.match(lastmod,/^\d{4}-\d{2}-\d{2}$/);
  }
  assert.equal(entries.get('https://zgmini.kr/earnings-recession/'),'2026-10-25');
  assert.equal(entries.get('https://zgmini.kr/asset-bubble/'),'2026-10-25');
  assert.equal(entries.get('https://zgmini.kr/supply-shock/'),'2026-10-25');
});

test('production SEO workflow is push-only, deployment-gated, and verifies canonical HTTP redirects',()=>{
  const workflow=readFileSync('.github/workflows/seo-production-health.yml','utf8');
  const script=readFileSync('scripts/seo-production-health.mjs','utf8');
  assert.match(workflow,/push:\s*\n\s*branches: \[main\]/);
  assert.doesNotMatch(workflow,/schedule:/);
  assert.doesNotMatch(workflow,/pull_request:/);
  assert.match(workflow,/checks: read/);
  assert.match(workflow,/SEO_HEALTH_GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.match(script,/waitForCloudflare/);
  assert.match(script,/EXPECTED_PUBLIC_URLS=35/);
  assert.match(script,/SEO_RUNTIME_MARKERS\.size!==EXPECTED_PUBLIC_URLS/);
  assert.match(script,/function includesOrError\(errors,label,value,needle\)/);
  assert.match(script,/SEO_RUNTIME_MARKERS\.get\(expectedUrl\)/);
  assert.match(script,/og_description_mismatch/);
  assert.match(script,/redirect:'manual'/);
  assert.match(script,/http:\/\/zgmini\.kr\/recession\//);
  assert.match(script,/SEO_HEALTH_REDIRECT_PASS=/);
  assert.match(script,/lastmod_missing:/);
  assert.match(script,/SEO_HEALTH_PASS=/);
});

test('guide HTTP response validation catches unindexable headers and canonical redirects',()=>{
 const url='https://zgmini.kr/guides/fear-greed-buying/';
 const normal={status:200,contentType:'text/html; charset=utf-8',xRobotsTag:'',finalUrl:url};
 assert.deepEqual(inspectCrawlResponse(normal,url,{requireOriginalUrl:true}),[]);
 for(const header of ['noindex','googlebot: noindex','noindex, nofollow','none','noarchive, noindex']){
  assert.ok(inspectCrawlResponse({...normal,xRobotsTag:header},url).includes('x_robots_tag_blocked:'+header),header);
 }
 assert.deepEqual(inspectCrawlResponse({...normal,xRobotsTag:'index, follow'},url),[]);
 assert.deepEqual(inspectCrawlResponse({...normal,status:403,contentType:'text/plain',finalUrl:'https://zgmini.kr/blocked'},url,{requireOriginalUrl:true}),[
  'http_403','content_type:text/plain','url_redirected:https://zgmini.kr/blocked',
 ]);
});

test('homepage and USA/Korea public HTML must contain an actual anchor to the buying guide',()=>{
 assert.deepEqual(inspectGuideInboundLink('<a href="/guides/fear-greed-buying/">매수 판단 가이드</a>'),[]);
 assert.deepEqual(inspectGuideInboundLink('<script>"/guides/fear-greed-buying/"</script>'),['guide_inbound_link_missing']);
 assert.deepEqual(inspectGuideInboundLink('<span>매수 판단 가이드</span>'),['guide_inbound_link_missing']);
 const footer=readFileSync('components/site-footer.tsx','utf8');
 const usa=readFileSync('app/fear-greed/usa/page.tsx','utf8');
 const korea=readFileSync('app/fear-greed/korea/page.tsx','utf8');
 for(const [name,source] of [['footer',footer],['USA',usa],['Korea',korea]]){
  assert.ok(source.includes('href="/guides/fear-greed-buying/"'),name);
 }
 const health=readFileSync('scripts/seo-production-health.mjs','utf8');
 assert.match(health,/GUIDE_LINK_SOURCES=new Set\(\['\/', '\/fear-greed\/usa\/', '\/fear-greed\/korea\/'\]\)/);
 assert.match(health,/inspectGuideInboundLink\(response\.text\)/);
 assert.match(health,/for\(const path of GUIDE_DIRECT_CHECK_PATHS\)/);
 assert.match(health,/SEO_HEALTH_GUIDE_BARE_PASS/);
});

test('buying guide HTML contract checks substantial visible copy, not only a description tag',()=>{
 const url='https://zgmini.kr/guides/fear-greed-buying/';
 const markers=SEO_RUNTIME_MARKERS.get(url)?.htmlIncludes;
 assert.deepEqual(markers,['매수 전 판단 3단계','상황별 확인 포인트','내용 확인일 2026-10-25']);
 const guide=readFileSync('app/guides/fear-greed-buying/page.tsx','utf8');
 for(const marker of markers)assert.ok(guide.includes(marker),'expected visible '+marker);
 const desc=SEO_RUNTIME_MARKERS.get(url).descriptionIncludes;
 const html=detailHtml.replaceAll(detailUrl,url).replaceAll(detailDescription,desc).replace('</body>',markers.map(marker=>'<p>'+marker+'</p>').join('')+'<script type="application/ld+json">{"@type":"Article"}</script></body>');
 assert.deepEqual(inspectHtml(html,url).errors,[]);
 for(const marker of markers)assert.ok(inspectHtml(html.replace('<p>'+marker+'</p>',''),url).errors.includes('html_stale:'+marker));
});

test('all guide SEO metadata shares an existing public social preview image without changing canonical',()=>{
 const shell=readFileSync('app/guides/guide-page.tsx','utf8');
 assert.match(shell,/const image='https:\/\/zgmini\.kr\/zgmini-share\.png'/);
 assert.match(shell,/images:\[\{url:image,width:1200,height:630/);
 assert.match(shell,/twitter:\{card:'summary_large_image',title:fullTitle,description,images:\[image\]\}/);
 assert.match(shell,/alternates:\{canonical:url\},robots:\{index:true,follow:true\}/);
});

test('outbreak has a self-canonical server document and a distinct SEO contract',()=>{
 const page=readFileSync('app/outbreak/page.tsx','utf8');
 const contract=SEO_RUNTIME_MARKERS.get('https://zgmini.kr/outbreak/');
 assert.ok(contract);
 assert.match(page,/alternates:\{canonical:url\}/);
 assert.match(page,/robots:\{index:true,follow:true\}/);
 assert.match(page,/WebPageJsonLd/);
 assert.ok(contract.htmlIncludes.includes('아웃브레이크'));
 assert.ok(readFileSync('public/sitemap.xml','utf8').includes('<loc>https://zgmini.kr/outbreak/</loc>'));
 const script=readFileSync('scripts/seo-production-health.mjs','utf8');
 assert.match(script,/SEO_HEALTH_OUTBREAK_BARE_PASS/);
 assert.match(script,/\?view=scenarios/);
});
