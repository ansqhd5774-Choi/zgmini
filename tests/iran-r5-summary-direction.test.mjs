import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

function mountCard(arrowVisible=true){
 const compile=(url,mocks)=>{
  const file=new URL(url,import.meta.url),mod={exports:{}};
  const code=ts.transpileModule(readFileSync(file,'utf8'),{
   compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  const nativeRequire=createRequire(file);
  new Function('require','module','exports',code)(
   id=>Object.hasOwn(mocks,id)?mocks[id]:nativeRequire(id),mod,mod.exports
  );
  return mod.exports;
 };
 const {OutbreakChange}=compile('../app/outbreak-change.tsx',{
  '../lib/outbreak-change.mjs':createRequire(import.meta.url)('../lib/outbreak-change.mjs'),
  '../components/score-arrow-provider':{useScoreArrows:()=>()=>arrowVisible},
 });
 const {IranSummaryCard}=compile('../app/iran-progress.tsx',{
  '../components/live-score-value':{LiveScoreValue:({children})=>React.createElement(React.Fragment,null,children)},
  '../components/chart-axis-labels':{default:()=>null},
  '../components/chart-axis-labels.css':{},
  'lucide-react':{Swords:()=>null,TrendingUp:()=>null,TrendingDown:()=>null,Minus:()=>null},
  '../components/use-stored-index':{useStoredIndex:()=>({payload:null})},
  '../lib/iran-progress/view.mjs':{iranView:data=>data},
  './outbreak-change':{OutbreakChange},
  './content-help':{ContentHelp:()=>null},
  './help-copy':{HELP:{iran:''},HelpText:()=>null},
 });
 const end=Date.parse('2026-10-21T00:00:00Z');
 const history=Array.from({length:14},(_,i)=>({
  at:end-(13-i)*86400000,value:i===12?12.1:i===13?13:13,
  carried:i!==12&&i!==13,
 }));
 const view={score:13,message:'당일 잠정 종전 진전도 · R5',
  status:'PROVISIONAL',dailyAnchorEstimate:true,chartHistory:history,history,
  chartEndAt:end,overallEnded:false};
 const render=(v=view)=>renderToStaticMarkup(React.createElement(IranSummaryCard,{view:v,onOpen:()=>{}}));
 return {render,view};
}
test('Iran R5 summary shows rounded day-over-day amount and arrow without changing displayed score',()=>{
 const {render}=mountCard(true);
 const html=render();
 assert.match(html,/13<small class="ob-score-fraction">\.0<\/small>/);
 assert.match(html,/aria-label="전일 대비 1점 상승"/);
 assert.match(html,/title="전일 대비 1점 상승"/);
 assert.match(html,/>1<svg aria-hidden="true" viewBox="0 0 6 12"/);
 assert.match(html,/data-arrow-active="true"/);
});
test('Iran R5 without a 24-hour arrow signal still shows amount but no arrow; flat has 0',()=>{
 const {render,view}=mountCard(false);
 const html=render();
 assert.match(html,/aria-label="전일 대비 1점 상승"/);
 assert.match(html,/data-arrow-active="false"/);
 assert.doesNotMatch(html,/<svg aria-hidden="true" viewBox="0 0 6 12"/);
 const flat={...view,chartHistory:view.chartHistory.map((p,i)=>i===12?{...p,value:13}:p)};
 const flatHtml=render(flat);
 assert.match(flatHtml,/aria-label="전일 대비 0점 변화 없음"/);
 assert.match(flatHtml,/ob-direction-flat/);
});
test('the old artificial backcast remains excluded, while R3 still shows the shared difference',()=>{
 const {render,view}=mountCard(true);
 const legacy=render({...view,dailyAnchorEstimate:false,displayEstimate:true});
 assert.doesNotMatch(legacy,/ob-direction-/);
 const r3=render({...view,dailyAnchorEstimate:false,displayEstimate:null});
 assert.match(r3,/aria-label="전일 대비 1점 상승"/);
});
