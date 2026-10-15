import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

const cases=[
  ['app/credit-risk/page.tsx','미국 신용위험 지수 | 회사채 스트레스·신용시장 위험 - ZGmini',['회사채 시장의 신용위험','기업 자금조달 스트레스','HY·IG·Total CMDI']],
  ['app/liquidity-crisis/page.tsx','미국 유동성 위기 지표 | Repo·은행 준비금·TGA·M2 - ZGmini',['현금 부족','단기자금시장','ON RRP']],
  ['app/debt-risk/page.tsx','미국 부채위험 지수 | 가계·기업 부채·DSR·금리부담 - ZGmini',['가계와 기업의 부채 부담','민간부채/GDP','부채상환능력']],
  ['app/inflation/page.tsx','미국 인플레이션 지수 | CPI·PCE·기대물가·물가 추이 - ZGmini',['Core CPI·Core PCE·Headline PCE','기대인플레이션','생산자물가·임금·에너지']],
  ['app/recession/page.tsx','미국 경기침체 지표 | 고용·GDP·생산·소비·신용 분석 - ZGmini',['실질 GDP','산업생산','경기침체 방어점수']],
];

test('high-priority detail pages expose specific search titles and descriptions',()=>{
  for(const [file,title,phrases] of cases){
    const page=read(file);
    assert.ok(page.includes(`const title="${title}";`),file);
    for(const phrase of phrases) assert.ok(page.includes(phrase),`${file}: ${phrase}`);
    assert.match(page,/alternates:\{canonical:url\}/,file);
    assert.match(page,/robots:\{index:true,follow:true\}/,file);
    assert.match(page,/openGraph:\{title,description,url,type:"website",siteName:"ZGmini"/,file);
    assert.match(page,/twitter:\{card:"summary_large_image",title,description/,file);
    assert.doesNotMatch(page,/\bkeywords\s*:/i,file);
  }
});
