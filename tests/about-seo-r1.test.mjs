import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('About page owns its canonical and social metadata',()=>{
  const page=read('app/about/page.tsx');
  assert.match(page,/const title='ZGMINI 소개 \| 시장 심리와 경제지표'/);
  assert.match(page,/const url='https:\/\/zgmini\.kr\/about\/'/);
  assert.match(page,/alternates: \{ canonical: url \}/);
  assert.match(page,/openGraph: \{ title, description, url/);
  assert.match(page,/twitter: \{ card: 'summary_large_image', title, description/);
  assert.match(page,/robots: \{ index: true, follow: true \}/);
});

test('About page keeps only currently verified directory links',()=>{
  const page=read('app/about/page.tsx');
  assert.match(page,/https:\/\/shareyourstartup\.com\/s\/zgmini/);
  assert.match(page,/https:\/\/www\.sitelike\.org\/similar\/zgmini\.kr\//);
  assert.match(page,/https:\/\/twelve\.tools\/zgmini-kr/);
  assert.doesNotMatch(page,/thesaasdir\.com/);
});

test('About uses the developer introduction route, not the legacy static HTML',()=>{
  const page=read('app/about/page.tsx');
  assert.equal(existsSync('public/about.html'),false);
  assert.match(page,/2016년부터 주식 투자를 시작했습니다/);
  assert.match(page,/제가 편하자고/);
  assert.match(page,/여러분 모두 부자 되세요!/);
  assert.match(page,/시장 대시보드 보기/);
  assert.match(page,/href="\/"/);
});

test('About metadata update has a truthful sitemap lastmod',()=>{
  const sitemap=read('public/sitemap.xml');
  assert.match(sitemap,/https:\/\/zgmini\.kr\/about\/<\/loc><lastmod>2026-10-22<\/lastmod>/);
});
