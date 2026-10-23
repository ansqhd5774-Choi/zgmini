import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {miniTrendGeometry} from '../lib/market-score/mini-trend-geometry.mjs';

const src=fs.readFileSync(new URL("../app/dashboard-ui.tsx",import.meta.url),"utf8");
const responsive=fs.readFileSync(new URL("../app/responsive.css",import.meta.url),"utf8");

function sourceBetween(startToken,endToken){
  const start=src.indexOf(startToken);
  const end=src.indexOf(endToken,start);
  assert.ok(start>=0&&end>start,`${startToken} source range`);
  return src.slice(start,end);
}

test("market trend windows delegate to the exact-boundary anchor helper",()=>{
  const windowSource=sourceBetween("function marketTrendWindow(","const publicStatusLabel");
  assert.match(src,/marketTrendWindowR1/);
  assert.match(windowSource,/return marketTrendWindowR1\(data\?\?\[\],days\)/);
});

test("market charts use numeric time axes so selected periods keep their true duration",()=>{
  const charts=sourceBetween("function timeScaledTrend(","// Stage 12");
  assert.match(charts,/function timeScaledTrend\(data:DashboardPoint\[\],periodDays:number\)/);
  assert.match(charts,/const start=end-Math\.max\(1,periodDays\)\*86400000/);
  assert.match(charts,/<XAxis dataKey="ts" type="number" domain=\{\[scaled\.start,scaled\.end\]\}/);
  assert.match(charts,/miniTrendGeometry\(data,periodDays,missingDates\)/);
  assert.match(src,/SummaryTrend data=\{overallTrend\}[^\n]*periodDays=\{periodDays\}/);
  assert.match(src,/CardTrend data=\{trend\}[^\n]*periodDays=\{periodDays\}/);
});

test("domain mini charts keep the fixed 0-100 score scale while time spacing is numeric",()=>{
  const card=sourceBetween("function CardTrend(","function summaryDateParts(");
  assert.match(card,/\[0,25,50,75,100\]\.map/);
  assert.match(card,/viewBox="0 0 220 60"/);
  const chart=miniTrendGeometry([{label:'2026-01-01',value:0},{label:'2026-01-03',value:100}],2);
  assert.equal(chart.path,'M13.000,57.000L217.000,3.000');
  assert.deepEqual(chart.last,{x:217,y:3});
  assert.match(card,/>100<\/span><span>50<\/span><span>0<\/span>/);
});

test("composite main chart matches fear-greed x-axis labeling style",()=>{
  const scale=sourceBetween("function summaryDateParts(","// Stage 12");
  assert.match(scale,/fontSize:9/);
  assert.match(scale,/fill:'var\(--zg-text-meta,#a8bcd0\)'/);
  assert.match(scale,/height=\{30\}/);
  assert.match(scale,/tickMargin=\{5\}/);
  assert.match(scale,/interval=\{0\}/);
  assert.match(scale,/periodDays<=90/);
  assert.match(scale,/periodDays<=180/);
  assert.match(scale,/String\(group\.year\)\.slice\(-2\).*12/);
  assert.match(scale,/ReferenceDot x=\{latest\.ts\} y=\{latest\.value\}/);
});

test("domain charts remain compact while the composite has visible dates",()=>{
  const charts=sourceBetween("function timeScaledTrend(","// Stage 12");
  const card=sourceBetween("function CardTrend(","function summaryDateParts(");
  const summary=sourceBetween("function SummaryTrend(","// Stage 12");
  assert.doesNotMatch(card,/<Tooltip/);
  assert.match(summary,/<Tooltip/);
  assert.doesNotMatch(card,/<XAxis|<ResponsiveContainer|<LineChart/);
  assert.match(card,/geometry\.path/);
});

test('static mini charts preserve true date spacing, missing breaks and latest zero',()=>{
 const chart=miniTrendGeometry([{label:'2026-01-01',value:50},{label:'2026-01-03',value:0}],4,['2026-01-02']);
 assert.equal(chart.path,'M115.000,30.000M217.000,57.000');
 assert.equal(chart.bridge,'M115.000,30.000L217.000,57.000');
 assert.deepEqual(chart.last,{x:217,y:57});
 assert.equal(miniTrendGeometry([],365).last,null);
});

