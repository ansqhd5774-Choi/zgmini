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
 new Function('require','module','exports',code)(id=>Object.hasOwn(mocks,id)?mocks[id]:require(id),module,module.exports);
 return module.exports;
}
const catalog=load('../components/market-explorer-catalog.ts');
const main={
 diagnostics8:{
  inflationStability:{status:'READY',score:58.862},
  recessionDefense:{status:'READY',score:45.748},
  creditRiskDefense:{status:'READY',score:73.985},
  earningsRecessionDefense:{status:'READY',score:84.6875},
  debtRiskSafety:{status:'READY',score:73.084},
 },
};
const history=[
 {label:'2025-12-31',value:47.209},
 {label:'2026-03-31',value:31.5},
 {label:'2026-06-30',value:22.498},
];

function render(overrides={}){
 const responses={
  '/api/market-score':main,
  '/api/asset-bubble-detail':{status:'READY',score:22.498,historyMode:'CURRENT_VINTAGE_ONLY',trend:history},
  '/api/supply-shock-detail':{status:'READY',score:35.983},
  '/api/stagflation-risk-detail':{status:'READY',score:75.067},
  ...overrides,
 };
 const charts=[];
 const Landing=load('../app/risk-indicators/risk-indicators-client.tsx',{
  '../../components/market-explorer-catalog':catalog,
  '../../components/use-stored-index':{useStoredIndex:url=>({payload:responses[url]??null,loading:false,error:null})},
  '../../components/live-score-value':{LiveScoreValue:({children})=>React.createElement('strong',null,children)},
  '../market-fear-greed-chart':{MarketFearGreedChart:({data})=>{charts.push(data);return React.createElement('div',{'data-real-chart':true});}},
 }).default;
 return {html:renderToStaticMarkup(React.createElement(Landing)),charts};
}

test('risk landing lists all eight real detail links sorted by available stability score',()=>{
 const {html}=render();
 assert.equal((html.match(/<li>/g)??[]).length,8);
 const positions=catalog.RISK_CARDS.map(card=>html.indexOf(`href="${card.href}"`));
 assert.ok(positions.every(n=>n>=0));
 const ranking=html.split('<ol class="zg-risk-ranking-list">')[1].split('</ol>')[0];
 assert.ok(ranking.indexOf('자산 버블')<ranking.indexOf('공급 충격'));
 assert.ok(ranking.indexOf('공급 충격')<ranking.indexOf('경기 침체'));
 assert.match(html,/가장 먼저 볼 위험/);
 assert.match(html,/미국 경제 위험 지표 8가지/);
 assert.match(html,/위기 발생 확률 아님/);
});

test('featured asset-bubble history chart has only the three actually stored quarterly observations',()=>{
 const {html,charts}=render();
 assert.equal(charts.length,1);
 assert.deepEqual(charts[0],history.map(row=>({date:row.label,score:row.value})));
 assert.match(html,/관측 3개/);
 assert.match(html,/현재 기준으로 재구성된 이력/);
 assert.match(html,/2026\.06\.30/);
});

test('missing observations are not converted into a fabricated chart',()=>{
 const tooSparse=render({'/api/asset-bubble-detail':{status:'READY',score:22.498,trend:[history.at(-1)]}});
 assert.equal(tooSparse.charts.length,0);
 assert.match(tooSparse.html,/차트를 그리려면 2개 이상이 필요/);
 const incompatible=render({'/api/asset-bubble-detail':{status:'READY',score:22.498,trend:history.map(row=>({...row,value:row.value+7}))}});
 assert.equal(incompatible.charts.length,1,'historical points can differ from current score when provenance is consistent');
});
