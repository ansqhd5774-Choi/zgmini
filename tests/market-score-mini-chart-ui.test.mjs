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

test("market charts use numeric time axes so selected periods keep their true duration",()=>{
  const charts=sourceBetween("function timeScaledTrend(","// Stage 12");
  assert.match(charts,/function timeScaledTrend\(data:DashboardPoint\[\],periodDays:number\)/);
  assert.match(charts,/const start=end-Math\.max\(1,periodDays\)\*86400000/);
  assert.equal((charts.match(/<XAxis (?:hide )?dataKey="ts" type="number" domain=\{\[scaled\.start,scaled\.end\]\}/g)??[]).length,2);
  assert.match(src,/SummaryTrend data=\{overallTrend\}[^\n]*periodDays=\{periodDays\}/);
  assert.match(src,/CardTrend data=\{trend\}[^\n]*periodDays=\{periodDays\}/);
});

test("domain mini charts keep the fixed 0-100 score scale while time spacing is numeric",()=>{
  const card=sourceBetween("function CardTrend(","const summaryDateLabel=");
  assert.match(card,/YAxis hide domain=\{\[0,100\]\} width=\{0\}/);
  assert.match(card,/ReferenceLine y=\{25\}/);
  assert.match(card,/ReferenceLine y=\{50\}/);
  assert.match(card,/ReferenceLine y=\{75\}/);
  assert.match(card,/>100<\/span><span>50<\/span><span>0<\/span>/);
});

test("composite main chart shows fixed score ticks, selected dates and current point",()=>{
  const scale=sourceBetween("function SummaryTrend(","// Stage 12");
  assert.match(scale,/YAxis domain=\{\[0,100\]\} ticks=\{\[0,50,100\]\}/);
  assert.match(scale,/tickFormatter=\{summaryDateLabel\}/);
  assert.match(scale,/ticks=\{\[scaled\.start,[^\n]*scaled\.end\]\}/);
  assert.match(scale,/ReferenceDot x=\{latest\.ts\} y=\{latest\.value\}/);
  assert.doesNotMatch(scale,/summaryTrendScale/);
});

test("domain charts remain compact while the composite has visible dates",()=>{
  const charts=sourceBetween("function timeScaledTrend(","// Stage 12");
  assert.doesNotMatch(charts,/<Tooltip/);
  assert.equal((charts.match(/<XAxis hide/g)??[]).length,1);
});

test("composite uses sentiment area styling without the removed captions",()=>{
  const summary=sourceBetween("function SummaryTrend(","// Stage 12");
  assert.match(summary,/<AreaChart/);
  assert.match(summary,/<Area type="monotone" dataKey="value" stroke=\{color\}/);
  assert.match(summary,/<linearGradient/);
  assert.doesNotMatch(src,/className="zg-r55-main-period"|<span>종합 점수<\/span>|<span>\/ 100<\/span>/);
  assert.match(src,/ArrowUpRight size=\{14\}/);
});