test("composite uses sentiment area styling without the removed captions",()=>{
  const summary=sourceBetween("function SummaryTrend(","// Stage 12");
  assert.match(summary,/<AreaChart/);
  assert.match(summary,/<Area type="monotone" dataKey="value" stroke=\{color\}/);
  assert.match(summary,/<linearGradient/);
  assert.doesNotMatch(src,/className="zg-r55-main-period"|<span>종합 점수<\/span>|<span>\/ 100<\/span>/);
  assert.match(src,/ArrowUpRight size=\{18\}/);
});


test("desktop diagnostics stay in one row while mobile proportions remain unchanged",()=>{
  const midStart=responsive.indexOf("@container marketShell (min-width:761px) and (max-width:959px)");
  assert.ok(midStart>=0);
  const mid=responsive.slice(midStart,responsive.indexOf("\n}",midStart)+2);
  assert.match(mid,/zg-r55-subscore-grid\{grid-template-columns:repeat\(8,minmax\(0,1fr\)\)/);

  const wideStart=responsive.indexOf("@container marketShell (min-width:960px)");
  assert.ok(wideStart>=0);
  const wide=responsive.slice(wideStart,responsive.indexOf("\n}",wideStart)+2);
  assert.match(wide,/grid-template-columns:132px minmax\(0,1fr\)/);
  assert.match(wide,/zg-r55-primary-zone,.+zg-r55-diagnostics-zone\{display:contents\}/);
  assert.match(wide,/zg-r55-subscore-grid\{grid-template-columns:repeat\(8,minmax\(0,1fr\)\);grid-template-rows:auto;gap:0/);
  assert.doesNotMatch(wide,/repeat\(2,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(wide,/border-left:1px/);

  const mobileStart=responsive.indexOf("@container marketShell (max-width:760px)");
  assert.ok(mobileStart>=0);
  const mobile=responsive.slice(mobileStart,responsive.indexOf("\n}",mobileStart)+2);
  assert.match(mobile,/zg-r55-summary-top\{grid-column:1;grid-row:1;min-height:76px\}/);
  assert.match(mobile,/zg-r55-summary-chart \.zg-spark\{height:180px;min-height:180px\}/);
  assert.match(mobile,/zg-r55-master-number strong\{font-size:44px\}/);
});


test("desktop composite spacing follows one 8px owner contract while mobile keeps 12px",()=>{
  assert.match(responsive,/--r55-summary-pad:8px;--r55-summary-gap:8px/);

  const midStart=responsive.indexOf("@container marketShell (min-width:761px) and (max-width:959px)");
  assert.ok(midStart>=0);
  const mid=responsive.slice(midStart,responsive.indexOf("\n}",midStart)+2);
  assert.match(mid,/gap:var\(--r55-summary-gap\);padding:var\(--r55-summary-pad\)/);

  const wideStart=responsive.indexOf("@container marketShell (min-width:960px)");
  assert.ok(wideStart>=0);
  const wide=responsive.slice(wideStart,responsive.indexOf("\n}",wideStart)+2);
  assert.match(wide,/gap:var\(--r55-summary-gap\);padding:var\(--r55-summary-pad\)/);

  assert.match(responsive,/zg-r55-subscore:first-child\{padding-left:0\}/);
  assert.match(responsive,/zg-r55-subscore:last-child\{padding-right:0\}/);

  const mobileStart=responsive.indexOf("@container marketShell (max-width:760px)");
  assert.ok(mobileStart>=0);
  const mobile=responsive.slice(mobileStart,responsive.indexOf("\n}",mobileStart)+2);
  assert.match(mobile,/zg-r55-summary\{grid-template-columns:minmax\(0,1fr\);gap:12px;padding:12px\}/);
  assert.match(mobile,/zg-r55-summary-chart \.zg-spark\{height:180px;min-height:180px\}/);
});
