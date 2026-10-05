import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const src=fs.readFileSync(new URL("../app/dashboard-ui.tsx",import.meta.url),"utf8");

function sourceBetween(startToken,endToken){
  const start=src.indexOf(startToken);
  const end=src.indexOf(endToken,start);
  assert.ok(start>=0&&end>start,`${startToken} source range`);
  return src.slice(start,end);
}

test("domain mini charts keep the fixed 0-100 scale",()=>{
  const card=sourceBetween("function CardTrend(","function summaryTrendScale(");
  assert.match(card,/accessibilityLayer=\{false\}/);
  assert.match(card,/tabIndex=\{-1\}/);
  assert.match(card,/onPointerDown=\{event=>event\.preventDefault\(\)\}/);
  assert.match(card,/YAxis hide domain=\{\[0,100\]\} width=\{0\}/);
  assert.match(card,/ReferenceLine y=\{25\}/);
  assert.match(card,/ReferenceLine y=\{50\}/);
  assert.match(card,/ReferenceLine y=\{75\}/);
  assert.match(card,/>100<\/span><span>50<\/span><span>0<\/span>/);
  assert.doesNotMatch(card,/<Tooltip/);
  assert.doesNotMatch(card,/<XAxis/);
});

test("composite summary chart uses an adaptive Y range instead of fixed 0-100",()=>{
  const scale=sourceBetween("function summaryTrendScale(","// Stage 12");
  assert.match(scale,/Math\.max\(8,\(rawMax-rawMin\)\*1\.35\)/);
  assert.match(scale,/YAxis hide domain=\{\[scale\.low,scale\.high\]\} width=\{0\}/);
  assert.match(scale,/ReferenceLine y=\{scale\.q1\}/);
  assert.match(scale,/ReferenceLine y=\{scale\.mid\}/);
  assert.match(scale,/ReferenceLine y=\{scale\.q3\}/);
  assert.match(scale,/summaryAxisLabel\(scale\.high\)/);
  assert.match(scale,/summaryAxisLabel\(scale\.low\)/);
  assert.doesNotMatch(scale,/YAxis hide domain=\{\[0,100\]\}/);
});

test("composite panel renders SummaryTrend while domain cards still render CardTrend",()=>{
  assert.match(src,/\?<SummaryTrend data=\{overallTrend\} label="종합 시장 점수"/);
  assert.match(src,/\?<CardTrend data=\{trend\} label=\{m\.label\}/);
});

test("both chart types keep the current point without hover dots",()=>{
  const charts=sourceBetween("function CardTrend(","// Stage 12");
  assert.equal((charts.match(/activeDot=\{false\}/g)??[]).length,2);
  assert.equal((charts.match(/dot=\{false\}/g)??[]).length,2);
  assert.equal((charts.match(/<ReferenceDot/g)??[]).length,2);
});
