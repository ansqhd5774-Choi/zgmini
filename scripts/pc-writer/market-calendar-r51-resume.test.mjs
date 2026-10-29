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
 const result=await resume({outputDir,inspect:()=>({before:1}),runner:async()=>{count++;return {status:'R51_PROVIDER_HTTP_429',file:'failed.txt'};}});
 assert.equal(result.status,'R51_RESUME_STOP');
 assert.equal(result.error,'R51_PROVIDER_HTTP_429');
 assert.equal(count,1);
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
