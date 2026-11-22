import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {captureCoreOriginAtStart} from '../scripts/pc-writer/core-origin-runtime.mjs';

const path=String.raw`E:\ZGmini\projects\zgmini-earnings-history-pc-release\scripts\pc-writer\local-cycle.mjs`;
const nodeCommand=String.raw`"E:\ZGmini\runtime\node.exe" "E:\ZGmini\projects\zgmini-earnings-history-pc-release\scripts\pc-writer\local-cycle.mjs" --publish`;
const start=Date.UTC(2026,10,21,7,0,0);
const stamp='20261121160000.000000+540';
const processRows=[
 {ProcessId:10,ParentProcessId:1,Name:'taskeng.exe',CommandLine:'',CreationDate:stamp},
 {ProcessId:55,ParentProcessId:10,Name:'wscript.exe',CommandLine:'unrelated secret not output',CreationDate:stamp},
 {ProcessId:60,ParentProcessId:55,Name:'node.exe',CommandLine:nodeCommand,CreationDate:stamp},
];
function simulateWsh({rows=processRows,state=4,instances=1,enabled=true,pid='60',script=path,taskError=false,hidden=[],hiddenError=false}={}){
 const source=fs.readFileSync(new URL('../scripts/pc-writer/core-origin-wmi.mjs',import.meta.url),'utf8');
 const output=[];
 const scheduler={Connect:()=>{},GetRunningTasks:flags=>{
  assert.equal(flags,1);if(hiddenError)throw Error('unavailable');
  return {Count:hidden.length,Item:i=>hidden[i-1]};
 },GetFolder:()=>({GetTask:()=>{
  if(taskError)throw Error('unavailable');
  return {State:state,Enabled:enabled,GetInstances:flags=>{
   assert.equal(flags,0);
   return {Count:instances,Item:()=>({EnginePID:10})};
  }};
 }})};
 function Enumerator(items){this.items=items;this.i=0;this.atEnd=()=>this.i>=this.items.length;
  this.moveNext=()=>{this.i++;};this.item=()=>this.items[this.i];}
 vm.runInNewContext(source,{ActiveXObject:function(){return scheduler;},
  GetObject:()=>({ExecQuery:()=>rows}),Enumerator,
  WScript:{Arguments:{length:2,Item:i=>i===0?pid:script},Echo:s=>output.push(s)}},{timeout:2000});
 assert.equal(output.length,1);
 const value=JSON.parse(output[0]);
 assert.doesNotMatch(output[0],/secret|ZGmini|node\.exe|local-cycle\.mjs/i);
 return value;
}
test('natural Core same-account TaskEngine ancestry is recorded, without paths or commands',()=>{
 const result=simulateWsh();
 assert.equal(result.linked,true);
 assert.equal(result.code,'TASK_ENGINE_CHAIN_MATCH');
 assert.equal(result.createdAtMs,start);
 assert.equal(result.visibleInstances,1);
});

const hiddenCore={Path:'\\ZGMINI-PC-Local-Core',State:4,EnginePID:10,
 InstanceGuid:'{12345678-1234-4123-8123-123456789abc}'};
