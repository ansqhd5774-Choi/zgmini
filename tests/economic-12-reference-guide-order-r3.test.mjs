import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("12 economic details follow captured reference inflation mobile reading-guide order",()=>{
 const s=read("app/economic-indicators/economic-detail-panel.tsx");
 const markers=['data-testid={"economic-"+id+"-hero"}','className="economic-beginner"','className="economic-reason"','className="inflation-explainer economic-explainer"','className="inflation-indicator-section inflation-r2-indicators economic-indicators"','className="cnn-return-cta economic-back-button"'];
 const offsets=markers.map(m=>s.indexOf(m));
 assert.ok(offsets.every(i=>i>=0),JSON.stringify(offsets));
 assert.deepEqual(offsets,[...offsets].sort((a,b)=>a-b));
 assert.match(s,/BEGINNER GUIDE/);
 assert.match(s,/경제|시장|지표/);
 assert.match(s,/MarketScoreOrb/);
 assert.match(s,/liquidityStoredScoreComparisons/);
 assert.match(read("app/economic-indicators/economic-detail.css"),/\.economic-beginner>\.cnn-eyebrow/);
});
