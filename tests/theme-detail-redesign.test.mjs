import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const catalogPath=new URL('../components/market-explorer-catalog.ts',import.meta.url);
const catalogCode=ts.transpileModule(readFileSync(catalogPath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const catalog={exports:{}};
new Function('require','module','exports',catalogCode)(createRequire(catalogPath),catalog,catalog.exports);
const names=catalog.exports.THEME_GROUPS.flatMap(g=>g.items);
const days=Array.from({length:252},(_,i)=>new Date(Date.UTC(2025,9,16)+i*86400000).toISOString().slice(0,10));
const sample=(theme,score)=>({theme,score,etfs:['ETF1','ETF2'],history:days.map(date=>({date,score}))});
const feed={status:'READY',observationDate:days.at(-1),phase:'CONFIRMED',themes:[
 sample('로봇·자동화',40),sample('바이오·신약',50),sample('클라우드·SaaS',60),sample('핀테크',70),
]};
function render(payload,error=null){
 const file=new URL('../app/theme-fear-greed/theme-detail-charts.tsx',import.meta.url),module={exports:{}};
 const script=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const require=createRequire(file);
 new Function('require','module','exports',script)(id=>{
  if(id==='../../components/market-explorer-catalog')return catalog.exports;
  if(id==='../../components/use-stored-index')return {useStoredIndex:()=>({payload,error,loading:false})};
  return require(id);
 },module,module.exports);
 return renderToStaticMarkup(React.createElement(module.exports.default));
}
test('theme screen uses sector comparison structure and dynamic top-three ranking',()=>{
 assert.equal(names.length,30);
 const html=render(feed);
 const rows=[...html.matchAll(/class="zg-sfg-rank-row"[^>]*aria-label="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(rows.map(s=>s.match(/^\d+위 ([^,]+)/)?.[1]),['핀테크','클라우드·SaaS','바이오·신약','로봇·자동화']);
 assert.match(html,/비교할 테마 선택/);
 assert.match(html,/테마별 1년 심리 지수 비교/);
 assert.doesNotMatch(html,/zg-tfg-pending|데이터 준비 중인 테마|목록 펼치기/);
 assert.equal((html.match(/class="zg-sfg-rank-row" aria-pressed="true"/g)??[]).length,3);
 assert.equal((html.match(/class="zg-sfg-rank-row" aria-pressed="false"/g)??[]).length,1);
 assert.doesNotMatch(html,/zg-sfg-detail|zg-sfg-changes|ETF ETF1 · ETF2|개별 차트와 변화량/);
 assert.match(html,/class="zg-sfg-comparison-plot"/);
});
test('theme screen never invents a missing or invalid score',()=>{
 const html=render({status:'READY',themes:[{...sample('핀테크',60),history:days.slice(0,251).map(date=>({date,score:60}))}]});
 assert.doesNotMatch(html,/class="zg-sfg-rank-row"/);
 assert.match(html,/ETF 전용 3축 연구 · 공개 데이터 대기/);
 assert.match(html,/30개/);
 const failed=render(feed,'UPDATE_FAILED');
 assert.doesNotMatch(failed,/class="zg-sfg-rank-row"/);
 assert.match(failed,/30개/);
});
test('theme page preserves only stored API, provisional dash and synchronized legend interaction',()=>{
 const page=readFileSync('app/theme-fear-greed/page.tsx','utf8');
 const component=readFileSync('app/theme-fear-greed/theme-detail-charts.tsx','utf8');
 assert.match(page,/import '\.\.\/sector-fear-greed\/sector-detail\.css'/);
 assert.match(page,/<ThemeDetailCharts\/>/);
 assert.match(component,/useStoredIndex<PublicThemeFeed>\('\/api\/theme-fear-greed'\)/);
 assert.match(component,/const currentVisible=visible\?\?topThree/);
 assert.match(component,/new Set\(ready\.slice\(0,3\)\.map\(t=>t\.name\)\)/);
 assert.match(component,/onClick=\{\(\)=>toggle\(item\.name\)\}/);
 assert.doesNotMatch(component,/setSelected|detailDays|detailRows|zg-sfg-detail|zg-sfg-changes/);
 assert.match(component,/aria-pressed=\{currentVisible\.has\(item\.name\)\} onClick=\{\(\)=>toggle\(item\.name\)\}/);
 assert.match(component,/strokeDasharray="4 4"/);
 assert.match(component,/onMouseLeave=\{\(\)=>setComparisonPinned\(false\)\}/);
 assert.doesNotMatch(component,/fetch\s*\(/);
});

test('theme page shows one collapsed investor guide with all three original destinations and no separate related navigation',()=>{
 const page=readFileSync('app/theme-fear-greed/page.tsx','utf8');
 const content=readFileSync('lib/investor-search-content.ts','utf8');
 const component=readFileSync('components/investor-search-guide.tsx','utf8');
 const section=content.split('export const THEME_INVESTOR_SEARCH:InvestorSearchCopy=')[1].split('export const ECONOMICHUB_INVESTOR_SEARCH:InvestorSearchCopy=')[0];
 assert.match(page,/<InvestorSearchGuide id="investor-search-theme-fear-greed" copy=\{THEME_INVESTOR_SEARCH\} collapsible\/>/);
 assert.doesNotMatch(page,/zg-sector-related-nav|aria-label="관련 분석"/);
 assert.match(component,/if\(collapsible\)return <details className="group/);
 assert.match(component,/<BookOpen size=\{16\}/);
 assert.match(component,/<ChevronsDown size=\{16\}/);
 assert.match(section,/"heading": "테마 ETF와 공포탐욕 점수 읽기"/);
 assert.equal((section.match(/"question":/g)??[]).length,2);
 for(const href of ['/sector-fear-greed/','/fear-greed/usa/','/asset-bubble/']){
  assert.equal((section.match(new RegExp('"href": "'+href.replaceAll('/','\\/')+'"','g'))??[]).length,1,href);
 }
 const html=render(feed);
 assert.match(html,/class="zg-sfg-comparison-plot"/);
 assert.doesNotMatch(html,/zg-tfg-pending|데이터 준비 중인 테마/);
});
