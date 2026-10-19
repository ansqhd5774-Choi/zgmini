import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const source=read("app/inflation/inflation-indicator-r2.css");
const css=read("app/risk-last3-hero-parity-r2.css");
const intro=read("app/search-intent-intro.tsx");
const topics=["asset-bubble","debt-risk","supply-shock"];
test("three approved risk heroes reuse the exact 132px side-by-side mobile density, scoped separately from existing five",()=>{
 for(const topic of topics){
  const cls=topic+"-target-card";
  const panel=read("app/"+topic+"/"+topic+"-panel.tsx");
  assert.ok(css.includes("."+cls),"missing hero scope "+topic);
  assert.ok(panel.includes('import "../risk-last3-hero-parity-r2.css";'));
  assert.ok(panel.includes('fg-shared-shell '+cls));
 }
 for(const fragment of [
  "grid-template-columns:10px minmax(0,40%) 6px minmax(0,1fr) 10px",
  "grid-template-rows:auto 132px auto",
  ".fg-content-slot{display:contents}",
  ".fg-score-slot",
  ".fg-analysis-slot",
  "height:132px",
  ".fg-header-slot .cnn-panel-heading",
  ".fg-footer-slot"
 ])assert.ok(css.includes(fragment),fragment);
 assert.match(css,/@media\(max-width:767px\)/);
 assert.doesNotMatch(css,/\.fg-card\.fg-shared-shell\.inflation-target-card/);
 assert.doesNotMatch(css,/\.fg-card\.fg-shared-shell\.credit-risk-target-card/);
 assert.ok(source.includes("grid-template-rows:auto 132px auto"),"reference geometry unchanged");
});
test("all five existing question-title paths remain and three missing introductions acquire consistent hierarchy",()=>{
 for(const old of ["inflation","recession","liquidity-crisis","credit-risk","earnings-recession"])assert.match(intro,new RegExp('if\\(topic==="'+old+'"\\)'));
 for(const subject of ["미국 자산시장,","버블 위험은?","미국 가계·기업,","부채 위험은?","미국 공급망,","충격 위험은?"])assert.ok(intro.includes(subject));
 for(const topic of topics)assert.ok(intro.includes('topic==="'+topic+'"'));
 assert.ok(intro.includes('return <p className="mt-4 max-w-4xl'));
});
test("source and saved-score distinctions remain visible after source-version truncation in compact header",()=>{
 for(const topic of topics){
  const panel=read("app/"+topic+"/"+topic+"-panel.tsx");
  assert.ok(panel.includes("dateLabel="));
  assert.match(panel,/<MarketScoreOrb[\s\S]*?comparisonItems=\{scoreComparisonItems\}/);
  assert.match(panel,/<MarketFearGreedChart showExtrema/);
 }
 assert.match(css,/\.cnn-source small\{display:none\}/);
});
