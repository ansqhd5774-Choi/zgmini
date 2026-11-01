import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runLiveR45Inventory,traceLiveCore} from '../scripts/pc-writer/market-calendar-r45-pc-live-inventory.mjs';

const root='/private/mock-zgmini';
const base='/private/pc-data';
const outer='/private/mock-zgmini/core-outer.vbs';
const nested='/private/mock-zgmini/core-nested.vbs';
const entry=`${root}/scripts/pc-writer/local-cycle.mjs`;
const collector=`${root}/scripts/pc-writer/collect-local.mjs`;
const head='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const oldSource='154c5ac25120ecf8292b630ca9b1e30edad1ed75';
const approved=fs.readFileSync(fileURLToPath(new URL('../scripts/pc-writer/collect-local.mjs',import.meta.url)));
const xml=`<Task><Triggers><CalendarTrigger><Repetition><Interval>PT5M</Interval></Repetition></CalendarTrigger></Triggers><Actions><Exec><Command>wscript.exe</Command><Arguments>"${outer}"</Arguments></Exec></Actions></Task>`;
const run=text=>`shell.Run ("${text.replaceAll('"','""')}", 0, True)`;
const bareRun=text=>`shell.Run "${text.replaceAll('"','""')}", 0, True`;
const blob=bytes=>createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');

function setup({r45=false,configHead=head,dirty=false,coreRun=run(`"/runtime/node.exe" "${entry}"`)}={}){
 const actual=r45?Buffer.from(approved.toString().replace(
  "import {collectReleaseCalendar} from './release-calendar.mjs';",
  "import {collectReleaseCalendar} from './release-calendar.mjs';\n// R45_MARKETPARQUET_SNAPSHOT_OBSERVER")):approved;
 const map=new Map([
  [outer,Buffer.from(`Set shell=CreateObject("WScript.Shell")\n${run(`"wscript.exe" "${nested}"`)}\n${run('"/runtime/node.exe" "/private/mock-zgmini/scripts/pc-writer/archive-run.mjs"')}\n`)],
  [nested,Buffer.from(`Set shell=CreateObject("WScript.Shell")\n${coreRun}\n`)],
  [entry,Buffer.from('// project Core launcher\n')],
  [collector,actual],
  [path.join(base,'config.json'),Buffer.from(JSON.stringify({source:configHead,privateToken:'KEEP_PRIVATE'}))],
 ]);
 const calls=[];
 const options={base,allowNonWindows:true,taskXml:()=>xml,
  readFile:(file)=>{calls.push(['read',file]);return map.get(file)??null;},
  lockCheck:()=> 'PID_EXISTS_NOT_PROVEN_ACTIVE',
  gitCall:(_,args)=>{
   calls.push(['git',args[0]]);
   if(args[0]==='rev-parse'&&args[1]==='--show-toplevel')return root;
   if(args[0]==='rev-parse'&&args[1]==='HEAD')return head;
   if(args[0]==='rev-parse'&&args[1]?.startsWith('HEAD:'))
    return blob(actual);
   if(args[0]==='status')return dirty?' M scripts/pc-writer/collect-local.mjs':'';
   throw Error('unexpected git operation');
  }};
 return {map,calls,options};
}

test('actual two-layer Core wrapper is traced without requiring obsolete R50 hash',()=>{
 const t=setup();
 const chain=traceLiveCore(xml,{readFile:file=>t.map.get(file)??null});
 assert.equal(chain.status,'CORE_CHAIN_TRACED_READ_ONLY');
 assert.equal(chain.legacyR50OuterHashMatched,false);
 assert.equal(chain.coreVbsCount,2);
 assert.equal(chain.auxiliaryRunCount,1);
 assert.equal(chain.knownArchiveRunSeen,true);
 assert.equal(chain.pt5mInTaskXml,true);
 assert.equal(chain.root,root);
 assert.equal(chain.entryName,'local-cycle.mjs');
});

test('valid bare VBScript Run literal resolves the same Core without executing commands',()=>{
 const t=setup({coreRun:bareRun(`"/runtime/node.exe" "${entry}"`)});
 const result=runLiveR45Inventory(t.options);
 assert.equal(result.launcherStatus,'CORE_CHAIN_TRACED_READ_ONLY');
 assert.equal(result.decision,'OBSERVER_ALREADY_OFF_NO_PC_CHANGE');
 assert.equal(result.coreVbsCount,2);
 assert.equal(result.coreChainShape[1].bareLiteralRunCount,1);
 assert.equal(result.coreChainShape[1].dynamicRunPresent,false);
 assert.equal(result.pcFilesChanged,0);
});

test('R1-compatible parenthesized Run accepts prefixed assignment in outer VBS',()=>{
 const t=setup();
 const original=t.map.get(outer).toString('utf8');
 t.map.set(outer,Buffer.from(original.replaceAll('shell.Run (','result = shell.Run (')));
 const result=runLiveR45Inventory(t.options);
 assert.equal(result.launcherStatus,'CORE_CHAIN_TRACED_READ_ONLY');
 assert.equal(result.coreVbsCount,2);
 assert.equal(result.coreChainShape[0].literalRunCount,2);
 assert.equal(result.knownArchiveRunSeen,true);
 assert.equal(result.pcFilesChanged,0);
});

