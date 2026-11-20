import {marketChartSource} from './helpers/market-chart-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {calculateComposite,buildComposite,COMPOSITE_VERSION} from '../worker/korea-composite.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('K2 keeps the Korea score model and component orientation independent from USA',()=>{
  assert.equal(COMPOSITE_VERSION,'kr-fg-2f-1.0.0');
  assert.equal(calculateComposite(80,20),80);
  assert.equal(calculateComposite(50,50),50);
  const historyA=[{date:'20260916',score:80}];
  const historyB=[{date:'20260916',score:20}];
  const composite=buildComposite([
    {id:'LEV_BLEND20_60',history:historyA,status:'READY',observationDate:'20260916'},
    {id:'L3_PRESSURE_P252',history:historyB,status:'READY',observationDate:'20260916'},
  ],new Date('2026-09-17T00:00:00Z'));
  assert.equal(composite.components.length,2);
  assert.deepEqual(composite.components.map(x=>[x.id,x.weight]),[
    ['LEV_BLEND20_60',0.5],
    ['L3_PRESSURE_P252',0.5],
  ]);
  assert.equal(composite.components[1].orientedScore,80);
});

test('K2 Korean card wires Revision 7 only without USA coupling',()=>{
  const ui=read('app/korea-composite-view.tsx');
  const store=read('app/korea-funds-store.ts');

  assert.match(ui,/layoutVariant="shared"/);
  assert.match(ui,/className="korea-target-card"/);
  assert.match(ui,/displayScore/);
  assert.match(ui,/normalizeCompositeHistory\(c\?\.history\?\?\[\]\)/);
  assert.match(ui,/c\?\.observationDate/);
  assert.match(ui,/c\?\.sourceAttribution/);
  assert.match(ui,/Revision 7/);
  assert.match(ui,/componentModelLabel\(composite/);
  assert.match(ui,/composite\.methodologyVersion==='kr-fg-cnn-r7-1\.0\.0'/);
  assert.match(ui,/buildKoreaInsight/);
  assert.match(ui,/dayLabel:"이전 대비"/);
  assert.match(ui,/comparisonAriaLabel:"한국 공포탐욕 변화량"/);
  assert.match(ui,/gradientId="korea-fg-fill"/);
  assert.doesNotMatch(ui,/KR_LEVERAGE_INTENSITY_Z252_E50|KR_LIQUIDATION_LOG_Z252_INV_E50|KR_CORPORATE_STRESS_PENALTY/);
  assert.doesNotMatch(ui,/기업스트레스 최대 10점 감점/);
  assert.doesNotMatch(ui,/fetch\("\/api\/fear-greed"/);
  assert.doesNotMatch(ui,/CNN FEAR & GREED INDEX/);

  assert.match(store,/kr-fg-cnn-r7-1\.0\.0/);
  assert.doesNotMatch(store,/kr-fg-2f-cs-2\.0\.0|kr-fg-2f-1\.0\.0/);
  assert.match(store,/historyMode:'RECONSTRUCTED_CURRENT_VINTAGE'/);
  assert.match(store,/pointInTimeVerified:false/);
  assert.match(store,/sourceAttribution:string/);
  assert.match(store,/components:CompositeComponent\[\]/);
});

test('K2 period and daily changes are derived from Korea history, never copied from USA',()=>{
  const ui=read('app/korea-composite-view.tsx');
  assert.match(ui,/previousHistoryBaseline\(allHistory,c\?\.observationDate\)/);
  assert.match(ui,/historicalBaseline\(allHistory,targetPeriodTime\(c\?\.observationDate,selectedPeriod\)\)/);
  assert.match(ui,/score!==null&&dayBaseline!==null\?score-dayBaseline:null/);
  assert.match(ui,/score!==null&&periodBaseline!==null\?score-periodBaseline:null/);
  assert.doesNotMatch(ui,/previous_close|previous_1_week|previous_1_month|previous_1_year/);
});

test('shared chart preserves null Korea history gaps',()=>{
  const chart=marketChartSource();
  assert.match(chart,/score: number \| null/);
  assert.match(chart,/connectNulls=\{false\}/);
  assert.match(chart,/rawTooltipValue/);
});

test('shared score orb allows Korea previous-observation semantics without changing USA default',()=>{
  const orb=read('app/market-score-orb.tsx');
  const shell=read('app/fear-greed-card-shell.tsx');
  assert.match(orb,/dayLabel = '전일 대비'/);
  assert.match(orb,/comparisonAriaLabel = 'CNN 공포탐욕 변화량'/);
  assert.match(orb,/<span aria-label=\{dayLabel\}>\{dayLabel\.replace/);
  assert.match(shell,/dayLabel\?: string/);
  assert.match(shell,/comparisonAriaLabel\?: string/);
});


function koreaStoreForCancellation(fetchImpl){
 const typescript=read('app/korea-funds-store.ts');
 // Execute the real exported store module after TypeScript transpilation, with
 // React hooks isolated: the callback is the same one used by useKoreaFunds.
 const js=ts.transpileModule(typescript,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const timers=new Map();let nextTimer=0;
 const context={
  exports:{},AbortController,Promise,Set,
  fetch:fetchImpl,
  setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;},
  clearTimeout(id){timers.delete(id);},
  require(id){
   if(id==='react')return {useEffect(){},useSyncExternalStore(){}};
   if(id==='../lib/market-score/live-refresh.mjs')return {acceptsStoredUpdate:()=>true,startStoredRefresh:()=>()=>{}};
   throw Error('UNEXPECTED_MODULE:'+id);
  },
 };
 vm.runInNewContext(js+String.fromCharCode(10)+'exports.__load=load;exports.__snapshot=snapshot;',context);
 return {load:context.exports.__load,snapshot:context.exports.__snapshot,timers};
}

test('W06 Korea inFlight cancellation releases a pending fetch that ignores abort',async()=>{
 let calls=0;
 const store=koreaStoreForCancellation(()=>{calls++;return new Promise(()=>{});});
 const first=new AbortController();
 const waiting=store.load(first.signal);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls,1);
 first.abort();
 await waiting;
 const second=new AbortController();
 const retry=store.load(second.signal);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls,2,'a cancelled non-settling request must not block the next refresh');
 second.abort();await retry;
 assert.equal(store.timers.size,0,'timers must be cleaned up');
 assert.equal(store.snapshot().loading,false);
});

test('W06 Korea independent watchdog recovers with no caller signal',async()=>{
 let calls=0;
 const store=koreaStoreForCancellation(()=>{calls++;return new Promise(()=>{});});
 const original=store.load();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls,1);
 for(const fn of [...store.timers.values()])fn();
 await original;
 const next=store.load();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls,2);
 for(const fn of [...store.timers.values()])fn();
 await next;
 assert.equal(store.timers.size,0);
});

test('W06 Korea late stale success cannot overwrite a newer Revision 7 snapshot',async()=>{
 const pending=[];
 const store=koreaStoreForCancellation(()=>new Promise(resolve=>pending.push(resolve)));
 const firstAbort=new AbortController();
 const first=store.load(firstAbort.signal);
 await new Promise(resolve=>setImmediate(resolve));
 firstAbort.abort();await first;
 const secondAbort=new AbortController();
 const second=store.load(secondAbort.signal);
 await new Promise(resolve=>setImmediate(resolve));
 pending[1]({ok:true,json:async()=>({indicators:[{id:'new'}],composite:{methodologyVersion:'kr-fg-cnn-r7-1.0.0',score:60}})});
 await second;
 assert.equal(store.snapshot().composite.score,60);
 pending[0]({ok:true,json:async()=>({indicators:[{id:'old'}],composite:{methodologyVersion:'kr-fg-cnn-r7-1.0.0',score:10}})});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(store.snapshot().composite.score,60,'late cancelled response must not regress the current value');
 assert.equal(store.timers.size,0);
});
