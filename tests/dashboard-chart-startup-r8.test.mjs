import test from 'node:test';
import assert from 'node:assert/strict';
import {afterIntroductionPaint} from '../lib/dashboard-chart-startup.mjs';

function fixture(open) {
  let id=0, mutation, close, calls=0, disconnected=false;
  const frames=new Map();
  const dialog=open===null?null:{open,addEventListener:(_,fn)=>close=fn,removeEventListener:()=>close=null};
  const target={document:{getElementById:()=>dialog},
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id},
    cancelAnimationFrame:id=>frames.delete(id),
    MutationObserver:class {constructor(fn){mutation=fn}observe(){}disconnect(){disconnected=true}},
  };
  const stop=afterIntroductionPaint(target,()=>calls++);
  const tick=()=>{const current=[...frames.values()];frames.clear();current.forEach(fn=>fn())};
  return {dialog,tick,stop,get calls(){return calls},get disconnected(){return disconnected},
    change(value){dialog.open=value;mutation?.()},close(){dialog.open=false;close?.()}};
}
test('covered charts wait until close and a paint opportunity',()=>{
  const f=fixture(true);f.tick();f.tick();assert.equal(f.calls,0);
  f.close();f.tick();assert.equal(f.calls,0);f.tick();assert.equal(f.calls,1);f.stop();
  assert.equal(f.disconnected,true);
});
test('returning visitor and pages without the dialog start after two frames',()=>{
  for(const open of [false,null]){const f=fixture(open);f.tick();assert.equal(f.calls,0);f.tick();assert.equal(f.calls,1);f.stop()}
});
test('reopening before paint cancels pending chart work',()=>{
  const f=fixture(false);f.tick();f.change(true);f.tick();assert.equal(f.calls,0);
  f.change(false);f.tick();f.tick();assert.equal(f.calls,1);f.stop();
});
test('unmounted charts never resume',()=>{
  const f=fixture(false);f.tick();f.stop();f.tick();assert.equal(f.calls,0);
});
