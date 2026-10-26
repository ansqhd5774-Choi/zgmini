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
function render(payload,error=null,filter={}){
 const file=new URL('../app/theme-fear-greed/theme-detail-charts.tsx',import.meta.url),module={exports:{}};
 const script=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const require=createRequire(file);
 new Function('require','module','exports',script)(id=>{
  if(id==='react'&&(filter.group||filter.query||filter.visible)){
   const react=require(id);
   return {...react,useState:initial=>{
    if(initial==='전체'&&filter.group)return react.useState(filter.group);
    if(initial===''&&filter.query)return react.useState(filter.query);
    if(initial===null&&filter.visible)return react.useState(new Set(filter.visible));
    return react.useState(initial);
   }};
  }
  if(id==='../../components/market-explorer-catalog')return catalog.exports;
  if(id==='../../components/use-stored-index')return {useStoredIndex:()=>({payload,error,loading:false})};
  return require(id);
 },module,module.exports);
 return renderToStaticMarkup(React.createElement(module.exports.default));
}
test('theme screen uses sector comparison structure and dynamic top-one selection',()=>{
 assert.equal(names.length,30);
 const html=render(feed);
 const rows=[...html.matchAll(/class="zg-sfg-rank-row"[^>]*aria-label="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(rows.map(s=>s.match(/^\d+위 ([^,]+)/)?.[1]),['핀테크','클라우드·SaaS','바이오·신약','로봇·자동화']);
 assert.match(html,/비교할 테마 선택/);
 assert.match(html,/테마별 1년 심리 지수 비교/);
 assert.doesNotMatch(html,/zg-tfg-pending|데이터 준비 중인 테마|목록 펼치기/);
 assert.equal((html.match(/class="zg-sfg-rank-row" aria-pressed="true"/g)??[]).length,1);
 assert.equal((html.match(/class="zg-sfg-rank-row" aria-pressed="false"/g)??[]).length,3);
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
 assert.match(component,/const currentVisible=visible\?\?topOne/);
 assert.match(component,/new Set\(ready\.slice\(0,1\)\.map\(t=>t\.name\)\)/);
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

test('theme mirrors the approved sector mobile comparison and ranking without changing stored ETF contracts',()=>{
 const component=readFileSync('app/theme-fear-greed/theme-detail-charts.tsx','utf8');
 const css=readFileSync('app/theme-fear-greed/theme-detail.css','utf8');
 const shared=readFileSync('app/sector-fear-greed/sector-detail.css','utf8');
 const html=render(feed);
 assert.ok(component.includes('const [compareDays,setCompareDays]=useState(90)'), '3M initially selected');
 assert.ok(component.includes('ready.slice(0,1)'), 'highest theme alone starts ON');
 assert.ok(component.includes('const currentVisible=visible??topOne'), 'manual selection unchanged');
 assert.ok(component.includes('setCompareDays(days)'), 'all duration controls remain interactive');
 assert.ok(component.includes('const selected=item.points.filter('), 'mini charts filter the stored dates');
 assert.ok(component.includes('<Sparkline item={item} days={compareDays}/>'), 'mini charts use the selected period');
 assert.ok(component.includes('selected.map(p=>'), 'period filtering is used for plotted points');
 assert.ok(component.includes('firstProvisional'), 'dashed provisional link preserved');
 assert.ok(component.includes('const soloTheme=currentVisible.size===1'), 'single-theme extrema marker');
 assert.ok(component.includes('shape={<SoloChartMarkers'), 'chart uses prior sector annotation behavior');
 assert.ok(component.includes('scoreColor(item.score)'), 'canonical five-band palette');
 assert.ok(component.includes('<h2 className="zg-sfg-mobile-ranking-title">테마 심리 순위</h2>'));
 assert.ok(component.includes('<div className="zg-sfg-mobile-rank-head"'), 'compact rank headings');
 assert.ok(html.includes('테마 검색'), 'theme search preserved');
 assert.ok(html.includes('테마 분류'), 'theme category controls preserved');
 assert.ok(html.includes('클라우드·SaaS'), 'theme name preserved');
 assert.equal((html.match(/class="zg-sfg-legend-score"/g)??[]).length,4, 'score badge shown for all available themes');
 assert.ok(css.includes('.zg-theme-detail .zg-sfg-rank-name{position:relative;justify-content:center;text-align:center}'));
 assert.ok(css.includes('.zg-theme-detail .zg-sfg-rank-name>i{position:absolute;left:0;top:50%;transform:translateY(-50%)}'));
 assert.ok(css.includes('grid-template-columns:15px 112px minmax(24px,1fr) 35px 55px 53px'), 'full six-column mobile rank');
 assert.ok(css.includes('grid-auto-rows:32px'), 'one-line 32px cards');
 assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'), '390px has 3 columns');
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), '320px has 2 columns');
 assert.ok(css.includes('.zg-theme-detail .zg-sfg-ranking .zg-sfg-sparkline{pointer-events:none}'), 'mobile ranking sparkline no touch');
 assert.ok(css.includes('.zg-theme-detail .zg-sfg-ranking .zg-sfg-sparkline .recharts-tooltip-wrapper{display:none!important}'));
 assert.ok(shared.includes('.zg-sfg-comparison{order:1;'), 'comparison remains above ranking');
 for(const selector of ['zg-sfg-legend-name','zg-sfg-legend-score','zg-sfg-mobile-rank-head','zg-sfg-rank-number','zg-sfg-rank-name','zg-sfg-rank-score','zg-sfg-rank-delta']){
  assert.ok(css.split('.zg-theme-detail .'+selector).slice(1).some(rule=>rule.split('}')[0].includes('font-size:11.5px'))||css.includes('.zg-theme-detail .zg-sfg-mobile-rank-head,.zg-theme-detail .zg-sfg-rank-number,.zg-theme-detail .zg-sfg-rank-name,.zg-theme-detail .zg-sfg-rank-score,.zg-theme-detail .zg-sfg-rank-delta,.zg-theme-detail .zg-sfg-rank-delta i{font-size:11.5px}'),selector);
 }
 assert.ok(component.includes("useStoredIndex<PublicThemeFeed>('/api/theme-fear-greed')"));
 assert.ok(component.includes('item.history.length!==252'));
 assert.ok(!component.includes('fetch('), 'no provider call');
});

test('theme search opens as an anchored overlay before categories and does not occupy layout space by default',()=>{
 const html=render(feed);
 const src=readFileSync('app/theme-fear-greed/theme-detail-charts.tsx','utf8');
 const css=readFileSync('app/theme-fear-greed/theme-detail.css','utf8');
 assert.match(html,/class="zg-tfg-search-toggle"[^>]*aria-label="테마 검색 열기"[^>]*aria-expanded="false"/);
 assert.ok(html.indexOf('zg-tfg-search-toggle')<html.indexOf('aria-label="테마 분류"'),'search icon is before the Entire category');
 assert.doesNotMatch(html,/aria-label="테마 검색" type="search"/,'search input is closed by default');
 assert.match(src,/\{searchOpen&&<div className="zg-tfg-search-popover"/);
 assert.match(src,/onClick=\{\(\)=>\{if\(searchOpen\)closeSearch\(\);else setSearchOpen\(true\);\}\}/);
 assert.match(src,/aria-expanded=\{searchOpen\}/);
 assert.match(css,/\.zg-tfg-search-control\{position:relative/);
 assert.match(css,/\.zg-tfg-search-popover\{position:absolute;top:calc\(100% \+ 6px\);left:0/);
 assert.match(css,/\.zg-tfg-toolbar\{[^}]*flex-wrap:nowrap/);
 assert.match(css,/\.zg-tfg-toolbar \.zg-explorer-filters\{[^}]*overflow-x:auto/);
});

test('theme search closes on category selection and outside pointer without leaving a hidden query',()=>{
 const src=readFileSync('app/theme-fear-greed/theme-detail-charts.tsx','utf8');
 assert.match(src,/const closeSearch=\(\)=>\{setSearchOpen\(false\);if\(query\)applyThemeFilter\(group,''\);\}/);
 assert.match(src,/onClick=\{\(\)=>\{setSearchOpen\(false\);applyThemeFilter\(name,''\);\}\}/);
 assert.match(src,/document\.addEventListener\('pointerdown',onOutsidePointer\)/);
 assert.match(src,/!searchContainerRef\.current\?\.contains\(event\.target as Node\)\)closeSearch\(\)/);
 assert.match(src,/document\.removeEventListener\('pointerdown',onOutsidePointer\)/);
 assert.match(src,/document\.addEventListener\('keydown',onEscape\)/);
 assert.match(src,/document\.removeEventListener\('keydown',onEscape\)/);
 assert.match(src,/searchInputRef\.current\?\.focus\(\)/);
 assert.match(src,/name\.toLocaleLowerCase\('ko'\)\.includes\(query\.trim\(\)\.toLocaleLowerCase\('ko'\)\)/);
 assert.match(src,/onChange=\{e=>applyThemeFilter\(group,e\.target\.value\)\}/);
});

test('theme rank numbers and top selection cards use the same filtered ordered subset on PC and mobile',()=>{
 const src=readFileSync('app/theme-fear-greed/theme-detail-charts.tsx','utf8');
 assert.match(src,/const ranked=ready\.filter\(t=>matches\(t\.name,t\.group\)\)/);
 assert.match(src,/className="zg-sfg-rank-list">\{ranked\.map\(\(item,index\)=>\{/);
 assert.doesNotMatch(src,/ready\.findIndex\(t=>t\.name===item\.name\)/);
 assert.match(src,/aria-label="비교할 테마 선택">\{ranked\.map\(item=>/);
 assert.match(src,/\{ranked\.flatMap\(item=>item\.points\.length>item\.provisionalFrom/);
 assert.match(src,/const soloTheme=currentVisible\.size===1\?ranked\.find/);
 assert.match(src,/const applyThemeFilter=\(nextGroup:string,nextQuery:string\)=>\{/);
 assert.match(src,/setVisible\(new Set\(filtered\.slice\(0,1\)\.map\(t=>t\.name\)\)\)/);
 assert.match(src,/onClick=\{\(\)=>\{setSearchOpen\(false\);applyThemeFilter\(name,''\);\}\}/);
 assert.match(src,/onChange=\{e=>applyThemeFilter\(group,e\.target\.value\)\}/);
 assert.match(src,/\},\[searchOpen,group,query,ready\]\)/);
});

test('filtered industry theme rows and selector cards share 1–4 ranks and ordered items',()=>{
 const industrial={status:'READY',observationDate:days.at(-1),phase:'CONFIRMED',themes:[
  sample('핀테크',88),sample('클라우드·SaaS',77),
  sample('방산',65),sample('우주·위성',58),sample('자율주행',51),sample('로봇·자동화',44),
 ]};
 const html=render(industrial,null,{group:'산업·모빌리티',visible:['방산']});
 const labels=[...html.matchAll(/class="zg-sfg-rank-row"[^>]*aria-label="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(labels.map(s=>s.match(/^(\d+)위 ([^,]+)/)?.slice(1)),[
  ['1','방산'],['2','우주·위성'],['3','자율주행'],['4','로봇·자동화'],
 ]);
 assert.equal((html.match(/class="zg-sfg-rank-row" aria-pressed="true"/g)??[]).length,1);
 const legend=html.split('aria-label="비교할 테마 선택"')[1]?.split('</div>')[0]??'';
 assert.equal((legend.match(/<button /g)??[]).length,4);
 for(const name of ['방산','우주·위성','자율주행','로봇·자동화'])assert.ok(legend.includes('title="'+name+'"'),name);
 for(const name of ['핀테크','클라우드·SaaS'])assert.ok(!legend.includes('title="'+name+'"'),name);
 const searched=render(industrial,null,{group:'산업·모빌리티',query:'우주',visible:['우주·위성']});
 assert.deepEqual([...searched.matchAll(/class="zg-sfg-rank-row"[^>]*aria-label="(\d+)위 ([^,]+),/g)].map(m=>[m[1],m[2]]),[['1','우주·위성']]);
 const searchLegend=searched.split('aria-label="비교할 테마 선택"')[1]?.split('</div>')[0]??'';
 assert.equal((searchLegend.match(/<button /g)??[]).length,1);
});
