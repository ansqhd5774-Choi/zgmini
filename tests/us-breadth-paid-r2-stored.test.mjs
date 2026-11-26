import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateStoredPaidUsBreadthR2}
  from '../scripts/pc-writer/us-breadth-paid-r2-stored.mjs';

const days=['2026-11-18','2026-11-19','2026-11-20'];
const row=(date,symbol,close)=>({
  date,symbol,close,volume:100,asset_type:'stock',
});
function fixture(){
  const rows={
    [days[0]]:[row(days[0],'A',10),row(days[0],'B',10),row(days[0],'C',10)],
    [days[1]]:[row(days[1],'A',11),row(days[1],'B',9),row(days[1],'C',10),row(days[1],'NEW',5)],
    [days[2]]:[row(days[2],'A',12),row(days[2],'B',10),row(days[2],'C',10),row(days[2],'NEW',4)],
  };
  const receipts=Object.fromEntries(days.map((d,i)=>[d,{
    schema:'ZGMINI_MP_PAID_FILE_V1',plan:'full',assetType:'stock_daily',
    date:d,sha256:String(i+1).repeat(64),
    projectionSha256:String(i+4).repeat(64),
    bytes:2048,rows:rows[d].length,
    priceMode:'SPLIT_ADJUSTED_DAILY_CLOSE',rawPublished:false,
  }]));
  const called=[];
  const store={
    paidDates:(base,type)=>{called.push(['dates',base,type]);return [...days];},
    readPaidDaily:(base,type,date)=>{
      called.push(['raw',base,type,date]);
      return {receipt:receipts[date],bytes:new Uint8Array()};
    },
    readPaidProjection:(base,type,date)=>{
      called.push(['projection',base,type,date]);return rows[date];
    },
  };
  return {rows,receipts,store,called};
}

test('verified paid current + consecutive history; only public percentages',async()=>{
  const {store,called}=fixture();
  const r=await calculateStoredPaidUsBreadthR2('/fixture',{store,maxPoints:2});
  assert.equal(r.status,'PAID_R2_STORED_PRIVATE_CALCULATED');
  assert.equal(r.prepared,true);
  assert.equal(r.publicationAllowed,false);
  assert.equal(r.comparedSessions,2);
  assert.equal(r.fullYearHistory,false);
  assert.equal(r.sourceLatestProviderDateVerified,false);
  assert.deepEqual(r.publicHistoryPreview.map(p=>p.date),days.slice(1));
  assert.deepEqual(r.publicHistoryPreview[0],{
    date:days[1],risingPct:25,unchangedPct:50,fallingPct:25,
  });
  assert.deepEqual(r.publicHistoryPreview[1],{
    date:days[2],risingPct:50,unchangedPct:25,fallingPct:25,
  });
  assert.equal('counts' in r.publicHistoryPreview[0],false);
  assert.equal('prices' in r.publicHistoryPreview[0],false);
  assert.equal(called.filter(x=>x[0]==='projection').length,3);
  assert.equal(r.providerCalls,0);
  assert.equal(r.d1Writes,0);
  assert.equal(r.operationalWrites,0);
});

test('missing entire previous trading day does not synthesize unchanged day',async()=>{
  const {store}=fixture();store.paidDates=()=>[days[0],days[2]];
  const r=await calculateStoredPaidUsBreadthR2('/fixture',{store});
  assert.equal(r.status,'PAID_R2_STORED_SESSION_GAP');
  assert.equal(r.prepared,false);assert.equal(r.d1Writes,0);
});

test('free, tampered and broken stored readback fail closed',async()=>{
  const f=fixture();f.receipts[days[2]].plan='free';
  const a=await calculateStoredPaidUsBreadthR2('/fixture',{store:f.store,maxPoints:2});
  assert.equal(a.status,'PAID_R2_STORED_CALCULATION_REJECTED');
  assert.equal(a.reason,'PAID_R2_SOURCE_RECEIPT_INVALID');
  const g=fixture();g.store.readPaidProjection=()=>{throw Error('hash mismatch');};
  const b=await calculateStoredPaidUsBreadthR2('/fixture',{store:g.store,maxPoints:2});
  assert.equal(b.status,'PAID_R2_STORED_READBACK_FAILED');
  assert.equal(b.publicationAllowed,false);
});

test('nonexistent exact date does not quietly substitute previous date',async()=>{
  const {store}=fixture();
  const r=await calculateStoredPaidUsBreadthR2('/fixture',{
    store,maxPoints:1,throughDate:'2026-11-23',
  });
  assert.equal(r.status,'PAID_R2_TARGET_DATE_NOT_STORED');
});

test('nonconforming stored index and invalid window are rejected',async()=>{
  const {store}=fixture();
  store.paidDates=()=>[days[2],days[0],days[1]];
  assert.equal((await calculateStoredPaidUsBreadthR2('/fixture',{store})).status,
    'PAID_R2_STORED_DATES_INVALID');
  assert.equal((await calculateStoredPaidUsBreadthR2('/fixture',{
    store,maxPoints:251,
  })).status,'PAID_R2_STORED_ARGUMENTS_INVALID');
});

test('251 genuine stored sessions produce exactly 250 source-paired candidates',async()=>{
  const {previousMarketSession}=await import(
    '../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs'
  );
  const backwards=['2026-11-20'];
  while(backwards.length<251){
    const prior=previousMarketSession(backwards.at(-1));
    assert.ok(prior,'calendar should provide a previous session');
    backwards.push(prior);
  }
  const listed=backwards.reverse();
  const receipts=Object.fromEntries(listed.map((d,i)=>[d,{
    schema:'ZGMINI_MP_PAID_FILE_V1',plan:'full',assetType:'stock_daily',
    date:d,sha256:(i+1).toString(16).padStart(64,'0'),
    projectionSha256:(i+1000).toString(16).padStart(64,'0'),
    bytes:2048,rows:2,priceMode:'SPLIT_ADJUSTED_DAILY_CLOSE',
    rawPublished:false,
  }]));
  const store={
    paidDates:()=>listed,
    readPaidDaily:(base,type,d)=>({receipt:receipts[d]}),
    readPaidProjection:(base,type,d)=>[
      row(d,'UP',100+listed.indexOf(d)),
      row(d,'FLAT',50),
    ],
  };
  const result=await calculateStoredPaidUsBreadthR2('/fixture',{
    store,maxPoints:250,
  });
  assert.equal(result.status,'PAID_R2_STORED_PRIVATE_CALCULATED');
  assert.equal(result.comparedSessions,250);
  assert.equal(result.fullYearHistory,true);
  assert.equal(result.publicHistoryPreview.length,250);
  assert.equal(result.privateSourceReceipts.length,251);
  assert.equal(result.publicationAllowed,false);
  assert.equal(result.providerCalls,0);
  assert.equal(result.d1Writes,0);
});
