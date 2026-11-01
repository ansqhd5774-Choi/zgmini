import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptsStoredUpdate,startStoredRefresh} from '../lib/market-score/live-refresh.mjs';
test('older observation or publication rejected; zero and same-date revision retained',()=>{
 const old={score:45,observedAt:'2026-10-13',updatedAt:'2026-10-13T01:00:00Z'};
 assert.equal(acceptsStoredUpdate(old,{score:38,observedAt:'2026-10-09',updatedAt:'2026-10-13T02:00:00Z'}),false);
 assert.equal(acceptsStoredUpdate(old,{...old,updatedAt:'2026-10-12'}),false);
 assert.equal(acceptsStoredUpdate(old,{...old,score:0}),true);
 assert.equal(acceptsStoredUpdate({composite:{observationDate:'20261008'}},{composite:{observationDate:'20261007'}}),false);
 assert.equal(acceptsStoredUpdate(old,{...old,score:null,status:'PARTIAL'}),true);
});
test('periodic and resume refresh serialize calls and clean up aborted requests',async()=>{
 const handlers=new Map(),docHandlers=new Map();let tick,finish,aborted=false,calls=0;
 const target={setTimeout:()=>1,clearTimeout:()=>{},setInterval:(fn,ms)=>{assert.equal(ms,60000);tick=fn;return 1;},clearInterval:()=>{tick=null;},addEventListener:(k,f)=>handlers.set(k,f),removeEventListener:k=>handlers.delete(k)};
 const documentTarget={visibilityState:'visible',addEventListener:(k,f)=>docHandlers.set(k,f),removeEventListener:k=>docHandlers.delete(k)};
 const stop=startStoredRefresh(signal=>{calls++;signal.addEventListener('abort',()=>{aborted=true;finish();});return new Promise(r=>{finish=r;});},{target,documentTarget});
 assert.equal(calls,1);handlers.get('focus')();tick();assert.equal(calls,1);
 finish();await new Promise(r=>setImmediate(r));tick();assert.equal(calls,2);
 finish();await new Promise(r=>setImmediate(r));documentTarget.visibilityState='hidden';tick();assert.equal(calls,2);
 documentTarget.visibilityState='visible';docHandlers.get('visibilitychange')();assert.equal(calls,3);
 stop();assert.equal(aborted,true);assert.equal(handlers.size,0);assert.equal(docHandlers.size,0);assert.equal(tick,null);
});
