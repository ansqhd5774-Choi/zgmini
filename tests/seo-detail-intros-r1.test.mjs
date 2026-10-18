import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('R2 detail pages expose search-intent intro copy without changing data logic',()=>{
  const intro=read('app/search-intent-intro.tsx');
  assert.match(intro,/미국 회사채 시장의 신용 위험과 기업 자금조달 환경/);
  assert.match(intro,/미국 금융시장의 현금 부족과 유동성 위기 위험/);
  assert.match(intro,/미국 가계와 기업의 부채 부담을 DSR, 부채\/GDP/);
  assert.match(intro,/미국 물가가 얼마나 빠르게 오르고 있는지/);
  assert.match(intro,/소비자물가\(CPI\)와 개인소비지출 물가\(PCE\)/);
  assert.match(intro,/미국 경기침체 지표를 실업률 기반 Sahm Rule, 비농업고용, 실질 GDP, 산업생산/);
  assert.match(intro,/미국 기업 실적의 둔화와 침체 위험을 EPS 성장, 매출 성장/);
  assert.match(intro,/미국 자산시장의 버블 위험을 밸류에이션 압력, 가격가속/);
  assert.match(intro,/미국 공급 충격 위험을 공급망 압력과 유가·원자재 변화/);

  const pages={
    'credit-risk':'app/credit-risk/page.tsx',
    'liquidity-crisis':'app/liquidity-crisis/page.tsx',
    'debt-risk':'app/debt-risk/page.tsx',
    inflation:'app/inflation/page.tsx',
    recession:'app/recession/page.tsx',
    'earnings-recession':'app/earnings-recession/page.tsx',
    'asset-bubble':'app/asset-bubble/page.tsx',
    'supply-shock':'app/supply-shock/page.tsx',
  };
  for(const [topic,path] of Object.entries(pages)){
    const page=read(path);
    assert.match(page,/SearchIntentIntro/);
    assert.ok(page.includes(`<SearchIntentIntro topic="${topic}"/>`),topic);
  }
});

test('R2 detail page lastmod stays truthful per content update date',()=>{
  const sitemap=read('public/sitemap.xml');
  for(const path of ['/credit-risk/','/liquidity-crisis/','/debt-risk/','/inflation/','/earnings-recession/','/asset-bubble/','/supply-shock/']){
    assert.ok(sitemap.includes(`<loc>https://zgmini.kr${path}</loc><lastmod>2026-10-16</lastmod>`),path);
  }
  assert.ok(sitemap.includes('<loc>https://zgmini.kr/recession/</loc><lastmod>2026-10-17</lastmod>'),'recession');
});
