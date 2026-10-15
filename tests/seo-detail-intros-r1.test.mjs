import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('R1 detail pages expose search-intent intro copy without changing data logic',()=>{
  const intro=read('app/search-intent-intro.tsx');
  assert.match(intro,/미국 회사채 시장의 신용 위험과 기업 자금조달 환경/);
  assert.match(intro,/미국 금융시장의 현금 부족과 유동성 위기 위험/);
  assert.match(intro,/미국 가계와 기업의 부채 부담을 DSR, 부채\/GDP/);
  assert.match(intro,/미국 CPI·근원 CPI·PCE·근원 PCE와 기대물가/);
  assert.match(intro,/미국 경기침체 위험을 고용, 실질 GDP, 산업생산/);

  const pages={
    'credit-risk':'app/credit-risk/page.tsx',
    'liquidity-crisis':'app/liquidity-crisis/page.tsx',
    'debt-risk':'app/debt-risk/page.tsx',
    inflation:'app/inflation/page.tsx',
    recession:'app/recession/page.tsx',
  };
  for(const [topic,path] of Object.entries(pages)){
    const page=read(path);
    assert.match(page,/SearchIntentIntro/);
    assert.ok(page.includes(`<SearchIntentIntro topic="${topic}"/>`),topic);
  }
});

test('R1 detail page lastmod remains tied to the 2026-10-16 content update',()=>{
  const sitemap=read('public/sitemap.xml');
  for(const path of ['/credit-risk/','/liquidity-crisis/','/debt-risk/','/inflation/','/recession/']){
    assert.ok(sitemap.includes(`<loc>https://zgmini.kr${path}</loc><lastmod>2026-10-16</lastmod>`),path);
  }
});
