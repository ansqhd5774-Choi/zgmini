import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ECONOMIC_DETAIL_CATALOG} from '../lib/economic-detail-catalog.ts';

const read=file=>readFileSync(file,'utf8');
test('economic search explanations distinguish names and abbreviations without promising raw rates or probabilities',()=>{
 const cases={inflation:['소비자물가지수(CPI)','개인소비지출 물가지수(PCE)'],employment:['비농업고용(NFP)','신규 실업수당'],rates:['연방기금금리','연준(Fed)'],credit:['투자등급(IG)','하이일드(HY)'],growth:['실물경기','경기침체 위험 진단과 구분'],consumption:['실질 개인소비지출(PCE)','소비 지출과 PCE 물가지수는 다른 통계'],earnings:['주당순이익(EPS)','실적 침체 위험 진단과 구분'],liquidity:['통화량(M2)','재무부 일반계정(TGA)','익일 역레포(ON RRP)'],fundFlows:['fund flows','관측 주기'],breadth:['market breadth','상승 종목'],dollarFx:['달러 종합지수','원·달러 환율 자체와는 다른 자료'],commodities:['서부텍사스산 원유(WTI)','브렌트유(Brent)']};
 for(const detail of ECONOMIC_DETAIL_CATALOG){
  for(const term of cases[detail.id])assert.ok(detail.description.includes(term),detail.id+': '+term);
  assert.doesNotMatch(detail.description,/실시간|수익 보장|확정 매수/);
 }
});
test('sector and theme describe their own published ETF models and do not treat planned themes as available',()=>{
 for(const file of ['app/sector-fear-greed/page.tsx','app/theme-fear-greed/page.tsx']){
  const s=read(file);assert.match(s,/공포탐욕지수/);assert.match(s,/공탐 지수/);assert.match(s,/ETF 기반/);
 }
 const theme=read('app/theme-fear-greed/page.tsx');
 assert.match(theme,/준비 중인 항목은 점수를 제공하지 않습니다/);
 assert.doesNotMatch(theme,/30개.*점수를 제공합니다/);
});
test('search coverage document accounts for every public route without creating keyword-only duplicates',()=>{
 const sitemap=read('public/sitemap.xml'),doc=read('docs/SEARCH_INTENT_COVERAGE.md');
 const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 assert.equal(urls.length,34);
 for(const url of urls)assert.ok(doc.includes('`'+new URL(url).pathname+'`'),url);
 assert.match(doc,/제출·색인·검색 순위를 구분/);
});
