import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('R2 detail pages expose search-intent intro copy without changing data logic',()=>{
  const intro=read('app/search-intent-intro.tsx');
  assert.match(intro,/미국 회사채 시장의 신용 위험과 기업 자금조달 환경/);
  assert.match(intro,/미국 금융시장의 현금 부족과 유동성 위기 위험/);
  assert.match(intro,/미국 가계와 기업의 부채 부담을 DSR, 부채\/GDP/);
  assert.match(intro,/미국 인플레이션, <span className="text-sky-300">압력이 커지고 있을까\?<\/span>/);
  assert.match(intro,/기조 물가의 재가속·지속 압력을 7개 위험 평가 축/);
  assert.match(read("app/inflation/page.tsx"),/CPI·PCE·생산자물가·임금·에너지 등 16개 입력지표/);
  assert.match(intro,/미국 경기, <span className="text-sky-300">침체 신호는\?<\/span>/);
  assert.match(intro,/경기 방어점수와 최근 1년 추세 · 경기침체 확률 아님/);
  assert.match(read("app/recession/page.tsx"),/실업률·Sahm Rule, 비농업고용, 실질 GDP, 산업생산/);
  assert.match(intro,/미국 기업 실적, <span className="text-sky-300">침체 신호는\?<\/span>/);
  assert.match(intro,/8대 위험 지표의 실적 침체 방어 진단입니다. 12대 기업 실적 점수·차트와 구분해 확인하세요/);
  assert.match(intro,/미국 자산시장의 버블 위험을 밸류에이션 압력, 가격가속/);
  assert.match(intro,/미국 공급 충격 위험을 공급망 압력과 유가·원자재 변화/);

  const pages={
    'credit-risk':'app/credit-risk/page.tsx',
    'stagflation-risk':'app/stagflation-risk/page.tsx',
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
  for(const path of ['/credit-risk/','/debt-risk/','/earnings-recession/','/asset-bubble/','/supply-shock/']){
    assert.ok(sitemap.includes(`<loc>https://zgmini.kr${path}</loc><lastmod>2026-10-25</lastmod>`),path);
  }
  assert.ok(sitemap.includes('<loc>https://zgmini.kr/stagflation-risk/</loc><lastmod>2026-10-25</lastmod>'));
  assert.ok(sitemap.includes('<loc>https://zgmini.kr/inflation/</loc><lastmod>2026-10-25</lastmod>'),'inflation');
  assert.ok(sitemap.includes('<loc>https://zgmini.kr/recession/</loc><lastmod>2026-10-25</lastmod>'),'recession');
});

test('inflation search snippet, semantic heading and production freshness marker agree with live intent',()=>{
  const page=read('app/inflation/page.tsx');
  const panel=read('app/inflation/inflation-panel.tsx');
  const health=read('scripts/seo-production-health.mjs');
  const phrase='미국 인플레이션 압력과 재가속·지속성 위험';
  const desc='CPI·PCE·생산자물가·임금·에너지 등 16개 입력지표와 저장된 1년 추이';
  assert.ok(page.includes(phrase), 'beginner-facing meta description topic');
  assert.ok(page.includes(desc), 'description must match actual page contents');
  assert.match(page,/openGraph:\{title,description,url,type:"website"/);
  assert.match(page,/twitter:\{card:"summary_large_image",title,description/);
  assert.match(page,/alternates:\{canonical:url\},robots:\{index:true,follow:true\}/);
  assert.match(panel,/<h1 id="inflation-what-title">인플레이션 압력은 다시 커지고 있을까\?<\/h1>/);
  assert.equal((panel.match(/<h1\b/g)||[]).length,1,'one primary heading');
  assert.ok(health.includes("descriptionIncludes:'미국 인플레이션 압력과 재가속·지속성 위험'"));
  assert.doesNotMatch(page,/\bkeywords\s*:/i);
});
