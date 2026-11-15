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

test('unavailable legacy provisional metadata cannot inject stale configured scores',()=>{
 const stale={status:'UNAVAILABLE',phase:'PROVISIONAL',themes:[],provisional:{points:[{date:'2026-10-29',scores:{'새 테마':91,'과거 테마':77}}]}};
 const confirmed={status:'READY',themes:[{id:'new-1',theme:'새 테마',score:33,observationDate:'2026-10-28',history:[{date:'2026-10-28',score:33}],provisionalStatus:'PENDING'}]};
 const result=mergeConfiguredThemeFeed(stale,confirmed);
 assert.equal(result.status,'READY');
 assert.equal(result.phase,'CONFIRMED');
 assert.deepEqual(result.provisional.points,[]);
 assert.equal(result.themes[0].score,33);
});

test('failed legacy feed must not contribute ghost scores alongside fresh configured provisional',()=>{
 const stale={status:'UNAVAILABLE',phase:'PROVISIONAL',provisional:{points:[{date:'2026-10-29',scores:{'새 테마':99,'ghost':100}}]}};
 const configured={status:'READY',themes:[{id:'new-1',theme:'새 테마',score:33,observationDate:'2026-10-28',history:[{date:'2026-10-28',score:33}],provisionalStatus:'READY',provisional:{date:'2026-10-30',score:36}}]};
 const result=mergeConfiguredThemeFeed(stale,configured);
 assert.deepEqual(result.provisional.points,[{date:'2026-10-30',scores:{'새 테마':36}}]);
});

test('valid READY legacy provisional output remains intact',()=>{
 const ready={...legacy,phase:'PROVISIONAL',provisional:{points:[{date:'2026-10-29',scores:{'기존':44}}]}};
 const result=mergeConfiguredThemeFeed(ready,null);
 assert.equal(result.status,'READY');
 assert.deepEqual(result.provisional.points,ready.provisional.points);
});
