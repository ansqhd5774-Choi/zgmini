import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runPaidUsR2StoredCycle,readyPaidUsR2FullYearPublication}
  from '../scripts/pc-writer/us-breadth-paid-r2-cycle.mjs';

const dates=['2026-11-18','2026-11-19','2026-11-20'];
const row=(date,symbol,close)=>({date,symbol,close,volume:100,
  asset_type:'stock'});
const rows={
  [dates[0]]:[row(dates[0],'A',10),row(dates[0],'B',10)],
  [dates[1]]:[row(dates[1],'A',11),row(dates[1],'B',9)],
  [dates[2]]:[row(dates[2],'A',12),row(dates[2],'B',9)],
};
function storedMock(){
  return {
    paidDates:()=>dates,
    readPaidDaily:(base,type,date)=>({
      receipt:{
        schema:'ZGMINI_MP_PAID_FILE_V1',plan:'full',
        assetType:'stock_daily',date,
        sha256:(dates.indexOf(date)+1).toString(16).padStart(64,'0'),
        projectionSha256:(dates.indexOf(date)+10).toString(16).padStart(64,'0'),
        rows:rows[date].length,bytes:2048,
        priceMode:'SPLIT_ADJUSTED_DAILY_CLOSE',
        rawPublished:false,
      },
    }),
    readPaidProjection:(base,type,date)=>rows[date],
  };
}
test('read-only preview never creates files, collects or publishes',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r2-cycle-'));
  try{
    const res=await runPaidUsR2StoredCycle(root,{
      publish:false,maxPoints:2,store:storedMock(),
      now:Date.parse('2026-11-20T22:01:00.000Z'),
    });
    assert.equal(res.status,'US_PAID_R2_PRIVATE_PREVIEW');
    assert.equal(res.observationDate,'2026-11-20');
    assert.equal(res.comparedSessions,2);
    assert.equal(res.providerCalls,0);
    assert.equal(res.d1Writes,0);
    assert.equal(res.operationalWrites,0);
    assert.deepEqual(fs.readdirSync(root),[]);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('publish path stops before any file/D1 write without actual installed proof',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r2-scope-'));
  try{
    const res=await runPaidUsR2StoredCycle(root,{
      publish:true,maxPoints:2,store:storedMock(),
      now:Date.parse('2026-11-20T22:01:00.000Z'),
    });
    assert.equal(res.status,'US_PAID_R2_PC_CONFIG_UNAVAILABLE');
    assert.equal(res.publicationComplete,false);
    assert.equal(res.d1Writes,0);
    assert.deepEqual(fs.readdirSync(root),[]);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('missing full session fails both preview and requested publication',async()=>{
  const mock=storedMock();mock.paidDates=()=>[dates[0],dates[2]];
  const res=await runPaidUsR2StoredCycle('/nonexistent',{
    store:mock,publish:false,
  });
  assert.equal(res.status,'PAID_R2_STORED_SESSION_GAP');
  assert.equal(res.publicationComplete,false);
  assert.equal(res.d1Writes,0);
});

test('full-year R2 publication rejects partial points or receipts without requiring PC effects',()=>{
  const complete={
    comparedSessions:250,fullYearHistory:true,
    publicHistoryPreview:Array.from({length:250},()=>({})),
    privateSourceReceipts:Array.from({length:251},()=>({})),
  };
  assert.equal(readyPaidUsR2FullYearPublication(complete),true);
  assert.equal(readyPaidUsR2FullYearPublication(complete,2),false);
  assert.equal(readyPaidUsR2FullYearPublication({...complete,fullYearHistory:false}),false);
  assert.equal(readyPaidUsR2FullYearPublication({...complete,comparedSessions:249}),false);
  assert.equal(readyPaidUsR2FullYearPublication({...complete,
    publicHistoryPreview:complete.publicHistoryPreview.slice(1)}),false);
  assert.equal(readyPaidUsR2FullYearPublication({...complete,
    privateSourceReceipts:complete.privateSourceReceipts.slice(1)}),false);
  assert.equal(readyPaidUsR2FullYearPublication(null),false);
});

test('Core public-year gate precedes private output and D1 promotion',()=>{
  const cycle=fs.readFileSync(
    new URL('../scripts/pc-writer/us-breadth-paid-r2-cycle.mjs',import.meta.url),'utf8');
  const guard=cycle.indexOf('if(!readyPaidUsR2FullYearPublication(result,maxPoints))');
  const privateSave=cycle.indexOf('const save=savePrivatePaidUsBreadthR2(');
  const d1Import=cycle.indexOf("await import('./d1.mjs')");
  assert.ok(guard>0&&guard<privateSave&&privateSave<d1Import);
  assert.match(cycle,/US_PAID_R2_FULL_YEAR_HISTORY_REQUIRED/);
});
