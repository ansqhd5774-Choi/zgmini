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
