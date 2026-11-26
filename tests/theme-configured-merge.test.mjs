import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeConfiguredThemeFeed} from '../lib/theme-configured-merge.mjs';
const legacy={status:'READY',themes:[{theme:'기존',score:40,history:[{date:'2026-10-28',score:40}]}]};
test('new themes share existing ranking/chart feed with no static catalogue membership or theme cap',()=>{
 const configured={status:'READY',themes:Array.from({length:501},(_,i)=>({id:'new-'+i,theme:'신규 '+i,score:30,etfs:['AAA'],observationDate:'2026-10-28',history:[{date:'2026-10-28',score:30}],provisionalStatus:'READY',provisional:{date:'2026-10-29',score:35}}))};
 const result=mergeConfiguredThemeFeed(legacy,configured);assert.equal(result.themes.length,502);
 assert.equal(Object.keys(result.provisional.points[0].scores).length,501);assert.deepEqual(result.themes[0],legacy.themes[0]);
});
test('duplicate labels never replace existing verified results; optional failure preserves legacy',()=>{
 const result=mergeConfiguredThemeFeed(legacy,{status:'READY',themes:[{id:'duplicate',theme:'기존',score:99}]});
 assert.deepEqual(result.themes,legacy.themes);assert.deepEqual(mergeConfiguredThemeFeed(legacy,null).themes,legacy.themes);
});
test('healthy configured feed is still visible if legacy reader is unavailable',()=>{
 const result=mergeConfiguredThemeFeed({status:'UNAVAILABLE'},{status:'READY',themes:[{id:'safe',theme:'새 테마',score:33,history:[{date:'2026-10-28',score:33}]}]});
 assert.equal(result.status,'READY');assert.equal(result.themes.length,1);
});


test('W03 stale legacy provisional cannot be relabelled READY by a valid configured theme',()=>{
 const stale={
  status:'UNAVAILABLE',phase:'PROVISIONAL',
  themes:[{theme:'만료 기존',score:84,history:[{date:'2026-11-14',score:84}]}],
  provisional:{points:[{date:'2026-11-15',scores:{'신규':97,'만료 기존':84}}]},
 };
 const configured={status:'READY',themes:[{
  id:'safe',theme:'신규',score:33,
  history:[{date:'2026-11-14',score:33}],
 }]};
 const result=mergeConfiguredThemeFeed(stale,configured);
 assert.equal(result.status,'READY');
 assert.equal(result.phase,'CONFIRMED');
 assert.deepEqual(result.themes.map(t=>t.theme),['신규']);
 assert.deepEqual(result.provisional.points,[]);
 assert.equal(result.observationDate,'2026-11-14');
});

test('W03 fresh configured provisional is retained but stale legacy points are excluded',()=>{
 const stale={status:'UNAVAILABLE',phase:'PROVISIONAL',themes:[],
  provisional:{points:[{date:'2026-11-15',scores:{'신규':97,'만료 기존':84}}]}};
 const configured={status:'READY',themes:[{
  id:'safe',theme:'신규',score:33,
  observationDate:'2026-11-14',history:[{date:'2026-11-14',score:33}],
  provisionalStatus:'READY',provisional:{date:'2026-11-15',score:36},
 }]};
 const result=mergeConfiguredThemeFeed(stale,configured);
 assert.equal(result.status,'READY');assert.equal(result.phase,'PROVISIONAL');
 assert.deepEqual(result.provisional.points,
  [{date:'2026-11-15',scores:{'신규':36}}]);
});

test('W03 genuinely READY legacy provisional continues alongside configured score',()=>{
 const base={status:'READY',phase:'PROVISIONAL',
  themes:[{theme:'기존',score:40,history:[{date:'2026-11-14',score:40}]}],
  provisional:{points:[{date:'2026-11-15',scores:{'기존':43}}]}};
 const result=mergeConfiguredThemeFeed(base,{status:'READY',themes:[{
  id:'fresh',theme:'신규',score:33,
  observationDate:'2026-11-14',history:[{date:'2026-11-14',score:33}],
  provisionalStatus:'READY',provisional:{date:'2026-11-15',score:36},
 }]});
 assert.equal(result.themes.length,2);
 assert.deepEqual(result.provisional.points,
  [{date:'2026-11-15',scores:{'기존':43,'신규':36}}]);
});
