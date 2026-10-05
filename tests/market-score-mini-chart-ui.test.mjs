import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const src=fs.readFileSync(new URL("../app/dashboard-ui.tsx",import.meta.url),"utf8");

function cardTrendSource(){
  const start=src.indexOf("function CardTrend(");
  const end=src.indexOf("\n// Stage 12",start);
  assert.ok(start>=0&&end>start,"CardTrend source range");
  return src.slice(start,end);
}

test("macro mini charts use a quiet fixed 0-100 guide without X axis or tooltip",()=>{
  const card=cardTrendSource();
  assert.match(card,/accessibilityLayer=\{false\}/);
  assert.match(card,/domain=\{\[0,100\]\}/);
  assert.match(card,/zg-r55-mini-y-labels/);\n  assert.match(card,/>100<\/span><span>50<\/span><span>0<\/span>/);
  assert.match(card,/fontSize:7/);\n  assert.match(card,/YAxis hide domain=\{\[0,100\]\} width=\{0\}/);
  assert.match(card,/ReferenceLine y=\{25\}/);
  assert.match(card,/ReferenceLine y=\{50\}/);
  assert.match(card,/ReferenceLine y=\{75\}/);
  assert.doesNotMatch(card,/<Tooltip/);
  assert.doesNotMatch(card,/<XAxis/);
});

test("macro mini charts keep the trend line and current point without hover dot",()=>{
  const card=cardTrendSource();
  assert.match(card,/activeDot=\{false\}/);
  assert.match(card,/dot=\{false\}/);
  assert.match(card,/ReferenceDot/);
  assert.match(card,/stroke=\{color\}/);
});
