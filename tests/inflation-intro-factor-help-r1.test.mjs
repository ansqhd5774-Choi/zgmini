import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const intro=readFileSync("app/search-intent-intro.tsx","utf8");
const guide=readFileSync("app/beginner-risk-guide.tsx","utf8");

test("inflation intro leaves breathing room below the headline without changing other topics",()=>{
 assert.match(intro,/if\(topic==="inflation"\)/);
 assert.match(intro,/className="mb-4 max-w-4xl border-l-\[3px\] border-sky-400\/80 pl-3 sm:mb-5 sm:pl-4"/);
 assert.match(intro,/미국 물가, /);
 assert.match(intro,/안정되고 있을까\?/);
 assert.match(intro,/return <p className="mt-4 max-w-4xl text-sm leading-7/);
});

test("all 16 dynamic inflation factors have short explanations with unchanged scoring rules",()=>{
 const cfg=guide.match(/ inflation:\{([\s\S]*?)\n \},\n recession:/)?.[1];
 assert.ok(cfg,"inflation config is available");
 const names=cfg.match(/factorNames:\{([^}]+)\}/)?.[1];
 const descriptions=cfg.match(/factorDescriptions:\{([\s\S]*?)\n  \}/)?.[1];
 assert.ok(names&&descriptions);
 const keys=source=>[...source.matchAll(/\b([A-Z][A-Z0-9_]*)\s*:/g)].map(x=>x[1]).sort();
 assert.equal(keys(names).length,16);
 assert.deepEqual(keys(descriptions),keys(names));
 for(const [id,phrase] of Object.entries({
  WAGE_YOY:"한 시간당",UNIT_LABOR_COST:"생산물 한 단위",INDPRO:"공장·광산",
  IMPORT_EX_FUEL:"연료를 제외",PPI_FINAL:"최종 수요처",CORE_CPI_3M:"연율"
 }))assert.ok(descriptions.includes(`${id}:"`)&&descriptions.includes(phrase),id);
 assert.match(guide,/const description=config\.factorDescriptions\?\.\[item\.id\]/);
 assert.match(guide,/if\(!description\)return <li>• \{config\.factorNames\[item\.id\]\}<\/li>/);
 assert.equal((guide.match(/<FactorListItem key=\{item\.id\} item=\{item\} config=\{config\}\/>/g)||[]).length,2);
 assert.match(guide,/const positive=useMemo\(\(\)=>factors\.filter\(x=>x\.score>=60\)\.sort\(\(a,b\)=>b\.score-a\.score\)\.slice\(0,3\)/);
 assert.match(guide,/const negative=useMemo\(\(\)=>factors\.filter\(x=>x\.score<45\)\.sort\(\(a,b\)=>a\.score-b\.score\)\.slice\(0,3\)/);
});
