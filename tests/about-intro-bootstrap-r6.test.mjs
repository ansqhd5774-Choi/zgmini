import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { INTRO_BOOTSTRAP_SCRIPT, INTRO_POLICY, shouldShowIntroduction } from '../lib/about-intro-bootstrap.mjs';

function fixture({path='/', dismissed, until, denied=false}={}) {
  const session=new Map(dismissed?[ [INTRO_POLICY.dismissedKey,dismissed] ]:[]);
  const local=new Map(until?[ [INTRO_POLICY.hiddenKey,until] ]:[]);
  const store=map=>({getItem:key=>{if(denied)throw Error('blocked');return map.get(key)??null;},setItem:(key,value)=>{if(denied)throw Error('blocked');map.set(key,value);}});
  const events=new Map();
  const checkbox={checked:false};
  const dialog={open:false, opens:0, showModal(){this.open=true;this.opens++;},close(value){this.open=false;this.returnValue=value;},
    querySelector:()=>checkbox,
    addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:(type,fn)=>{if(events.get(type)===fn)events.delete(type);}};
  const window={location:{pathname:path},sessionStorage:store(session),localStorage:store(local),document:{getElementById:id=>id===INTRO_POLICY.dialogId?dialog:null}};
  return {window,dialog,checkbox,events,session,local};
}

test('parser-time script opens without React and hands event ownership over',()=>{
  const f=fixture();vm.runInNewContext(INTRO_BOOTSTRAP_SCRIPT,{window:f.window});
  assert.equal(f.dialog.open,true);assert.equal(f.dialog.opens,1);
  f.events.get(INTRO_POLICY.hydratedEvent)();
  assert.equal(f.events.has('click'),false);assert.equal(f.events.has('cancel'),false);
});

test('existing session/week/about exclusions apply before hydration; expired week opens',()=>{
  for(const options of [{dismissed:'1'},{until:String(Date.now()+60000)},{path:'/about/'},{path:'/about'}]){
    const f=fixture(options);vm.runInNewContext(INTRO_BOOTSTRAP_SCRIPT,{window:f.window});
    assert.equal(f.dialog.open,false,JSON.stringify(options));
  }
  const f=fixture({until:String(Date.now()-1000)});assert.equal(shouldShowIntroduction(f.window,INTRO_POLICY),true);
});

test('early checkbox and close preserve seven days and prevent hydration reopening',()=>{
  const f=fixture();vm.runInNewContext(INTRO_BOOTSTRAP_SCRIPT,{window:f.window});
  f.checkbox.checked=true;const before=Date.now();
  f.events.get('click')({target:{closest:()=>true}});
  assert.equal(f.dialog.open,false);assert.equal(f.session.get(INTRO_POLICY.dismissedKey),'1');
  assert.ok(Number(f.local.get(INTRO_POLICY.hiddenKey))>=before+INTRO_POLICY.week);
  assert.equal(shouldShowIntroduction(f.window,INTRO_POLICY),false);
});

test('Escape/backdrop still close when storage is denied',()=>{
  for(const method of ['cancel','click']){
    const f=fixture({denied:true});vm.runInNewContext(INTRO_BOOTSTRAP_SCRIPT,{window:f.window});
    let prevented=false;
    f.events.get(method)({target:f.dialog,preventDefault:()=>{prevented=true;}});
    assert.equal(f.dialog.open,false);
    assert.equal(f.dialog.returnValue,INTRO_POLICY.dismissedValue);
    if(method==='cancel')assert.equal(prevented,true);
  }
});
