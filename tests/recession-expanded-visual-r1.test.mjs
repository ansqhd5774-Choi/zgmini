import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");
const intro=read("app/search-intent-intro.tsx");
const guide=read("app/beginner-risk-guide.tsx");
const panel=read("app/recession/recession-panel.tsx");
const css=read("app/recession/recession-indicator-r2.css");

test("recession introduction matches compact inflation layout without altering other page intros",()=>{
 assert.match(intro,/if\(topic==="inflation"\)/);
 assert.match(intro,/if\(topic==="recession"\)/);
 assert.match(intro,/미국 경기, <span className="text-sky-300">침체 신호는\?<\/span>/);
 assert.match(intro,/경기 방어점수와 최근 1년 추세 · 경기침체 확률 아님/);
 assert.equal((intro.match(/className="mb-4 max-w-4xl border-l-\[3px\] border-sky-400\/80 pl-3 sm:mb-5 sm:pl-4"/g)||[]).length,3);
 assert.match(intro,/if\(topic==="liquidity-crisis"\)/);
 assert.match(intro,/미국 금융시장, <span className="text-sky-300">유동성 위기는\?<\/span>/);
 assert.match(intro,/return <p className="mt-4 max-w-4xl text-sm leading-7/);
});

test("recession factors define eleven clear descriptions without touching stored-score selection",()=>{
 const config=guide.split(" recession:{")[1]?.split('\n },\n "liquidity-crisis":{')[0];
 assert.ok(config,"recession configuration");
 const names=config.match(/factorNames:\{([^}]+)\}/)?.[1];
 const descriptions=config.match(/factorDescriptions:\{([\s\S]*?)\n  \}/)?.[1];
 assert.ok(names&&descriptions,"factor names/descriptions");
 const ids=txt=>[...txt.matchAll(/([A-Za-z][A-Za-z0-9_]*):"/g)].map(x=>x[1]).sort();
 assert.equal(ids(names).length,11);
 assert.deepEqual(ids(descriptions),ids(names));
 for(const word of ["일자리","실업률","국채","회사채","최근 4주","가계 소비지출"])assert.ok(descriptions.includes(word),word);
 assert.match(guide,/const description=config\.factorDescriptions\?\.\[item\.id\]/);
 assert.match(guide,/const positive=useMemo\(\(\)=>factors\.filter\(x=>x\.score>=60\)/);
 assert.match(guide,/const negative=useMemo\(\(\)=>factors\.filter\(x=>x\.score<45\)/);
 assert.match(guide,/else if\(topic==="recession"\)rows=\[\.\.\.\(payload\?\.components\?\?\[\]\),\.\.\.\(payload\?\.supplementals\?\?\[\]\)\]/);
});

test("recession hero keeps stored 7+4 analysis and compact mobile footer without global CSS edits",()=>{
 assert.match(panel,/const componentMeta:Record/);
 assert.match(panel,/const supplementalMeta:Record/);
 assert.match(panel,/const developmentCandidates=/);
 assert.match(panel,/useStoredIndex<Payload>\('\/api\/recession-detail'\)/);
 assert.match(panel,/MarketFearGreedChart showExtrema data=\{trend\}/); // chart remains rendered from stored trend
 assert.match(panel,/경기침체 확률 아님/);
 assert.match(css,/\.fg-card\.fg-shared-shell\.recession-target-card \.fg-footer-slot\{\s*grid-column:1 \/ -1;\s*grid-row:3;\s*height:28px;\s*min-height:28px;\s*flex:0 0 28px;/);
 assert.match(css,/\.fg-card\.fg-shared-shell\.recession-target-card \.fg-footer-slot \.cnn-panel-note\{\s*height:28px;\s*min-height:28px;\s*box-sizing:border-box;/);
 assert.match(css,/grid-template-rows:auto 132px auto/);
 assert.match(panel,/recession-r2-mobile-list/);
 assert.doesNotMatch(css,/\.zg-dashboard\[/);
});
