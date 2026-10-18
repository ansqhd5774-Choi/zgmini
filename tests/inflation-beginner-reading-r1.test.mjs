import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");
const page=read("app/inflation/page.tsx");
const notes=read("app/detail-investor-notes.tsx");
const guide=read("app/detail-reading-guide.tsx");
const css=read("app/inflation/inflation-beginner-reading-r1.css");

test("inflation, recession, liquidity and credit retain scoped beginner card design without affecting other pages",()=>{
 assert.match(page,/import "\.\/inflation-beginner-reading-r1\.css";/);
 assert.match(page,/variant="beginner"/);
 assert.match(notes,/variant=\{topic==="inflation"\|\|topic==="recession"\|\|topic==="liquidity-crisis"\|\|topic==="credit-risk"\?"beginner":"default"\}/);
 assert.match(guide,/variant\?:"default"\|"beginner"/);
 assert.match(guide,/if\(variant==="beginner"\)/);
 assert.match(guide,/return <section className="mt-12 space-y-6/);
 assert.match(css,/\.zg-beginner-reading-item\{/);
 assert.match(css,/\.zg-beginner-reading-links\{/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.doesNotMatch(css,/\.fg-card\b|\.cnn-panel\b|\.inflation-target-card\b|\.recharts/);
});

test("reading text explains scoring, rates, dates, labels and stock-market limits for first-time investors",()=>{
 for(const phrase of [
  "70점이면 물가가 70% 오른 건가요?",
  "점수가 높을수록 안정적인 쪽",
  "미국 물가가 주식과 무슨 관계가 있나요?",
  "그 자체가 매도 신호는 아니에요",
  "처음 발표됐을 때 저장한 자료",
 ]){
  assert.ok(page.includes(phrase),phrase);
 }
 for(const phrase of [
  "CPI와 PCE는 어떤 숫자인가요?",
  "전체 물가와 근원 물가는 뭐가 다른가요?",
  "전년 대비(YoY)는 1년 전",
  "3개월 연율",
  "긍정·중립·부정 색",
  "저장된 평가 점수로 결정돼요",
  "'—'는 0이 아니라",
  "홈페이지 12개 주요 지표",
 ]){
  assert.ok(notes.includes(phrase),phrase);
 }
 assert.match(notes,/topic==="inflation"\)\?\[\]:\[/);
});

test("source links are visibly purposeful cards and related links preserve SEO contracts",()=>{
 for(const url of [
  "https://www.bls.gov/cpi/",
  "https://www.bea.gov/data/personal-consumption-expenditures-price-index",
  "https://www.bls.gov/schedule/news_release/cpi.htm",
  "https://www.bea.gov/news/schedule",
 ]){
  assert.ok((page+notes).includes(url),url);
 }
 assert.match(guide,/className="zg-beginner-reading-link"/);
 assert.match(guide,/<ExternalLink size=\{16\}/);
 assert.match(guide,/<BookOpen size=\{16\}/);
 assert.match(guide,/target="_blank" rel="noopener noreferrer"/);
 assert.match(guide,/aria-label="함께 읽을 지표"/);
 assert.match(guide,/seoRelatedOverrides\[title\]\?\.slice\(0,4\)\?\?related\.slice\(0,4\)/);
 assert.match(css,/\.zg-beginner-reading-link:focus-visible/);
 assert.match(css,/min-height:62px/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
});
