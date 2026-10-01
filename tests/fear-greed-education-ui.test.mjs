import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const panel=fs.readFileSync(new URL("../app/fear-greed/usa/cnn-panel.tsx",import.meta.url),"utf8");
const detail=fs.readFileSync(new URL("../app/fear-greed/usa/page.tsx",import.meta.url),"utf8");
const country=fs.readFileSync(new URL("../app/country-fear-greed.tsx",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");

test("Fear & Greed education stays scoped to the USA detail page",()=>{
  assert.match(panel,/function CnnPanel\(\{ showEducation = false \}/);
  assert.match(country,/<CnnPanel\s*\/>/);
  assert.doesNotMatch(country,/showEducation/);
  assert.match(detail,/<CnnPanel showEducation\s*\/>/);
});

test("seven-component overview remains present and data-driven",()=>{
  assert.match(panel,/7개 구성요소 한눈에 보기/);
  assert.match(panel,/cnn-component-overview-list/);
  assert.match(panel,/componentDefinitions\.map\(\(definition, index\)/);
  assert.match(panel,/현재 원시값/);
  assert.match(panel,/CNN 점수/);
  assert.match(panel,/현재 상태/);
});

test("final education card owns the full desktop row without affecting mobile",()=>{
  assert.match(panel,/data-layout=\{index === componentDefinitions\.length - 1 \? "wide" : "standard"\}/);
  assert.match(css,/FEAR_GREED_EDU_LAYOUT_R1/);
  assert.match(css,/@media\(min-width:768px\)[\s\S]*data-layout="wide"[\s\S]*grid-column:1\/-1/);
  assert.match(css,/@media\(max-width:767px\)[\s\S]*data-layout="wide"[\s\S]*grid-column:auto/);
});

test("overview has explicit responsive presentation",()=>{
  assert.match(css,/FEAR_GREED_EDU_OVERVIEW_R1/);
  assert.match(css,/\.cnn-component-overview-row\{/);
  assert.match(css,/grid-template-columns:minmax\(180px,1\.4fr\) minmax\(120px,1fr\) 92px 108px/);
  assert.match(css,/@media\(max-width:767px\)[\s\S]*\.cnn-component-overview-row\{[\s\S]*grid-template-columns:minmax\(0,1fr\) auto/);
});
