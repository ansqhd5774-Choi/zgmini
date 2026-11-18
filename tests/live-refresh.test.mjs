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


test('W06 #34 a malformed or absent refresh timestamp cannot replace a verified current snapshot',()=>{
 const last={status:'SUCCESS',asOfDate:'2026-11-18',updatedAt:'2026-11-18T14:55:06.163Z',
  domains:[{id:'employment',status:'READY',score:53}]};
 const changes=(updatedAt,score)=>({...last,updatedAt,domains:[{id:'employment',status:'READY',score}]});
 assert.equal(acceptsStoredUpdate(last,changes(undefined,10)),false,'missing publish time');
 assert.equal(acceptsStoredUpdate(last,changes('unparseable',10)),false,'malformed publish time');
 assert.equal(acceptsStoredUpdate(last,changes('2026-11-18T14:54:59.999Z',10)),false,'older publish time');
 assert.equal(acceptsStoredUpdate(last,changes('2026-11-18T14:55:06.163Z',0)),true,'valid real zero at same time');
 assert.equal(acceptsStoredUpdate(last,changes('2026-11-18T14:56:06.163Z',54)),true,'valid newer score');
 assert.equal(acceptsStoredUpdate(null,changes(undefined,10)),true,'legacy initial update without earlier comparable timestamp');
 assert.equal(acceptsStoredUpdate({status:'READY',asOfDate:'2026-10-12'},{
  status:'READY',asOfDate:'2026-10-13',score:0}),true,'legacy undated history remains usable');
 assert.equal(acceptsStoredUpdate({asOfDate:'2026-10-13'},{
  asOfDate:'2026-10-12',score:53}),false,'legacy observed-day regression remains blocked');
});

test('W06 #34 a 60s scheduled stored refresh cannot overwrite a valid last value with unversioned response',async()=>{
 const handlers=new Map(),docHandlers=new Map();let tick,resolve,intervalMs;
 const target={setTimeout:()=>1,clearTimeout:()=>{},
  setInterval:(fn,ms)=>{tick=fn;intervalMs=ms;return 2},clearInterval:()=>{tick=null},
  addEventListener:(k,fn)=>handlers.set(k,fn),removeEventListener:k=>handlers.delete(k)};
 const documentTarget={visibilityState:'visible',
  addEventListener:(k,fn)=>docHandlers.set(k,fn),removeEventListener:k=>docHandlers.delete(k)};
 let accepted={updatedAt:'2026-11-18T12:00:00.000Z',asOfDate:'2026-11-18',score:50};
 const incoming=[
  {updatedAt:'2026-11-18T12:01:00.000Z',asOfDate:'2026-11-18',score:53},
  {asOfDate:'2026-11-18',score:11},
  {updatedAt:'2026-11-18T12:02:00.000Z',asOfDate:'2026-11-18',score:0},
 ];
 let calls=0;
 const stop=startStoredRefresh(async()=>{
  const next=incoming[calls++];
  if(acceptsStoredUpdate(accepted,next))accepted=next;
 },{target,documentTarget});
 assert.equal(intervalMs,60000);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(accepted.score,53,'newer legitimate calculation passes');
 tick();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(accepted.score,53,'undated stale transport response cannot regress the UI');
 tick();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(accepted.score,0,'newer legitimate zero value passes');
 assert.equal(calls,3);
 stop();
 assert.equal(tick,null);
 assert.equal(handlers.size,0);
 assert.equal(docHandlers.size,0);
});
