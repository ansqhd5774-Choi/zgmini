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
const snapshots={
 '/api/market-score':{status:'SUCCESS',domains:[{id:'inflation',status:'READY',score:0},{id:'employment',status:'PARTIAL',score:80}],diagnostics8:{inflationStability:{status:'READY',score:0},assetBubbleSafety:{status:'READY',score:99}}},
 '/api/asset-bubble-detail':{status:'UNAVAILABLE',score:null},
 '/api/supply-shock-detail':{status:'READY',score:36},
};
const Explorer=load('../components/market-explorer.tsx',{
 './use-stored-index':{useStoredIndex:url=>({payload:snapshots[url],loading:false,error:null})},
 './live-score-value':{LiveScoreValue:({children})=>React.createElement('strong',null,children)},
 './score-arrow-provider':{StoredScoreDirection:()=>null},
 './market-explorer-catalog':catalog,
}).default;

test('risk overview preserves zero and does not replace an unavailable detail score with core data',()=>{
 const html=renderToStaticMarkup(React.createElement(Explorer,{kind:'risk'}));
 assert.equal((html.match(/<article /g)??[]).length,8);
 assert.match(html.split('id="inflationStability"')[1].split('</article>')[0],/<strong>0\.0<\/strong>/);
 const asset=html.split('id="assetBubbleSafety"')[1].split('</article>')[0];
 assert.match(asset,/<strong>—<\/strong>/);assert.doesNotMatch(asset,/>99\.0</);
 for(const card of catalog.RISK_CARDS)assert.ok(html.includes(`href="${card.href}"`));
});
test('economic overview retains all twelve domains and does not present a PARTIAL score as READY',()=>{
 const html=renderToStaticMarkup(React.createElement(Explorer,{kind:'economic'}));
 assert.equal((html.match(/<article /g)??[]).length,12);
 assert.match(html.split('id="employment"')[1].split('</article>')[0],/<strong>—<\/strong>/);
 assert.doesNotMatch(html,/>80\.0</);
});
test('theme overview retains 30 cards, prioritizes 7 ETF-only research themes and withholds unpublished scores',()=>{
 assert.equal(new Set(catalog.THEME_GROUPS.flatMap(g=>g.items)).size,30);
 const Theme=load('../app/theme-fear-greed/theme-explorer.tsx',{
  '../../components/market-explorer-catalog':catalog,
  '../../components/use-stored-index':{useStoredIndex:()=>({payload:null,loading:false,error:null})},
 }).default;
 const html=renderToStaticMarkup(React.createElement(Theme));
 assert.equal((html.match(/<article /g)??[]).length,30);
 assert.match(html,/ETF 전용 3축 연구 · 7개 테마/);
 assert.match(html,/ETF 7 · 공개 대기/);
 assert.equal((html.match(/ETF 3축 252일 검증 · 2026\.10\.16/g)??[]).length,7);
 assert.equal((html.match(/ETF 입력 보완 중/g)??[]).length,2);
 assert.equal((html.match(/ETF 연구 대상 · 데이터 준비 중/g)??[]).length,3);
 assert.equal((html.match(/데이터 준비 중<\/small>/g)??[]).length,21);
 const ordered=html.match(/<article [\s\S]*?<\/article>/g)??[];
 const firstNine=['로봇·자동화','클라우드·SaaS','자율주행','바이오테크','원전·SMR','방산','핀테크','사이버보안','게임·e스포츠'];
 assert.equal(ordered.length,30);
 for(let i=0;i<firstNine.length;i++)assert.ok(ordered[i].includes(firstNine[i]),firstNine[i]);
 assert.doesNotMatch(html,/<strong>\d+(?:\.\d+)?<\/strong>/);
});

test('theme screen withdraws previous ETF scores immediately when stored feed fails',()=>{
 const ThemeFile='../app/theme-fear-greed/theme-explorer.tsx';
 const payload={status:'READY',observationDate:'2026-10-16',themes:[{theme:'로봇·자동화',etfs:['BOTZ','ROBO'],score:25.09,
  history:Array.from({length:252},(_,i)=>({date:new Date(Date.UTC(2025,9,16)+i*86400000).toISOString().slice(0,10),score:25.09}))}]};
 const mocks=(error)=>({
  '../../components/market-explorer-catalog':catalog,
  '../../components/use-stored-index':{useStoredIndex:()=>({payload,error,loading:false})},
 });
 const visible=renderToStaticMarkup(React.createElement(load(ThemeFile,mocks(null)).default));
 assert.match(visible,/ETF 1 · 저장 점수/);
 assert.match(visible,/25\.1<\/strong>/);
 const withdrawn=renderToStaticMarkup(React.createElement(load(ThemeFile,mocks('UPDATE_FAILED')).default));
 assert.match(withdrawn,/ETF 7 · 공개 대기/);
 assert.doesNotMatch(withdrawn,/25\.1<\/strong>/);
});

test('shared header provides the agreed menu order on both dashboard and detail pages',()=>{
 const Header=load('../components/site-header.tsx',{'@/components/collection-health-indicator':{default:()=>null},'@/components/risk-detail-side-rails':{default:()=>null},'@/components/market-explorer-catalog':{RISK_CARDS:catalog.RISK_CARDS??[]}}).default;
 for(const props of [{},{activeView:'dashboard',onSelectView:()=>{}}]){
  const html=renderToStaticMarkup(React.createElement(Header,props));
  const nav=html.split('<nav aria-label="주 메뉴">')[1].split('</nav>')[0];
  const labels=['대시보드','위험 지표','경제 지표','섹터 공포·탐욕','테마 공포·탐욕','아웃브레이크'];
  const positions=labels.map(label=>nav.indexOf(label));assert.ok(positions.every((p,i)=>p>=0&&(i===0||p>positions[i-1])));
 }
});
