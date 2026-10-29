import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateDefinition,registerDefinition,readRegistered,digest} from '../scripts/pc-writer/theme-config-registry.mjs';
import {collectConfigured} from '../scripts/pc-writer/theme-optional-collect.mjs';
import {planRegistered,runConfiguredOnce,runConfiguredSchedule} from '../scripts/pc-writer/theme-config-tool.mjs';
import {installConfiguredTool} from '../scripts/pc-writer/theme-config-install.mjs';
import {execFileSync} from 'node:child_process';
import {scoreRegistered} from '../scripts/pc-writer/theme-config-score.mjs';
import {scoreAll252} from '../scripts/pc-writer/theme-optional-score-r188.mjs';
const definition={schema:'ZGMINI_THEME_CONFIG_V1',id:'fixture-theme',label:'검증용 테마',provider:'getmarkethistory',profile:'ADAPTIVE_R2_PAIR_R3',etfs:['AAA','BBB'],benchmark:'SPY',startDate:'2023-01-01'};
const legacy={themes:[{id:'biotech',label:'바이오·신약'}]};
function setup(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'zg-theme-config-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function register(root,d=definition){return registerDefinition({dataRoot:root,definition:d,legacyRegistry:legacy});}
test('data-only schema rejects code, traversal, arbitrary formula, weights and duplicate ETFs',()=>{
 assert.deepEqual(validateDefinition(definition),definition);
 for(const d of [{...definition,command:'cmd.exe'}, {...definition,id:'../x'}, {...definition,etfs:['AAA','AAA']},{...definition,etfs:['AAA','BBB','CCC']},{...definition,weights:[.7,.3]},{...definition,provider:'https://evil.test'},{...definition,profile:'NEW'},{...definition,benchmark:'QQQ'}])assert.throws(()=>validateDefinition(d));
});
test('registration is idempotent, immutable and cannot replace legacy identities',t=>{
 const root=setup(t);assert.equal(register(root).writes,1);assert.equal(register(root).writes,0);
 assert.throws(()=>register(root,{...definition,label:'different'}),/DIFFERENT_CONTENT/);
 assert.throws(()=>register(root,{...definition,id:'biotech'}),/LEGACY_THEME_COLLISION/);
 assert.throws(()=>register(root,{...definition,label:'바이오·신약'}),/LEGACY_THEME_COLLISION/);
 assert.equal(planRegistered(root,definition.id).status,'REGISTERED_AWAITING_SOURCE');
 assert.equal(fs.existsSync(path.join(root,'themes')),false);
});
test('junction escape is rejected before creating files outside data root',t=>{
 const root=setup(t),outside=setup(t);fs.symlinkSync(outside,path.join(root,'theme-config'),process.platform==='win32'?'junction':'dir');
 assert.throws(()=>register(root),/DIRECTORY_REDIRECT/);assert.deepEqual(fs.readdirSync(outside),[]);
});
test('registered collector uses three configured symbols and preserves immutable raw checkpoint',async t=>{
 const root=setup(t);register(root);const requests=[];
 const fetchImpl=async url=>{requests.push(url);const symbol=url.pathname.split('/').at(-2);return new Response(JSON.stringify({symbol,timestamp:'2026-10-27T19:00:00Z',close:100,is_gap:false})+'\n');};
 const args={dataRoot:root,id:definition.id,start:'2023-01-01',end:'2026-10-28',fetchImpl};
 const result=await collectConfigured(args);assert.equal(result.providerCalls,3);assert.equal(result.status,'PRIVATE_RAW_COLLECTION_COMPLETE');
 assert.deepEqual(requests.map(u=>u.pathname.split('/').at(-2)),['AAA','BBB','SPY']);
 assert.equal((await collectConfigured(args)).providerCalls,0);
 assert.equal(scoreRegistered({dataRoot:root,registration:readRegistered(root,definition.id)}).score,null);
});
test('empty and HTTP failure preserve existing raw and never generate a score',async t=>{
 for(const status of [200,502]){
  const root=setup(t);register(root);const fetchImpl=async()=>new Response('',{status});
  if(status===200)assert.equal((await collectConfigured({dataRoot:root,id:definition.id,start:'2023-01-01',end:'2026-10-28',fetchImpl})).status,'WAIT_SOURCE_EMPTY');
  else assert.equal((await collectConfigured({dataRoot:root,id:definition.id,start:'2023-01-01',end:'2026-10-28',fetchImpl})).status,'STOP_HTTP_502');
  let calls=0;const again=await collectConfigured({dataRoot:root,id:definition.id,start:'2023-01-01',end:'2026-10-28',fetchImpl:async()=>{calls++;return new Response('');}});
  assert.equal(calls,status===502?0:1);assert.equal(again.status,status===502?'WAIT_TRANSIENT_NEXT_DAY':'WAIT_SOURCE_EMPTY');
 }
});
function fixtureManifest(root,young=false){
 register(root);const home=path.join(root,'themes','registered-'+definition.id),raw=path.join(home,'raw');fs.mkdirSync(raw,{recursive:true});
 const nyHour=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'});
 const dates=[];for(let d=new Date('2020-01-02T20:00:00Z');dates.length<1000;d=new Date(+d+86400000))if(![0,6].includes(d.getUTCDay()))dates.push(new Date(+d-(Number(nyHour.format(d))-15)*3600000).toISOString());
 const files=[],prices={};
 for(const [j,symbol] of ['AAA','BBB','SPY'].entries()){
  const rows=dates.filter((_,i)=>!young||symbol!=='BBB'||i>=880).map((date,i)=>({symbol,timestamp:date,close:100*Math.exp(.0003*i+.02*Math.sin(i/(9+j*4))+.01*Math.cos(i/(21+j))),is_gap:false}));
  prices[symbol]=rows.map(r=>r.close);
  const body=rows.map(JSON.stringify).join('\n')+'\n',sha=digest(body),name=symbol+'_'+sha+'.jsonl';fs.writeFileSync(path.join(raw,name),body);
  files.push({path:'raw/'+name,sha256:sha,source:'https://getmarkethistory.com',priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',collectedAt:'2026-10-29T00:00:00Z',observationThrough:dates.at(-1).slice(0,10)});
 }
 fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify({version:1,themeId:'registered-'+definition.id,files}));return prices;
}
test('generic long pair reuses R188 scores and 50:50 without synthetic histories',t=>{
 const root=setup(t);fixtureManifest(root);const result=scoreRegistered({dataRoot:root,registration:readRegistered(root,definition.id)});
 assert.equal(result.history.length,252);assert.equal(result.status,'PRIVATE_SCORE_READY');
 // Rebuild selected proxy-close prices from the same tested selector to compare
 // full R188 252-day output against every generic-adapter point.
 const home=path.join(root,'themes','registered-'+definition.id),manifest=JSON.parse(fs.readFileSync(path.join(home,'raw-manifest.json')));
 const series=Object.fromEntries(manifest.files.map(f=>[path.basename(f.path).split('_')[0],fs.readFileSync(path.join(home,f.path),'utf8').trim().split('\n').map(JSON.parse)]));
 return import('../scripts/pc-writer/theme-space-satellite-adaptive-r2.mjs').then(({selectRealHourlySessions})=>{
  const daily=Object.fromEntries(Object.entries(series).map(([s,r])=>[s,new Map(selectRealHourlySessions(r).map(p=>[p.date,p.close]))]));
  const dates=[...daily.SPY.keys()].filter(d=>daily.AAA.has(d)&&daily.BBB.has(d)).sort().slice(-628);
  const axes=['AAA','BBB'].map(s=>scoreAll252(dates.map(d=>daily[s].get(d)),dates.map(d=>daily.SPY.get(d))));
  assert.deepEqual(result.history.map(p=>p.score),axes[0].map((v,i)=>Number(((v+axes[1][i])/2).toFixed(5))));
  assert.equal(result.history.at(-1).weights.first,.5);
 });
});
test('scheduled collection has a durable global daily request budget and rotates themes',async t=>{
 const root=setup(t);register(root);register(root,{...definition,id:'second-theme',label:'두 번째'});
 let calls=0;const fetchImpl=async url=>{calls++;return new Response(JSON.stringify({symbol:url.pathname.split('/').at(-2),timestamp:'2026-10-27T19:00:00Z',close:100})+'\n');};
 const now=new Date('2026-10-29T00:00:00Z');
 const first=await runConfiguredSchedule({dataRoot:root,now,fetchImpl});assert.equal(first.providerCallsToday,4);assert.equal(calls,4);
 await runConfiguredSchedule({dataRoot:root,now,fetchImpl});assert.equal(calls,4);
 const next=await runConfiguredSchedule({dataRoot:root,now:new Date('2026-10-30T00:00:00Z'),fetchImpl});
 assert.ok(next.providerCallsToday<=4);assert.equal(next.d1Writes,0);
});
test('a failed configured theme does not prevent the next theme and budget survives failures',async t=>{
 const root=setup(t);register(root);register(root,{...definition,id:'second-theme',label:'두 번째'});let calls=0;
 const result=await runConfiguredSchedule({dataRoot:root,now:new Date('2026-10-29T00:00:00Z'),fetchImpl:async url=>{
  calls++;return calls===1?new Response('',{status:502}):new Response(JSON.stringify({symbol:url.pathname.split('/').at(-2),timestamp:'2026-10-27T19:00:00Z',close:100})+'\n');
 }});
 assert.equal(result.results.length,2);assert.equal(result.results[0].status,'STOP_HTTP_502');assert.equal(result.results[1].status,'PRIVATE_HISTORY_PENDING');assert.equal(calls,4);
});
test('portable install has exact readback, works offline, and registers no sample theme',t=>{
 const root=setup(t),result=installConfiguredTool({dataRoot:root,sourceSha:'a'.repeat(40)});
 assert.equal(result.existingTasksChanged,0);assert.equal(result.registeredThemesAdded,0);
 const runner=path.join(result.home,'versions',result.version,'scripts','pc-writer','theme-config-tool.mjs');
 assert.deepEqual(JSON.parse(execFileSync(process.execPath,[runner,'--list'],{encoding:'utf8',env:{...process.env,ZGMINI_DATA_ROOT:root}})),[]);
 assert.equal(runConfiguredSchedule({dataRoot:root}) instanceof Promise,true);
 assert.match(fs.readFileSync(path.join(result.home,'THEME_SCHEDULED.vbs'),'utf8'),/, 0, True/);
 assert.equal(installConfiguredTool({dataRoot:root,sourceSha:'a'.repeat(40)}).version,result.version);
});
test('mixed young pair retains missing dates and follows existing dynamic weights',t=>{
 const root=setup(t);fixtureManifest(root,true);const result=scoreRegistered({dataRoot:root,registration:readRegistered(root,definition.id)});
 assert.ok(result.history.some(p=>p.score===null));assert.ok(result.history.at(-1).score!==null);
 assert.ok(result.history.at(-1).weights.second>.3&&result.history.at(-1).weights.second<.5);
});
test('tampered stored prices are rejected without saving derived output',t=>{
 const root=setup(t);fixtureManifest(root);const dir=path.join(root,'themes','registered-'+definition.id,'raw');fs.appendFileSync(path.join(dir,fs.readdirSync(dir)[0]),' ');
 assert.throws(()=>scoreRegistered({dataRoot:root,registration:readRegistered(root,definition.id)}),/RAW_SHA/);
 assert.equal(fs.existsSync(path.join(root,'themes','registered-'+definition.id,'derived')),false);
});
test('one-shot private cycle readback, same-window dedup and next-day bounded recheck',async t=>{
 const root=setup(t);register(root);let calls=0;
 const fetchImpl=async url=>{calls++;return new Response(JSON.stringify({symbol:url.pathname.split('/').at(-2),timestamp:'2026-10-27T19:00:00Z',close:100})+'\n');};
 const result=await runConfiguredOnce({dataRoot:root,id:definition.id,end:'2026-10-28',fetchImpl});
 assert.equal(result.status,'PRIVATE_HISTORY_PENDING');assert.equal(result.collection.providerCalls,3);
 assert.equal((await runConfiguredOnce({dataRoot:root,id:definition.id,end:'2026-10-28',fetchImpl})).providerCalls,0);
 assert.equal(calls,3);
 assert.equal((await runConfiguredOnce({dataRoot:root,id:definition.id,end:'2026-10-29',fetchImpl})).collection.providerCalls,3);
});
