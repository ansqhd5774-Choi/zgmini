import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {IRAN_NEWS_ANALYSIS_TASK_R1,analysisR1Files,runScheduledIranNewsAnalysisR1}
 from '../scripts/iran-progress/news-analysis-scheduled-r1.mjs';
import {planIranNewsAnalysisTaskR1,taskR1Matches}
 from '../scripts/iran-progress/news-analysis-schedule-r1.mjs';

test('isolated schedule never overwrites the existing Iran PC task',()=>{
 const plan=planIranNewsAnalysisTaskR1({principal:'USER\\operator',
  node:'E:\\ZGmini\\runtime\\node.exe',
  sourceScript:'E:\\ZGmini\\projects\\zgmini\\scripts\\iran-progress\\news-analysis-scheduled-r1.mjs',
  workdir:'E:\\ZGmini\\projects\\zgmini',startAt:Date.parse('2026-10-29T08:00:00Z')});
 assert.equal(plan.task,IRAN_NEWS_ANALYSIS_TASK_R1);
 assert.match(plan.xml,/PT10M/);
 assert.match(plan.xml,/MultipleInstancesPolicy>IgnoreNew/);
 assert.match(plan.xml,/LogonType>InteractiveToken/);
 assert.match(plan.xml,/news-analysis-scheduled-r1\.mjs/);
 assert.equal(taskR1Matches(plan,plan.xml),true);
 assert.equal(taskR1Matches(plan,plan.xml.replace('PT10M','PT1M')),false);
 assert.doesNotMatch(plan.xml,/ZGMINI-PC-Iran-Progress-R13|ZGMINI-PC-Local-Core/);
});

test('scheduled cycle calls incremental Ollama, preflight, publish in order',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'zg-iran-news-r1-'));
 try{
  const calls=[];
  const result=runScheduledIranNewsAnalysisR1({dataDirectory:directory,now:123456,
   run:(node,args,options)=>{
    calls.push({node,args,options});
    const payload=calls.length===1?{status:'PARTIAL',ready:2,pending:5}:
     calls.length===2?{status:'DRY_RUN_VALIDATED',itemCount:2,pendingCount:5}:
     {status:'VERIFIED',itemCount:2,pendingCount:5};
    return {status:0,stdout:JSON.stringify(payload)+'\n'};
   }});
  assert.equal(result.status,'PUBLISHED_READBACK_VERIFIED');
  assert.equal(result.steps.length,3);
  assert.equal(calls.length,3);
  assert(calls[0].args.some(s=>s.includes('--mode=cycle')));
  assert(calls[0].args.some(s=>s.includes('--max-new=16')));
  assert(calls[1].args.some(s=>s==='--mode=dry-run'));
  assert(calls[2].args.some(s=>s==='--mode=publish'));
  assert.equal(result.r5ScoreChanges,0);
  assert.equal(fs.existsSync(analysisR1Files(directory).lastRun),true);
  assert.equal(JSON.parse(fs.readFileSync(analysisR1Files(directory).lastRun,'utf8')).status,
   'PUBLISHED_READBACK_VERIFIED');
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('failed analysis never runs D1 preflight or publisher',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'zg-iran-news-r1-'));
 try{
  let calls=0;
  const result=runScheduledIranNewsAnalysisR1({dataDirectory:directory,now:123456,
   run:()=>{calls++;return {status:1,stdout:JSON.stringify({status:
    'NEWS_R41_ANALYSIS_CYCLE_FAILED',reason:'NEWS_R41_ANALYSIS_OLLAMA_OFFLINE'})};}});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.failedStep,'ANALYZE');
  assert.equal(calls,1);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
