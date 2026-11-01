import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const src=fs.readFileSync(new URL("../app/dashboard-ui.tsx",import.meta.url),"utf8");

test("Stage12 market UI fetches the CM-R1 public API",()=>{
  assert.match(src,/fetch\(['"]\/api\/market-score['"]/);
  assert.match(src,/cache:\s*['"]no-store['"]/);
  assert.match(src,/modelVersion/);
  assert.match(src,/const busy=marketLoading;/);
});

test("12 public domains remain fixed and ordered",()=>{
  const expected=[
    "inflation","employment","rates","credit","growth","consumption",
    "earnings","liquidity","fundFlows","breadth","dollarFx","commodities"
  ];
  for(const id of expected)assert.match(src,new RegExp(`["']${id}["']`));
});

test("UI preserves data honesty for partial/unavailable domains",()=>{
  assert.match(src,/overall\.score|null|overallScore/);
  assert.match(src,/부분 데이터/);
  assert.match(src,/데이터 준비 중/);
  assert.match(src,/결측 시 재가중하지 않습니다/);
  assert.doesNotMatch(src,/신규 12영역 공개 점수 연결 준비 중/);
});

test("8-boundary diagnostics remain separate and Today is not reintroduced",()=>{
  assert.match(src,/diagnosticSubscores/);
  assert.match(src,/diagnostics8/);
  assert.doesNotMatch(src,/todayMetric/);
  assert.doesNotMatch(src,/>Today</);
});

test("commodities card does not use supplyShockSafety as its public domain score",()=>{
  const sliceConstArray=(name)=>{
    const start=src.indexOf("const "+name+"=[");
    assert.notEqual(start,-1,name+" start");
    const end=src.indexOf("] as const;",start);
    assert.ok(end>start,name+" end");
    return src.slice(start,end);
  };
  const domainArray=sliceConstArray("r55DomainIds");
  const diagnosticArray=sliceConstArray("diagnosticKeys");
  assert.ok(domainArray.includes("commodities"));
  assert.ok(!domainArray.includes("supplyShockSafety"));
  assert.ok(diagnosticArray.includes("supplyShockSafety"));
});


test("top eight diagnostics link to dedicated detail pages",()=>{
  const routes=[
    "/inflation/","/recession/","/stagflation-risk/","/credit-risk/",
    "/earnings-recession/","/asset-bubble/","/debt-risk/","/supply-shock/"
  ];
  for(const route of routes)assert.match(src,new RegExp(`href:['"]${route.replaceAll("/","\\/")}['"]|href:\\s*['"]${route.replaceAll("/","\\/")}['"]`));
  assert.match(src,/ArrowUpRight/);
  assert.match(src,/상세페이지 열기/);
});
