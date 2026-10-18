import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=file=>readFileSync(file,"utf8");
const page=read("app/liquidity-crisis/page.tsx");
const panel=read("app/liquidity-crisis/liquidity-crisis-panel.tsx");
const intro=read("app/search-intent-intro.tsx");
const notes=read("app/detail-investor-notes.tsx");
const inflation=read("app/inflation/page.tsx");
const recession=read("app/recession/page.tsx");
test("liquidity intro follows the same concise heading pattern as inflation and recession",()=>{
 assert.match(intro,/if\(topic==="liquidity-crisis"\)/);
 assert.match(intro,/미국 금융시장, <span className="text-sky-300">유동성 위기는\?<\/span>/);
 assert.match(intro,/미국 금융시장의 현금 부족과 유동성 위기 위험/);
 assert.match(page,/<SearchIntentIntro topic="liquidity-crisis"\/>/);
 assert.match(inflation,/<SearchIntentIntro topic="inflation"\/>/);
 assert.match(recession,/<SearchIntentIntro topic="recession"\/>/);
});
test("liquidity lower guide uses approved beginner card presentation without losing SEO and related links",()=>{
 assert.match(notes,/topic==="liquidity-crisis"\|\|topic==="credit-risk"\?"beginner":"default"/);
 assert.match(notes,/유동성 위기 표, 쉽게 알아보기/);
 assert.match(notes,/WebPageJsonLd/);
 assert.match(notes,/"liquidity-crisis":\{title:"시장 유동성과 유동성 위기 점수 읽기"/);
 assert.match(page,/import "\.\.\/inflation\/inflation-beginner-reading-r1\.css"/);
 assert.match(page,/<DetailInvestorNotes topic="liquidity-crisis"\/>/);
});
test("liquidity lower-page order matches inflation and recession: table, return CTA, 4-card introduction, sources, topic notes",()=>{
 assert.match(panel,/<a className="cnn-return-cta" href="\/">← 메인 대시보드로 돌아가기<\/a>/);
 assert.ok(panel.indexOf('liquidity-r2-mobile-list')<panel.indexOf('className="cnn-return-cta"'));
 assert.match(page,/import DetailReadingGuide from "\.\.\/detail-reading-guide"/);
 assert.ok(page.indexOf('<RiskDetailBeginnerLayout>')<page.indexOf('<DetailReadingGuide title="미국 유동성 위기 방어점수를 읽는 방법"'));
 assert.ok(page.indexOf('<DetailReadingGuide title="미국 유동성 위기 방어점수를 읽는 방법"')<page.indexOf('<DetailInvestorNotes topic="liquidity-crisis"/>'));
 assert.match(page,/displayTitle="미국 유동성 위기 점수, 처음이라면 이렇게 보세요"/);
 assert.match(page,/variant="beginner"/);
 assert.equal((page.match(/\{title:"[^"]+\?",text:/g)||[]).length,4);
 for(const target of ["https://www.newyorkfed.org/markets/reference-rates/additional-information-about-reference-rates","https://www.federalreserve.gov/releases/h41/default.htm","https://www.financialresearch.gov/short-term-funding-monitor/datasets/repo/"])assert.ok(page.includes(target),target);
 assert.equal((page.match(/메인 대시보드로 돌아가기/g)||[]).length,0);
 assert.equal((panel.match(/메인 대시보드로 돌아가기/g)||[]).length,1);
 const inflation=read("app/inflation/inflation-panel.tsx"),recession=read("app/recession/recession-panel.tsx");
 assert.match(inflation,/className="cnn-return-cta"/);
 assert.match(recession,/className="cnn-return-cta"/);
 assert.match(read("app/inflation/page.tsx"),/displayTitle="미국 물가 점수, 처음이라면 이렇게 보세요"/);
 assert.match(read("app/recession/page.tsx"),/displayTitle="미국 경기침체 점수, 처음이라면 이렇게 보세요"/);
});
test("saved liquidity score, 13 indicators and 5 candidates remain intact",()=>{
 assert.match(panel,/useStoredIndex<Payload>\('\/api\/liquidity-crisis-detail'\)/);
 assert.match(panel,/const order=\["sofrIorb","obfrIorb","repoGap"/);
 assert.match(panel,/const dev=\[/);
 assert.match(panel,/comparisonItems=\{scoreComparisonItems\}/);
});

test("liquidity explanatory content stays scoped to existing approved score and inputs",()=>{
 for(const phrase of ["방어점수","Repo","은행 준비금","예상 일정은 실제 공표일과 달라질 수 있고","‘—’는 0이 아니라"])assert.ok(page.includes(phrase),phrase);
 assert.match(page,/<DetailInvestorNotes topic="liquidity-crisis"\/>/);
 assert.match(panel,/useStoredIndex<Payload>\('\/api\/liquidity-crisis-detail'\)/);
 assert.match(panel,/const order=\["sofrIorb","obfrIorb","repoGap"/);
 assert.match(panel,/const dev=\[/);
});
