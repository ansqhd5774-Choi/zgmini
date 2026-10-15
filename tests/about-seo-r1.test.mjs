import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

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

test('About metadata update has a truthful sitemap lastmod',()=>{
  const sitemap=read('public/sitemap.xml');
  assert.match(sitemap,/https:\/\/zgmini\.kr\/about\/<\/loc><lastmod>2026-10-16<\/lastmod>/);
});
