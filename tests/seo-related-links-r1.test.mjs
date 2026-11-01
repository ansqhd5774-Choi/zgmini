import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('R1 related analysis links follow the planned topic graph',()=>{
  const guide=read('app/detail-reading-guide.tsx');
  const expected=[
    ['/fear-greed/usa/','미국 CNN 공포탐욕지수'],
    ['/sector-fear-greed/','미국 섹터별 공포·탐욕 지수'],
    ['/guides/cpi-pce-release/','CPI·PCE 발표 가이드'],
    ['/guides/fomc/','FOMC 가이드'],
    ['/recession/','미국 경기침체 지표'],
    ['/credit-risk/','회사채·신용 위험 지표'],
    ['/liquidity-crisis/','유동성 위기 지표'],
    ['/debt-risk/','부채 위험 지표'],
  ];
  for(const [href,label] of expected){
    assert.ok(guide.includes(`href:"${href}",label:"${label}"`),`${href} ${label}`);
  }
  assert.match(guide,/\.slice\(0,4\)/);
  assert.match(guide,/relatedLinks\.length>0/);
});

test('duplicate page-level related navs are suppressed for R1 pages',()=>{
  const guide=read('app/detail-reading-guide.tsx');
  for(const title of [
    '한국 지수의 출처와 관측일',
    '미국 공포탐욕지수 확인 순서',
    '미국 인플레이션 점수를 읽는 방법',
    '미국 경기침체 지표와 방어점수를 읽는 방법',
  ]){
    assert.ok(guide.includes(`"${title}":[]`),title);
  }
});
