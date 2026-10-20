import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

const cases=[
  ['app/credit-risk/page.tsx','미국 신용위험 지수 | 회사채 스트레스·신용시장 위험 - ZGmini',['회사채 시장의 신용위험','기업 자금조달 스트레스','HY·IG·Total CMDI']],
  ['app/liquidity-crisis/page.tsx','미국 유동성 위기 지표 | Repo·은행 준비금·TGA·M2 - ZGmini',['현금 부족','단기자금시장','ON RRP']],
  ['app/debt-risk/page.tsx','미국 부채위험 지수 | 가계·기업 부채·DSR·금리부담 - ZGmini',['가계와 기업의 부채 부담','민간부채/GDP','부채상환능력','과거 완성 점수 이력은 저장된 경우에만']],
  ['app/recession/page.tsx','미국 경기침체 지표 | 실업률·GDP·Sahm Rule·장단기 금리차 - ZGmini',['실업률·Sahm Rule','실질 GDP','장단기 금리차','경기침체 확률이 아니']],
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

test('inflation keeps specific Core/Headline CPI-PCE coverage alongside the accessible meta description',()=>{
  const file='app/inflation/page.tsx';
  const page=read(file);
  const panel=read('app/inflation/inflation-panel.tsx');
  assert.ok(page.includes('const title="미국 인플레이션 위험 지표 | 재가속·지속성·7개 평가 축 - ZGmini";'));
  assert.ok(page.includes('미국 인플레이션 압력과 재가속·지속성 위험'));
  assert.ok(page.includes('16개 입력지표와 저장된 1년 추이'));
  for(const name of ['Core CPI','Core PCE','Headline PCE'])assert.ok(panel.includes('label:"'+name+'"'),name);
  assert.ok(panel.includes('생산자물가'));
  assert.ok(panel.includes('임금'));
  assert.ok(panel.includes('에너지'));
  assert.match(page,/alternates:\{canonical:url\}/);
  assert.match(page,/robots:\{index:true,follow:true\}/);
  assert.match(page,/openGraph:\{title,description,url,type:"website",siteName:"ZGmini"/);
  assert.match(page,/twitter:\{card:"summary_large_image",title,description/);
  assert.doesNotMatch(page,/\bkeywords\s*:/i);
});
