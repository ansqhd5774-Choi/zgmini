import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

function load(relative,mocks={}){
 const file=new URL(relative,import.meta.url),module={exports:{}},require=createRequire(file);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(id=>Object.hasOwn(mocks,id)?mocks[id]:id.endsWith('.css')?{}:require(id),module,module.exports);
 return module.exports;
}

const catalog=load('../components/market-explorer-catalog.ts');
const makeTerrain=(domains,error=null,openRates=false)=>load('../components/economic-terrain.tsx',{
 'react':openRates?{...React,useState:initial=>initial===null?['rates',()=>{}]:React.useState(initial)}:React,
 './use-stored-index':{useStoredIndex:()=>({payload:{status:'SUCCESS',domains},loading:false,error})},
 './live-score-value':{LiveScoreValue:({children,className})=>React.createElement('strong',{className},children)},
 './market-explorer-catalog':catalog,
}).default;
const render=(domains,error=null,openRates=false)=>renderToStaticMarkup(React.createElement(makeTerrain(domains,error,openRates)));

test('economic terrain renders twelve indicators collapsed by default, five fixed score bands and preserved live scores',()=>{
 const domains=[
  {id:'rates',status:'READY',score:15.5,trend:[{date:'2026-09-01',value:18},{date:'2026-10-01',value:15.5}]},
  {id:'employment',status:'PARTIAL',score:88},
  {id:'commodities',status:'READY',score:20.7},
 ];
 const html=render(domains);
 assert.equal((html.match(/<button class="zg-terrain-row(?: is-selected)?"/g)??[]).length,12);
 for(const card of catalog.ECONOMIC_CARDS)assert.ok(html.includes(`id="${card.id}"`),card.id);
 const axis=html.split('class="zg-terrain-axis-bands"')[1].split('class="zg-terrain-axis-ticks"')[0];
 assert.deepEqual([...axis.matchAll(/style="width:(\d+)%"/g)].map(m=>Number(m[1])),[25,20,10,20,25]);
 assert.equal((html.match(/aria-expanded="false"/g)??[]).length,12);
 assert.doesNotMatch(html,/class="zg-terrain-detail"/);
 assert.match(html,/>15\.5<\/strong>/);
 const expanded=render(domains,null,true);
 assert.match(expanded,/id="rates"[^]*?aria-expanded="true"/);
 assert.match(expanded,/href="\/economic-indicators\/rates\/"/);
 assert.match(expanded,/금리 안정 점수 · 저장 추이/);
 assert.match(expanded,/<polyline /);
 const employment=html.split('id="employment"')[1].split('class="zg-terrain-item"')[0];
 assert.match(employment,/>—<\/strong>/);
 assert.doesNotMatch(employment,/>88\.0/);
});

test('terrain sorts by real score and places unavailable domains last',()=>{
 const html=render([
  {id:'inflation',status:'READY',score:61.2},
  {id:'employment',status:'PARTIAL',score:0},
  {id:'rates',status:'READY',score:18},
  {id:'commodities',status:'READY',score:22},
 ]);
 const order=[...html.matchAll(/class="zg-terrain-item" id="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(order.slice(0,3),['rates','commodities','inflation']);
 assert.ok(order.indexOf('employment')>order.indexOf('inflation'));
 assert.doesNotMatch(html,/zg-terrain-controls|지표 검색|경제 지표 정렬|점수 제공/);
});

test('history never invents scores for missing dates; unavailable history says so',()=>{
 const unavailable=render([{id:'rates',status:'READY',score:50,trend:[{date:'2026-10-01',value:50}]}],null,true);
 assert.match(unavailable,/선택한 기간의 저장된 점수 이력이 부족합니다/);
 assert.doesNotMatch(unavailable,/<polyline /);
 const available=render([{id:'rates',status:'READY',score:50,trend:[{date:'2026-08-01',score:48},{date:'2026-10-01',score:50}]}],null,true);
 assert.match(available,/실제 저장 관측일 기준 · 관측 사이를 연결한 추이/);
 assert.equal((available.match(/<polyline /g)??[]).length,1);
 assert.match(available,/>1M<\/button>/);
 assert.match(available,/aria-pressed="true">1Y<\/button>/);
});