test('Chr(34) and constant concatenation resolve a dynamic Core command without VBScript execution',()=>{
 const t=setup();
 t.map.set(nested,Buffer.from([
  'Set shell = CreateObject("WScript.Shell")',
  'Const q = Chr(34)',
  'n = "/runtime/" & "node.exe"',
  's = "/private/mock-zgmini/scripts" & "/pc-writer/local-cycle.mjs"',
  'command = q & n & q & " " & q & s & q',
  'shell.Run command, 0, True',
  'unknown = Environ("SECRET_VALUE")',
  'shell.Run unknown, 0, True',
  'shell.Run command, 0, True',
 ].join('\n')));
 const result=runLiveR45Inventory(t.options);
 assert.equal(result.launcherStatus,'CORE_CHAIN_STATICALLY_TRACED_REVIEW_REQUIRED');
 assert.equal(result.entryName,'local-cycle.mjs');
 assert.equal(result.sourceHead,head);
 assert.equal(result.coreChainShape[1].staticResolvedRunCount,2);
 assert.equal(result.coreChainShape[1].unresolvedRunCount,1);
 assert.equal(result.coreChainShape[1].literalRunCount,0);
 assert.equal(result.decision,'INVENTORY_STATIC_ORIGIN_REVIEW_REQUIRED');
 assert.doesNotMatch(JSON.stringify(result),/SECRET_VALUE|\/private\/mock-zgmini/);
 assert.equal(result.pcFilesChanged,0);
});

test('live inventory reports current Task, launcher, config, checkout and R45 without writes',()=>{
 const t=setup();
 const before=[...t.map].map(([key,value])=>[key,Buffer.from(value)]);
 const result=runLiveR45Inventory(t.options);
 assert.equal(result.decision,'OBSERVER_ALREADY_OFF_NO_PC_CHANGE');
 assert.equal(result.r45Observer,'OFF_EXACT_BRANCH');
 assert.equal(result.configMatchesHead,true);
 assert.equal(result.oldR56SourceMatched,false);
 assert.equal(result.protectedTrackedClean,true);
 assert.equal(result.collectorMatchesHead,true);
 assert.equal(result.coreLock,'PID_EXISTS_NOT_PROVEN_ACTIVE');
 assert.equal(result.legacyR50OuterHashMatched,false);
 assert.equal(result.pcFilesChanged,0);
 assert.equal(result.providerCalls,0);
 assert.equal(result.schedulerChanged,false);
 assert.equal(result.dbWrites,0);
 assert.equal(result.published,false);
 assert.ok(t.calls.every(([type,arg])=>type==='read'||type==='git'&&
  ['rev-parse','status'].includes(arg)));
 assert.deepEqual([...t.map],before);
 assert.doesNotMatch(JSON.stringify(result),/KEEP_PRIVATE|privateToken|\/private\/mock-zgmini|\/private\/pc-data/);
});

test('changed collector with R45 marker is diagnosis-only, not a detach approval',()=>{
 const t=setup({r45:true});
 const result=runLiveR45Inventory(t.options);
 assert.equal(result.r45Observer,'PRESENT_DIFFERENT_BLOB_REVIEW');
 assert.equal(result.decision,'INVENTORY_TRACED_REVIEW_REQUIRED');
 assert.equal(result.pcFilesChanged,0);
});

test('config drift and tracked dirt cannot be mistaken for approved state',()=>{
 const t=setup({configHead:oldSource,dirty:true});
 const result=runLiveR45Inventory(t.options);
 assert.equal(result.configMatchesHead,false);
 assert.equal(result.protectedTrackedClean,false);
 assert.equal(result.decision,'INVENTORY_INCOMPLETE_REVIEW_REQUIRED');
});

test('dynamic or altered first Run is never executed or guessed',()=>{
 const t=setup({coreRun:'shell.Run someVariable & "PRIVATE_KEY_VALUE", 0, True'});
 const result=runLiveR45Inventory(t.options);
 assert.equal(result.launcherStatus,'CORE_RUN_SHAPE_UNVERIFIED');
 assert.equal(result.coreChainShape[1].dynamicRunPresent,true);
 assert.equal(result.coreChainShape[1].hasConcat,true);
 assert.equal(result.sourceHead,null);
 assert.equal(result.decision,'INVENTORY_INCOMPLETE_REVIEW_REQUIRED');
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_KEY_VALUE|someVariable/);
});

test('CLI refuses --apply before querying PC or touching data',()=>{
 const program=fileURLToPath(new URL('../scripts/pc-writer/market-calendar-r45-pc-live-inventory.mjs',import.meta.url));
 const child=spawnSync(process.execPath,[program,'--apply'],{encoding:'utf8'});
 if(child.error?.code==='EPERM'){
  // Some sandboxed test runners forbid nested OS process launches. The CLI
  // is also tested by a direct node invocation outside this test process.
  const source=fs.readFileSync(program,'utf8');
  assert.match(source,/process\.argv\.some\(a=>a==='--apply'/);
  assert.match(source,/READ_ONLY_ARGUMENTS_ONLY_STOP/);
  return;
 }
 assert.equal(child.status,2);
 const result=JSON.parse(child.stdout);
 assert.equal(result.decision,'READ_ONLY_ARGUMENTS_ONLY_STOP');
 assert.equal(result.pcFilesChanged,0);
});
