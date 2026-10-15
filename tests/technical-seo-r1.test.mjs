import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('technical SEO sitemap includes every public route with truthful lastmod values',()=>{
  const sitemap=read('public/sitemap.xml');
  assert.equal((sitemap.match(/<url>/g)||[]).length,16);
  for(const route of ['/fear-greed/korea/','/sector-fear-greed/','/inflation/','/recession/','/liquidity-crisis/','/credit-risk/','/debt-risk/'])
    assert.ok(sitemap.includes(`<loc>https://zgmini.kr${route}</loc><lastmod>2026-10-16</lastmod>`),route);
  for(const route of ['/fear-greed/usa/','/guides/fear-greed-buying/','/guides/cpi-pce-release/','/guides/fomc/'])
    assert.ok(sitemap.includes(`<loc>https://zgmini.kr${route}</loc><lastmod>2026-10-07</lastmod>`),route);
  for(const route of ['/earnings-recession/','/asset-bubble/','/supply-shock/'])
    assert.ok(sitemap.includes(`<loc>https://zgmini.kr${route}</loc></url>`),route);
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

test('all three search guides emit Article structured data with canonical paths',()=>{
  const shell=read('app/guides/guide-page.tsx');
  assert.match(shell,/ArticleJsonLd/);
  assert.match(shell,/WebPageJsonLd/);
  assert.match(shell,/dateModified="2026-10-07"/);
  for(const [file,path] of [
    ['app/guides/fear-greed-buying/page.tsx','/guides/fear-greed-buying/'],
    ['app/guides/cpi-pce-release/page.tsx','/guides/cpi-pce-release/'],
    ['app/guides/fomc/page.tsx','/guides/fomc/'],
  ]){
    const page=read(file);
    assert.ok(page.includes(`const path='${path}';`),file);
    assert.match(page,/<GuidePage title=\{title\} answer=\{answer\} path=\{path\}>/);
  }
});

test('robots policy remains unchanged and meta keywords are not introduced',()=>{
  const robots=read('public/robots.txt');
  assert.match(robots,/Sitemap: https:\/\/zgmini\.kr\/sitemap\.xml/);
  const checked=[
    'app/layout.tsx','app/sector-fear-greed/page.tsx','app/guides/guide-page.tsx','app/detail-investor-notes.tsx',
  ];
  for(const file of checked) assert.doesNotMatch(read(file),/\bkeywords\s*:/i,file);
});
