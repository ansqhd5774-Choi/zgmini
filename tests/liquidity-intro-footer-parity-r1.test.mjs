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
 assert.match(notes,/topic==="liquidity-crisis"\?"beginner":"default"/);
 assert.match(notes,/유동성 위기 표, 쉽게 알아보기/);
 assert.match(notes,/WebPageJsonLd/);
 assert.match(notes,/"liquidity-crisis":\{title:"시장 유동성과 유동성 위기 점수 읽기"/);
 assert.match(page,/import "\.\.\/inflation\/inflation-beginner-reading-r1\.css"/);
 assert.match(page,/<DetailInvestorNotes topic="liquidity-crisis"\/>/);
});
test("single subdued navigation link comes after the notes rather than as full-width CTA before them",()=>{
 assert.doesNotMatch(panel,/cnn-return-cta/);
 assert.ok(page.indexOf('<DetailInvestorNotes topic="liquidity-crisis"/>')<page.indexOf('href="/">← 메인 대시보드로 돌아가기</a>'));
 assert.equal((page.match(/메인 대시보드로 돌아가기/g)||[]).length,1);
 assert.doesNotMatch(page,/cnn-return-cta/);
});
test("saved liquidity score, 13 indicators and 5 candidates remain intact",()=>{
 assert.match(panel,/useStoredIndex<Payload>\('\/api\/liquidity-crisis-detail'\)/);
 assert.match(panel,/const order=\["sofrIorb","obfrIorb","repoGap"/);
 assert.match(panel,/const dev=\[/);
 assert.match(panel,/comparisonItems=\{scoreComparisonItems\}/);
});