test('hidden exact Core task from the official service view retains process ancestry proof',()=>{
 const r=simulateWsh({instances:0,hidden:[hiddenCore]});
 assert.equal(r.linked,true);assert.equal(r.code,'TASK_ENGINE_CHAIN_MATCH');
 assert.equal(r.createdAtMs,start);assert.equal(r.visibleInstances,1);
});
test('hidden lookup rejects other tasks, missing identity and inaccessible service',()=>{
 for(const row of [{...hiddenCore,Path:'\\ZGMINI-PC-Local-Korea'},
  {...hiddenCore,Path:'\\nested\\ZGMINI-PC-Local-Core'},
  {...hiddenCore,InstanceGuid:''},{...hiddenCore,State:3},
  {...hiddenCore,EnginePID:0}])assert.equal(simulateWsh({instances:0,hidden:[row]}).linked,false);
 assert.equal(simulateWsh({instances:0,hiddenError:true}).linked,false);
 assert.equal(simulateWsh({instances:0,hidden:[hiddenCore],rows:processRows.map(
  x=>x.ProcessId===60?{...x,ParentProcessId:999}:x)}).linked,false);
});
test('EnginePID requires a real WMI process anchor created no later than its child',()=>{
 const missingEngine=processRows.filter(x=>x.ProcessId!==10);
 const reusedEngine=processRows.map(x=>x.ProcessId===10?
  {...x,CreationDate:'20261121160002.000000+540'}:x);
 const reusedWrapper=processRows.map(x=>x.ProcessId===55?
  {...x,CreationDate:'20261121160003.000000+540'}:x);
 for(const rows of [missingEngine,reusedEngine,reusedWrapper]){
  const visible=simulateWsh({rows});
  assert.equal(visible.linked,false);
  assert.equal(visible.code,'TASK_ENGINE_CHAIN_UNVERIFIED');
  const hidden=simulateWsh({rows,instances:0,hidden:[hiddenCore]});
  assert.equal(hidden.linked,false);
  assert.equal(hidden.code,'TASK_ENGINE_CHAIN_UNVERIFIED');
 }
});

test('invisible Task instance, disabled Task, wrong command and sibling process fail closed',()=>{
 assert.equal(simulateWsh({instances:0}).linked,false);
 assert.equal(simulateWsh({state:3}).linked,false);
 assert.equal(simulateWsh({enabled:false}).linked,false);
 assert.equal(simulateWsh({taskError:true}).linked,false);
 assert.equal(simulateWsh({rows:processRows.map(x=>x.ProcessId===60?
  {...x,CommandLine:x.CommandLine+' --unexpected'}:x)}).linked,false);
 assert.equal(simulateWsh({rows:processRows.map(x=>x.ProcessId===60?
  {...x,ParentProcessId:12345}:x)}).linked,false);
 assert.equal(simulateWsh({pid:'999'}).linked,false);
 assert.equal(simulateWsh({script:String.raw`C:\outside\local-cycle.mjs`}).linked,false);
});
test('wrapper verifies only close-in-time current PID proof, never trusts malformed output',()=>{
 const known={ok:true,linked:true,code:'TASK_ENGINE_CHAIN_MATCH',
  createdAtMs:start,visibleInstances:1};
 const capture=(result)=>captureCoreOriginAtStart({platform:'win32',pid:60,startedAt:start,
  entrypoint:path,exists:()=>true,spawn:(exe,args,opts)=>{
   assert.match(exe,/cscript\.exe$/i);
   assert.equal(args[3],'60');
   assert.equal(args[4],path);
   assert.equal(opts.shell,false);
   return {status:0,stdout:JSON.stringify(result)};
  }});
 assert.equal(capture(known).status,'PASS');
 assert.equal(capture({...known,createdAtMs:start-40000}).status,'UNVERIFIED');
 assert.equal(capture({...known,code:'CORE_TASK_ENGINE_NOT_VISIBLE'}).status,'UNVERIFIED');
 assert.equal(capture({...known,visibleInstances:0}).status,'UNVERIFIED');
 assert.equal(capture({...known,linked:false}).status,'UNVERIFIED');
 assert.equal(capture({...known,createdAtMs:null}).status,'UNVERIFIED');
});
test('missing host capability or bad probe never blocks the Core cycle',()=>{
 assert.equal(captureCoreOriginAtStart({platform:'linux'}).status,'UNVERIFIED');
 assert.equal(captureCoreOriginAtStart({platform:'win32',pid:60,startedAt:start,
  exists:()=>false}).status,'UNVERIFIED');
 assert.equal(captureCoreOriginAtStart({platform:'win32',pid:60,startedAt:start,
  exists:()=>true,spawn:()=>({status:1,stdout:'--token=SECRET_NEVER_PRINT'})}).status,'UNVERIFIED');
});
