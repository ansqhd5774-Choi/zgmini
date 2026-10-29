import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {summarizeR82Xml,summarizeR82Manifest,summarizeR82Checkpoint,
 summarizeR82Verbose,decodeR82Windows,collectR82}
 from '../scripts/pc-writer/theme-ten-r82-optional-runtime-readonly.mjs';

const XML=[
 '<?xml version="1.0"?>',
 '<Task><Triggers><CalendarTrigger><StartBoundary>2026-10-29T13:00:00</StartBoundary></CalendarTrigger></Triggers>',
 '<Principals><Principal><UserId>PRIVATE_USER_DO_NOT_OUTPUT</UserId><LogonType>InteractiveToken</LogonType></Principal></Principals>',
 '<Settings><StartWhenAvailable>false</StartWhenAvailable><DisallowStartIfOnBatteries>true</DisallowStartIfOnBatteries></Settings>',
 '<Actions><Exec><Command>C:\\Windows\\System32\\cmd.exe</Command>',
 '<Arguments>/d /c &quot;&quot;C:\\Users\\SECRET_USER\\Desktop\\DATA_CENTER_POWER_R5_SCHEDULED.cmd&quot;&quot;</Arguments></Exec></Actions></Task>'
].join('');
const write=(file,data)=>{fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,data);};

test('R82 summarizes scheduler actions but never returns principal, arg or private directory',()=>{
 const result=summarizeR82Xml(XML);
 assert.equal(result.xmlReadable,true);
 assert.equal(result.execCount,1);
 assert.equal(result.action,'DATA_CENTER_POWER_R5_SCHEDULED.cmd');
 assert.equal(result.scheduledTime,'13:00');
 assert.equal(result.startWhenAvailable,false);
 assert.equal(result.disallowOnBattery,true);
 assert.equal(result.logonType,'InteractiveToken');
 assert.equal(result._runner,'C:\\Users\\SECRET_USER\\Desktop\\DATA_CENTER_POWER_R5_SCHEDULED.cmd');
 assert.equal(JSON.stringify({...result,_runner:undefined}).includes('SECRET_USER'),false);
});

test('R82 handles Windows UTF16LE and conservative last-run parser',()=>{
 const bytes=Buffer.concat([Buffer.from([255,254]),Buffer.from(XML,'utf16le')]);
 assert.equal(decodeR82Windows(bytes),XML);
 const verbose=summarizeR82Verbose('Last Run Time: 10/29/2026 1:00:00 PM\nLast Result: 0x0\nNext Run Time: 10/30/2026 1:00:00 PM\nTask To Run: PRIVATE_USER');
 assert.equal(verbose.lastResult,'0x0');
 assert.ok(!JSON.stringify(verbose).includes('PRIVATE_USER'));
});

test('R82 only reads manifest dates and checkpoint reasons, never raw price payload',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r82-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const manifest=path.join(root,'themes','data-center-power','raw-manifest.json');
 write(manifest,JSON.stringify({version:1,themeId:'data-center-power',files:[
  {path:'raw/DTCR_a.jsonl',observationThrough:'2026-10-23',rawPriceSecret:'DO_NOT_OUTPUT'},
  {path:'raw/GRID_b.jsonl',observationThrough:'2026-10-27'},
  {path:'raw/SPY_c.jsonl',observationThrough:'2026-10-23'}]}));
 const checkpoint=path.join(root,'themes','data-center-power','state','collection-0123456789abcdef.json');
 write(checkpoint,JSON.stringify({version:1,themeId:'data-center-power',
  start:'2026-10-24',end:'2026-10-30',failedAt:'2026-10-29T01:00:00Z',
  reason:'HTTP_502',rawPriceSecret:'DO_NOT_OUTPUT',
  symbols:{DTCR:{complete:false},GRID:{complete:true},SPY:{complete:true}}}));
 const summary=summarizeR82Manifest({dataRoot:root,themeId:'data-center-power',
  symbols:['DTCR','GRID','SPY']});
 assert.equal(summary.symbols.DTCR.latestObservationDate,'2026-10-23');
 assert.equal(summary.symbols.GRID.latestObservationDate,'2026-10-27');
 assert.equal(summary.rawFilesIndividuallyRehashed,false);
 const state=summarizeR82Checkpoint({dataRoot:root,themeId:'data-center-power'});
 assert.equal(state.blockedCount,1);
 assert.equal(state.latest.reason,'HTTP_502');
 assert.ok(!JSON.stringify([summary,state]).includes('DO_NOT_OUTPUT'));
});

test('R82 mocks Windows read-only tasks and reports no space scheduler without inferred success',()=>{
 const run=(_exe,args)=>{
  if(args.includes('/XML'))return {status:0,stdout:Buffer.from(XML)};
  if(args.includes('/CSV'))return {status:0,stdout:Buffer.from('ZGMINI-PC-Theme-Data-Center-Power')};
  return {status:0,stdout:Buffer.from('Last Result: 0x0')};
 };
 const result=collectR82({platform:'win32',dataRoot:'/not/a/real/pc',run});
 assert.equal(result.status,'R82_READ_ONLY_COMPLETED_REVIEW_ACTION_AND_CHECKPOINT');
 assert.deepEqual(result.possibleSpaceTasks,[]);
 assert.equal(result.tasks.length,4);
 assert.equal(result.tasks[0].xml.action,'DATA_CENTER_POWER_R5_SCHEDULED.cmd');
 assert.equal(JSON.stringify(result).includes('SECRET_USER'),false);
 assert.deepEqual([result.taskWrites,result.rawWrites,result.providerCalls,
  result.d1Writes,result.scheduleChanges,result.publicationWrites],[0,0,0,0,0,0]);
});

test('R82 refuses non-Windows instead of starting partial inspection',()=>{
 assert.equal(collectR82({platform:'linux'}).status,'STOP_WINDOWS_PC_REQUIRED');
});
