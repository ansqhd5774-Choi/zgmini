import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {resume} from './market-calendar-r51-resume.mjs';

function withFolder(t){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'r51-resume-'));
 t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 return folder;
}
function writeReport(outputDir,n,overrides={}){
 const data={status:'R51_BATCH_STORED',batchNumber:n,totalBatches:20,plannedInBatch:120,providerRequests:3,dbWrites:0,d1Writes:0,productionStarsChanged:false,batchReadbackVerified:true,...overrides};
 const file=`collect-step-${n}.txt`;
 const fields=['AUDIT=MARKET_CALENDAR_R51_PRICE_COVERAGE',...Object.entries(data).map(([k,v])=>`${k}=${JSON.stringify(v)}`)].join('\r\n');
 fs.writeFileSync(path.join(outputDir,file),fields);
 return {status:data.status,file};
}

test('resumes two remaining batches and stops at completion',async t=>{
 const outputDir=withFolder(t);let count=0;
 const result=await resume({outputDir,inspect:()=>({before:18}),runner:async()=>writeReport(outputDir,19+count++)});
 assert.equal(result.status,'R51_RESUME_COMPLETE');
 assert.equal(count,2);
 assert.match(fs.readFileSync(path.join(outputDir,result.report),'utf8'),/LATEST_BATCH=20/);
});
test('stops immediately on provider failure while preserving step report',async t=>{
 const outputDir=withFolder(t);let count=0;
 const result=await resume({outputDir,inspect:()=>({before:1}),runner:async()=>{count++;return writeReport(outputDir,2,{status:'R51_PROVIDER_HTTP_429',providerRequests:1});}});
 assert.equal(result.status,'R51_RESUME_STOP');
 assert.equal(result.error,'R51_PROVIDER_HTTP_429');
 assert.equal(count,1);
});
test('recovers after two transient timeouts without exceeding per-batch request budget',async t=>{
 const outputDir=withFolder(t),budgets=[],progress=[];let attempt=0;
 const result=await resume({outputDir,inspect:()=>({before:19}),wait:async()=>{},onProgress:line=>progress.push(line),runner:async({maxRequests})=>{
  budgets.push(maxRequests);attempt++;
  if(attempt<3)return writeReport(outputDir,20,{status:'R51_PROVIDER_TIMEOUT',providerRequests:2});
  return writeReport(outputDir,20,{providerRequests:3});
 }});
 assert.equal(result.status,'R51_RESUME_COMPLETE');
 assert.deepEqual(budgets,[12,10,8]);
 assert.equal(attempt,3);
 assert.match(fs.readFileSync(path.join(outputDir,'MARKET_CALENDAR_R51_LATEST_RESULT.txt'),'utf8'),/LATEST_BATCH=20/);
 assert(progress.some(s=>s.includes('재시도')));
});
test('stops before further transient retries when twelve-request budget is exhausted',async t=>{
 const outputDir=withFolder(t);let count=0;
 const result=await resume({outputDir,inspect:()=>({before:2}),wait:async()=>{},runner:async({maxRequests})=>{
  count++;
  return writeReport(outputDir,3,{status:'R51_PROVIDER_NETWORK_FAILURE',providerRequests:maxRequests});
 }});
 assert.equal(result.status,'R51_RESUME_STOP');
 assert.equal(result.error,'R51_PROVIDER_NETWORK_FAILURE');
 assert.equal(count,1);
});
test('preexisting recovery lock is preserved and no provider call starts',async t=>{
 const outputDir=withFolder(t),pcHome=withFolder(t);
 const lock=path.join(pcHome,'resume-recovery.lock');
 fs.writeFileSync(lock,'existing-owner');
 const result=await resume({outputDir,inspect:()=>({before:2,base:pcHome}),runner:async()=>{throw Error('MUST_NOT_RUN');}});
 assert.equal(result.error,'R51_RESUME_ALREADY_RUNNING_STOP');
 assert.equal(fs.readFileSync(lock,'utf8'),'existing-owner');
});
test('new Windows recovery command uses approved runtime and no permanent launch marker',()=>{
 const content=fs.readFileSync(new URL('../../tools/market-calendar-r51/MARKET_CALENDAR_R51_RECOVER_AND_CONTINUE.cmd',import.meta.url));
 const text=content.toString('ascii');
 assert.match(text,/E:\\ZGmini\\runtime\\node\.exe/);
 assert.match(text,/"%~dp0\."/);
 assert.match(text,/pause/);
 assert.doesNotMatch(text,/ALREADY_LAUNCHED|MARKET_CALENDAR_R51_RESUME_LAUNCH_RESULT/);
 assert.equal(content.includes(Buffer.from('\r\n')),true);
 assert.equal(content.includes(Buffer.from([0xef,0xbb,0xbf])),false);
});
test('rejects inconsistent batch readback',async t=>{
 const outputDir=withFolder(t);
 const result=await resume({outputDir,inspect:()=>({before:1}),runner:async()=>writeReport(outputDir,5)});
 assert.equal(result.error,'R51_RESUME_BATCH_READBACK_STOP');
});
test('enforces upper bound on batch count',async t=>{
 const outputDir=withFolder(t);
 await assert.rejects(resume({outputDir,maxNewBatches:20}),/R51_RESUME_ARGUMENT_STOP/);
});
