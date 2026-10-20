import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// Review-only completeness guard: no formula, API, schema or writer mutations.
const read=path=>readFileSync(path,"utf8");
const intro=read("app/search-intent-intro.tsx");
const page=read("app/earnings-recession/page.tsx");
const panel=read("app/earnings-recession/earnings-recession-panel.tsx");
const css=read("app/earnings-recession/earnings-indicator-r2.css");
const projection=read("worker/projection-builders/earningsRecession.ts");
const writer=read("scripts/pc-writer/earnings-r5-production-cycle-r1.mjs");
const guide=read("app/detail-reading-guide.tsx");

test("R14 detail page uses the same compact intro treatment as four completed peer pages",()=>{
 const kinds=["inflation","recession","credit-risk","liquidity-crisis","earnings-recession"];
 const classes=kinds.map(kind=>{
  const fragment=intro.match(new RegExp('if\\(topic==="'+kind+'"\\)\\{([\\s\\S]*?)return <div className="([^"]+)"'));
  assert.ok(fragment,kind+" intro is not a compact intro");
  return fragment[2];
 });
 assert.equal(new Set(classes).size,1,"earnings intro drifted from the four peer pages");
 assert.match(page,/SearchIntentIntro topic="earnings-recession"/);
 assert.match(page,/RiskDetailBeginnerLayout><EarningsRiskOnlyPanel\/><BeginnerRiskGuide topic="earnings-recession"/);
 assert.doesNotMatch(page,/EarningsRecessionPanel|earnings-recession-panel/);
 assert.match(css,/--fg-title-size:20px/);
 assert.match(css,/--fg-title-size:16px/);
});

test("R14 earnings approved source IDs are identical in writer, projection and desktop/mobile rows",()=>{
 const fromPanel=panel.match(/const r5Order=\[([^\]]+)\] as const/)?.[1]?.match(/"S\d+"/g)?.map(x=>x.slice(1,-1))??[];
 const fromProjection=projection.match(/const R5_IDS=\[([^\]]+)\] as const/)?.[1]?.match(/"S\d+"/g)?.map(x=>x.slice(1,-1))??[];
 const fromWriter=[...writer.matchAll(/ready\('S(\d+)'/g)].map(x=>"S"+x[1]);
 const expected=Array.from({length:13},(_,i)=>"S"+(i+1));
 assert.deepEqual(fromPanel,expected);
 assert.deepEqual(fromProjection,expected);
 assert.deepEqual(fromWriter,expected);
 assert.equal((panel.match(/activeOrder\.map\(id=>/g)??[]).length,2,"desktop and mobile must render the identical saved ID set");
 assert.match(panel,/<th>이전<\/th><th>현재<\/th><th>발표<\/th><th>판단<\/th><th>미니차트\(1Y\)<\/th>/);
 assert.match(panel,/formatTooltipLabel=\{value=>isR5\?/);
});

test("R14 four beginner questions have real emphasis spans and official source links",()=>{
 assert.match(page,/DetailReadingGuide/);
 assert.match(page,/variant="beginner"/);
 assert.match(page,/inflation-beginner-reading-r1\.css/);
 assert.match(guide,/text\.includes\(item\.value\)/);
 const sections=[...page.matchAll(/\{title:"([^"]+)",text:"([^"]+)",highlight:"([^"]+)",bold:"([^"]+)"\}/g)];
 assert.equal(sections.length,4);
 for(const [full,title,body,highlight,bold] of sections){
  assert.ok(full.length>0&&title.length>0);
  assert.ok(body.includes(highlight),title+": highlight silently dropped");
  assert.ok(body.includes(bold),title+": bold silently dropped");
 }
 for(const domain of ["www.sec.gov/edgar/search/"]){
  assert.ok(page.includes(domain),"Missing official source "+domain);
 }
 assert.match(page,/서로 다른 산식을 사용하므로 혼합하면 안 됩니다/);
 assert.match(page,/동일 산식과 저장 출처가 검증된 진단 점수만 사용합니다/);
 assert.match(page,/economic-indicators\/earnings/);
 assert.doesNotMatch(page,/E1-R5 과거 차트|사후 재구성한 결과/);
 assert.doesNotMatch(page,/현재 실적 안전점수와 관측일/);
});

test("R14 cannot treat composite reconstruction as individual observation history or release metadata",()=>{
 assert.match(projection,/observationDate:x\?\.asOfDate/);
 assert.match(projection,/trend:Array\.isArray\(e1\?\.trend\)/);
 assert.match(projection,/checkedSourceObservation/);
 assert.match(projection,/x\?\.id!=="S6"&&x\?\.id!=="S11"/);
 assert.match(projection,/verifiedUpcomingSourceRelease/);
 assert.match(projection,/OFFICIAL_SOURCE_SPECIFIC_SCHEDULE/);
 assert.doesNotMatch(projection,/trend1Y:/);
 assert.doesNotMatch(panel,/new Date\(\).*nextReleaseDate|fakeMiniTrend|synthesizedPrior/);
 assert.match(panel,/사후 재구성 추이/);
});

// Intentionally not counted as completed functionality: R7-R12 proved that these
// require separately dated raw observations and an approved publication contract.
test.todo("DATA_GAP_1: per-indicator previous observed value with source/period provenance");
test.todo("DATA_GAP_2: per-indicator one-year dated series with current-vintage vs PIT labeling");
test.todo("DATA_GAP_3: per-indicator verified release schedule; unscheduled SEC events remain unknown");

test("R48 earnings lower investor notes render with the same beginner cards as inflation",()=>{
 const notes=read("app/detail-investor-notes.tsx");
 const common=read("app/detail-reading-guide.tsx");
 const earnings=read("app/earnings-recession/page.tsx");
 const inflation=read("app/inflation/page.tsx");
 const css=read("app/inflation/inflation-beginner-reading-r1.css");
 assert.match(notes,/topic==="inflation"\|\|topic==="recession"\|\|topic==="liquidity-crisis"\|\|topic==="credit-risk"\|\|topic==="earnings-recession"\?"beginner":"default"/);
 assert.match(notes,/topic==="earnings-recession"\?"실적 침체 위험 지표, 쉽게 알아보기"/);
 assert.match(notes,/topic==="earnings-recession"\?"실적 침체 위험 진단 점수와 기업 실적 종합 점수를 구분해 확인하세요\."/);
 assert.match(notes,/"earnings-recession":\{title:"실적 침체 위험 방어 진단 읽기"/);
 for(const title of ["12대 기업 실적과 8대 실적 침체 위험은 별개입니다","분기 실적과 현재 위험 평가를 구분합니다","날짜와 현재 제공 범위 확인","과거 차트와 판정의 의미"])assert.ok(notes.includes(title),title);
 for(const target of ['related:["recession","asset-bubble","credit-risk"]',"WebPageJsonLd", "과거 차트는 동일 산식이 검증된 이력만 표시"])assert.ok(notes.includes(target),target);
 assert.match(earnings,/import "\.\.\/inflation\/inflation-beginner-reading-r1\.css"/);
 assert.match(earnings,/<DetailInvestorNotes topic="earnings-recession"\/>/);
 assert.match(inflation,/<DetailInvestorNotes topic="inflation"\/>/);
 assert.match(common,/if\(variant==="beginner"\)return <section className="zg-beginner-reading"/);
 assert.match(common,/className="zg-beginner-reading-grid"/);
 assert.match(css,/\.zg-beginner-reading-grid\{/);
 assert.match(css,/@media\(max-width:650px\)/);
});
