import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");
const page=read("app/inflation/page.tsx");
const notes=read("app/detail-investor-notes.tsx");
const renderer=read("app/detail-reading-guide.tsx");
const panel=read("app/inflation/inflation-panel.tsx");
const method=read("app/beginner-risk-guide.tsx");
const intro=read("app/search-intent-intro.tsx");
const css=read("app/inflation/inflation-beginner-reading-r1.css");

test("all chosen bold/highlight phrases occur verbatim in their own displayed sentences",()=>{
 const sectionPattern=/text:"([^"]+)",highlight:"([^"]+)",bold:"([^"]+)"/g;
 const items=[...page.matchAll(sectionPattern),...notes.matchAll(sectionPattern)];
 assert.equal(items.length,10);
 for(const [,text,highlight,bold] of items){
  assert.ok(text.includes(highlight),`highlight missing: ${highlight}`);
  assert.ok(text.includes(bold),`bold missing: ${bold}`);
  assert.ok(highlight.length<45,"no full-paragraph highlighter");
  assert.doesNotMatch(highlight,/보장|확정|확률|매도|아니에요|않아/);
 }
 assert.match(renderer,/function BeginnerEmphasis\(/);
 assert.match(renderer,/<mark key=\{parts.length\} className="zg-beginner-reading-mark">/);
 assert.match(renderer,/<strong key=\{parts.length\} className="zg-beginner-reading-strong">/);
 assert.match(renderer,/if\(variant==="beginner"\)/);
 assert.match(renderer,/<p>\{section.text\}<\/p>/); // other details remain untouched
});

test("inflation risk terminology separates R2 scoring, annualization, and missing observations",()=>{
 for(const term of [
  "점수 60이면 인플레이션 위험이 60%인가요?",
  "물가상승률이나 위험 발생 확률이 아닙니다.",
  "기조 물가가 재가속",
  "3개월 동안 1% 올랐다면 연율로는 약 4%",
  "'—'는 결측이며 0이 아닙니다",
  "과거 중앙값",
  "저장된 초기발표 자료",
 ])assert.ok((page+notes).includes(term),term);
 assert.match(panel,/zg-inflation-keymark/);
 assert.match(panel,/기조 물가의 재가속과 압력이 오래 지속될 신호/);
 assert.match(panel,/16개 입력지표를 7개 영역/);
 assert.match(intro,/미국 인플레이션, <span className="text-sky-300">압력이 커지고 있을까\?<\/span>/);
 assert.match(intro,/기조 물가의 재가속·지속 압력을 7개 위험 평가 축/);
 assert.match(page,/인플레이션 압력과 재가속·지속성 위험을 7개 평가 축/);
});

test("highlights stay scoped, sparse, and readable on wrapped mobile lines",()=>{
 assert.match(page,/import "\.\/inflation-beginner-reading-r1\.css";/);
 assert.match(css,/\.zg-beginner-reading-mark,/);
 assert.match(css,/\.inflation-explainer \.zg-inflation-keymark/);
 assert.match(css,/box-decoration-break:clone/);
 assert.match(css,/background:linear-gradient\(transparent 54%,rgba\(244,195,78,\.28\) 54%\)/);
 assert.doesNotMatch(css,/\.fg-card|\.recharts|overflow:hidden/);
 assert.match(panel,/<MarketFearGreedChart showExtrema data=\{trend\}/);
 assert.match(method,/reportedMethodologyVersion\(topic,payload\)/);
 assert.match(method,/item\.version===currentVersion/);
});

test("verified R2 history remains six entries and no data or calculation contract is changed",()=>{
 const timeline=method.split(" inflation:[")[1]?.split('\n ],\n "supply-shock"')[0]??"";
 assert.equal([...timeline.matchAll(/version:"INFLATION_R2_R29_56",date:/g)].length,6);
 assert.match(method,/validBeginnerCopy\(payload\?\.beginnerCopy\)/);
 assert.match(panel,/const featureOrder=\[/);
 assert.match(panel,/const releaseSchedules:/);
 assert.match(panel,/const featureMeta:/);
});
