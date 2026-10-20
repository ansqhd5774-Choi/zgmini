import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('technical SEO sitemap includes every public route with truthful lastmod values',()=>{
  const sitemap=read('public/sitemap.xml');
  assert.equal((sitemap.match(/<url>/g)||[]).length,31);
  for(const route of ['/risk-indicators/','/economic-indicators/','/theme-fear-greed/']){
    assert.ok(sitemap.includes(`<loc>https://zgmini.kr${route}</loc><lastmod>2026-10-18</lastmod>`),route);
  }
  for(const route of ['/fear-greed/korea/','/sector-fear-greed/','/guides/cpi-pce-release/','/guides/fomc/'])
    assert.ok(sitemap.includes(`<loc>https://zgmini.kr${route}</loc><lastmod>2026-10-16</lastmod>`),route);
  for(const route of ['/credit-risk/','/earnings-recession/','/asset-bubble/','/debt-risk/','/supply-shock/'])
    assert.ok(sitemap.includes(`<loc>https://zgmini.kr${route}</loc><lastmod>2026-10-20</lastmod>`),route);
  assert.ok(sitemap.includes('<loc>https://zgmini.kr/stagflation-risk/</loc><lastmod>2026-10-21</lastmod>'));
  assert.ok(sitemap.includes('<loc>https://zgmini.kr/inflation/</loc><lastmod>2026-10-18</lastmod>'),'/inflation/');
  assert.ok(sitemap.includes('<loc>https://zgmini.kr/recession/</loc><lastmod>2026-10-18</lastmod>'),'/recession/');
  for(const route of ['/fear-greed/usa/','/guides/fear-greed-buying/'])
    assert.ok(sitemap.includes(`<loc>https://zgmini.kr${route}</loc><lastmod>2026-10-07</lastmod>`),route);
});

test('sector detail has dedicated social metadata and WebPage schema',()=>{
  const page=read('app/sector-fear-greed/page.tsx');
  assert.match(page,/openGraph:\{title,description,url,type:'website',siteName:'ZGmini'/);
  assert.match(page,/twitter:\{card:'summary_large_image',title,description,images:\[image\]\}/);
  assert.match(page,/robots:\{index:true,follow:true\}/);
  assert.match(page,/<WebPageJsonLd/);
  assert.match(page,/aria-label="관련 분석"/);
});

test('market details share WebPage JSON-LD and related links are capped at four',()=>{
  const notes=read('app/detail-investor-notes.tsx');
  const guide=read('app/detail-reading-guide.tsx');
  assert.match(notes,/WebPageJsonLd/);
  assert.match(notes,/path=\{paths\[topic\]\}/);
  assert.match(guide,/related\.slice\(0,4\)/);
});

test('all three search guides emit Article structured data with truthful publication and modification dates',()=>{
  const shell=read('app/guides/guide-page.tsx');
  const jsonld=read('app/seo-jsonld.tsx');
  assert.match(shell,/ArticleJsonLd/);
  assert.match(shell,/WebPageJsonLd/);
  assert.match(shell,/datePublished='2026-10-07'/);
  assert.match(shell,/dateModified='2026-10-07'/);
  assert.match(shell,/datePublished=\{datePublished\}/);
  assert.match(shell,/dateModified=\{dateModified\}/);
  assert.match(jsonld,/datePublished,/);
  assert.match(jsonld,/dateModified,/);

  const fear=read('app/guides/fear-greed-buying/page.tsx');
  const cpi=read('app/guides/cpi-pce-release/page.tsx');
  const fomc=read('app/guides/fomc/page.tsx');
  assert.match(fear,/const path='\/guides\/fear-greed-buying\/'/);
  assert.doesNotMatch(fear,/dateModified=/);
  assert.match(cpi,/const path='\/guides\/cpi-pce-release\/'/);
  assert.match(cpi,/미국 CPI·PCE 발표 일정·한국시간 \| 예상치 대비 결과 읽는 법/);
  assert.match(cpi,/dateModified="2026-10-16"/);
  assert.match(fomc,/const path='\/guides\/fomc\/'/);
  assert.match(fomc,/FOMC 일정·한국시간 \| 미국 기준금리 발표 읽는 법/);
  assert.match(fomc,/dateModified="2026-10-16"/);
});

test('homepage structured data strengthens ZGmini site and organization identity',()=>{
  const layout=read('app/layout.tsx');
  assert.match(layout,/alternateName: \["지그미니", "zgmini\.kr"\]/);
  assert.match(layout,/"https:\/\/shareyourstartup\.com\/s\/zgmini"/);
  assert.match(layout,/"https:\/\/twelve\.tools\/zgmini-kr"/);
  assert.doesNotMatch(layout,/thesaasdir/i);
});

test('robots policy remains unchanged and meta keywords are not introduced',()=>{
  const robots=read('public/robots.txt');
  assert.match(robots,/Sitemap: https:\/\/zgmini\.kr\/sitemap\.xml/);
  const checked=[
    'app/layout.tsx','app/sector-fear-greed/page.tsx','app/guides/guide-page.tsx','app/detail-investor-notes.tsx',
  ];
  for(const file of checked) assert.doesNotMatch(read(file),/\bkeywords\s*:/i,file);
});
