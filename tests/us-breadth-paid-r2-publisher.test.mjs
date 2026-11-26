import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPaidUsR2Final,publishPaidUsR2Final}
  from '../scripts/pc-writer/us-breadth-paid-r2-publisher.mjs';
import {US_PAID_R2_FEED_KEY}
  from '../worker/us-breadth-paid-r2-contract.mjs';

const stamp=Date.parse('2026-11-20T22:01:00.000Z');
const p=(date,up,flat,down)=>({date,risingPct:up,unchangedPct:flat,fallingPct:down});
function calculated({one=false}={}){
  const points=one
    ?[p('2026-11-19',25,50,25)]
    :[p('2026-11-19',25,50,25),p('2026-11-20',50,25,25)];
  const sources=[
    {date:'2026-11-18',sha256:'a'.repeat(64),projectionSha256:'d'.repeat(64)},
    {date:'2026-11-19',sha256:'b'.repeat(64),projectionSha256:'e'.repeat(64)},
    ...(!one?[{date:'2026-11-20',sha256:'c'.repeat(64),
      projectionSha256:'f'.repeat(64)}]:[]),
  ];
  return {
    status:'PAID_R2_STORED_PRIVATE_CALCULATED',prepared:true,
    source:'MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY',
    priceMode:'SPLIT_ADJUSTED_DAILY_CLOSE',
    publicationAllowed:false,comparedSessions:points.length,
    fullYearHistory:false,firstDate:points[0].date,
    lastDate:points.at(-1).date,sourceLatestProviderDateVerified:false,
    publicHistoryPreview:points,publicPercentPreview:points.at(-1),
    privateSourceReceipts:sources,
  };
}
const finalize=(input=calculated(),now=stamp)=>buildPaidUsR2Final({
  calculated:input,fileSha256:'f'.repeat(64),now,
});
function mocked(preimage=null,{throwOnRequest=false}={}){
  const calls=[];let current=preimage;
  const remote={
    request:async(dbId,queries)=>{
      calls.push(['request',dbId,queries]);
      if(throwOnRequest)throw Error('transport failure');
      const [q]=queries;const params=q.params;
      current={body:q.sql.startsWith('UPDATE')?params[0]:params[1],
        stored_at:q.sql.startsWith('UPDATE')?params[1]:params[2]};
      return [{meta:{changes:1}}];
    },
    query:async(dbId,sql,params)=>{
      calls.push(['query',dbId,sql,params]);
      assert.deepEqual(params,[US_PAID_R2_FEED_KEY]);
      return {results:current?[current]:[]};
    },
  };
  return {remote,calls};
}
test('private paid R2 builds a whitelisted public FINAL candidate',()=>{
  const r=finalize();
  assert.equal(r.plan,'full');
  assert.equal(r.source,'MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY');
  assert.equal(r.points.length,2);
  assert.equal(r.publicationStage,'PUBLIC_FINAL');
  assert.equal('privateSourceReceipts' in r,false);
  assert.equal('privateCounts' in r,false);
});
test('new key D1 insert with CAS+readback, exactly one write',async()=>{
  const {remote,calls}=mocked();
  const now=stamp,record=finalize(calculated(),now);
  const r=await publishPaidUsR2Final({remote,dbId:'test-core',record,now});
  assert.equal(r.status,'US_PAID_R2_D1_CAS_READBACK_VERIFIED');
  assert.equal(r.d1Writes,1);
  assert.equal(calls.filter(c=>c[0]==='request').length,1);
  assert.equal(calls.filter(c=>c[0]==='query').length,1);
  assert.equal(calls[0][2][0].params[0],US_PAID_R2_FEED_KEY);
});
test('unchanged same date requires zero writes',async()=>{
  const record=finalize();
  const preimage={body:JSON.stringify(record),stored_at:stamp};
  const {remote,calls}=mocked(preimage);
  const r=await publishPaidUsR2Final({
    remote,dbId:'test-core',record,preimage,now:stamp+1000,
  });
  assert.equal(r.status,'US_PAID_R2_UNCHANGED_VERIFIED');
  assert.equal(r.d1Writes,0);
  assert.equal(calls.length,0);
});
test('overlapping prior historical points cannot be revised',async()=>{
  const old=finalize(calculated({one:true}),stamp-86400000);
  const preimage={body:JSON.stringify(old),stored_at:stamp-80000000};
  const changed=calculated();
  changed.publicHistoryPreview[0]={...changed.publicHistoryPreview[0],
    risingPct:26,unchangedPct:49};
  const record=finalize(changed);
  const {remote,calls}=mocked(preimage);
  await assert.rejects(()=>publishPaidUsR2Final({
    remote,dbId:'test-core',record,preimage,now:stamp+1000,
  }),/US_PAID_R2_HISTORY_DRIFT_PRESERVED/);
  assert.equal(calls.length,0);
});
test('failed D1 transport reports outcome unknown and does not retry',async()=>{
  const {remote,calls}=mocked(null,{throwOnRequest:true});
  await assert.rejects(()=>publishPaidUsR2Final({
    remote,dbId:'test-core',record:finalize(),now:stamp,
  }),/US_PAID_R2_D1_OUTCOME_UNKNOWN_NO_RETRY/);
  assert.equal(calls.filter(c=>c[0]==='request').length,1);
});
test('unverified/free source and bad final model are rejected',async()=>{
  const bad=calculated();bad.source='MARKETPARQUET_FREE_SAMPLE';
  assert.throws(()=>finalize(bad),/US_PAID_R2_PRIVATE_SOURCE_INVALID/);
  const original=finalize();original.points[0].rawPrice=21;
  const {remote,calls}=mocked();
  await assert.rejects(()=>publishPaidUsR2Final({
    remote,dbId:'test-core',record:original,now:stamp+1000,
  }),/US_PAID_R2_PUBLISH_RECORD_INVALID/);
  assert.equal(calls.length,0);
});
