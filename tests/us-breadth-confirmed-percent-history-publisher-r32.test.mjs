import test from 'node:test';
import assert from 'node:assert/strict';
import {previousMarketSession} from '../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {US_FULL_MARKET_HISTORY_PERCENT_KEY,validFullMarketPercentHistoryRecord}
 from '../lib/market-breadth/us-marketparquet-confirmed-history-percent-r32.mjs';
import {prepareVerifiedPercentHistoryR32,publishVerifiedPercentHistoryR32}
 from '../scripts/pc-writer/us-breadth-confirmed-percent-history-publisher-r32.mjs';

const now=Date.parse('2026-10-31T12:00:00Z');
const rising=1719,falling=4410,unchanged=377,total=rising+falling+unchanged;

function preview(days=249,lastDate='2026-10-30'){
 const dates=[lastDate];
 for(let i=1;i<days;i++)dates.unshift(previousMarketSession(dates[0]));
 const points=dates.map(date=>({date,expectedCount:total,rising,falling,unchanged,
  imputedUnchangedCount:189,observedComparableCount:total-189,
  sourcePairCoverage:(total-189)/total,
  risingPct:100*rising/total,fallingPct:100*falling/total,
  unchangedPct:100*unchanged/total}));
 return {status:'YEAR_PREVIEW_READY_UNPUBLISHED',prepared:true,
  publicationAllowed:false,publicationStage:'PREVIEW_ONLY',manualReviewRequired:true,
  providerAuthenticityVerified:true,providerCalls:days+1,
  chart:{status:'YEAR_PREVIEW_READY_UNPUBLISHED',prepared:true,
   publicationStage:'PREVIEW_ONLY',phase:'CONFIRMED',source:'MARKETPARQUET_STOCK_DAILY',
   universe:'US_MARKETPARQUET_ACTIVE_STOCKS',
   methodologyVersion:'ISSUE_DIRECTION_COUNTS_MISSING_AS_UNCHANGED_R2',
   sessionCount:days,firstDate:dates[0],lastDate:dates.at(-1),points}};
}

function mockD1(initial=null){
 let row=initial;
 const calls=[];
 const remote={
  async query(database,sql,params){
   calls.push({type:'read',database,sql,params});
   assert.equal(params[0],US_FULL_MARKET_HISTORY_PERCENT_KEY);
   return {results:row?[row]:[]};
  },
  async request(database,statements){
   calls.push({type:'write',database,statements});
   const [{sql,params}]=statements;
   assert.equal(params[0],US_FULL_MARKET_HISTORY_PERCENT_KEY);
   assert.match(sql,/WHERE market_public_snapshots_v1\.stored_at=\?/);
   assert.match(sql,/AND market_public_snapshots_v1\.body=\?/);
   const previous=Number(row?.stored_at??-1);
   if(previous!==Number(params[3])||(row?.body??'')!==params[4])return {success:false};
   row={body:params[1],stored_at:params[2]};
   return {success:true};
  },
 };
 return {remote,calls,record:()=>row};
}

test('R32 verified R25 raw input produces valid strict v2 249/250-day percent-only body',()=>{
 for(const days of [249,250]){
  const result=prepareVerifiedPercentHistoryR32(preview(days),{now});
  assert.equal(result.ok,true,result.status);
  assert.equal(result.body.version,2);
  assert.equal(validFullMarketPercentHistoryRecord(result.body),true);
  assert.equal(result.body.points.length,days);
  assert.deepEqual(Object.keys(result.body.points[0]).sort(),
   ['date','fallingPct','risingPct','unchangedPct']);
  const encoded=JSON.stringify(result.body);
  for(const forbidden of ['expectedCount','imputedUnchangedCount','observedComparableCount',
   'sourcePairCoverage','counts','close','price','approval','evidenceSha256'])
   assert.equal(encoded.includes('"'+forbidden+'"'),false,forbidden);
  assert.equal(result.evidenceSha256.length,64);
 }
});

test('R32 default finalWriteEnabled=false never calls D1 even when approved SHA supplied',async()=>{
 const source=preview();
 const prepared=prepareVerifiedPercentHistoryR32(source,{now});
 const d1=mockD1();
 const result=await publishVerifiedPercentHistoryR32(d1.remote,'db',source,
  {now,approvedPreviewSha256:prepared.evidenceSha256});
 assert.equal(result.status,'HISTORY_PERCENT_FINAL_WRITE_DISABLED');
 assert.equal(result.d1Writes,0);
 assert.equal(d1.calls.length,0);
});

test('R32 requires provider verified R25 and independently approved matching SHA before D1',async()=>{
 const source=preview();
 const approved=prepareVerifiedPercentHistoryR32(source,{now}).evidenceSha256;
 const altered=structuredClone(source);
 altered.chart.points[0].rising+=1;
 for(const [candidate,digest,status] of [
  [source,null,'INDEPENDENT_PREVIEW_SHA_APPROVAL_REQUIRED'],
  [source,'f'.repeat(64),'INDEPENDENT_PREVIEW_SHA_APPROVAL_MISMATCH'],
  [{...source,providerAuthenticityVerified:false},approved,'VERIFIED_R25_PREVIEW_REQUIRED'],
  [altered,approved,'VERIFIED_R25_PREVIEW_REQUIRED'],
 ]){
  const d1=mockD1();
  const result=await publishVerifiedPercentHistoryR32(d1.remote,'db',candidate,
   {now,finalWriteEnabled:true,approvedPreviewSha256:digest});
  assert.equal(result.status,status);
  assert.equal(result.remoteWrites,0);
  assert.equal(d1.calls.length,0);
 }
});

test('R32 writes only isolated percent history key with CAS and exact readback, never R1/Core',async()=>{
 const source=preview();
 const approved=prepareVerifiedPercentHistoryR32(source,{now}).evidenceSha256;
 const d1=mockD1();
 const result=await publishVerifiedPercentHistoryR32(d1.remote,'db',source,
  {now,finalWriteEnabled:true,approvedPreviewSha256:approved});
 assert.equal(result.status,'VERIFIED_PERCENT_HISTORY_FINAL');
 assert.equal(result.remoteWrites,1);
 assert.equal(result.schedulerChanges,0);
 assert.equal(d1.calls.filter(c=>c.type==='write').length,1);
 assert.equal(d1.calls.filter(c=>c.type==='read').length,2);
 assert.equal(JSON.parse(d1.record().body).points.length,249);
 assert.equal(validFullMarketPercentHistoryRecord(JSON.parse(d1.record().body)),true);
 assert.equal(d1.calls.every(c=>c.type==='write'
  ?c.statements[0].params[0]===US_FULL_MARKET_HISTORY_PERCENT_KEY
  :c.params[0]===US_FULL_MARKET_HISTORY_PERCENT_KEY),true);
});

test('R32 preserves equal/newer, unknown or corrupt D1 rows without overwrite',async()=>{
 const source=preview(249);
 const prepared=prepareVerifiedPercentHistoryR32(source,{now});
 const approved=prepared.evidenceSha256;
 const newer=prepareVerifiedPercentHistoryR32(preview(249,'2026-11-03'),
  {now:Date.parse('2026-11-04T12:00:00Z')}).body;
 const unknowns=[
  [{body:'{invalid',stored_at:now-1},'UNKNOWN_HISTORY_RECORD_PRESERVED'],
  [{body:JSON.stringify({...prepared.body,unexpected:'field'}),stored_at:now-1},
   'UNKNOWN_HISTORY_RECORD_PRESERVED'],
  [{body:JSON.stringify(newer),stored_at:now-1},'NEWER_HISTORY_PRESERVED'],
  [{body:JSON.stringify(prepared.body),stored_at:now-1},
   'HISTORY_PERCENT_ALREADY_PUBLISHED'],
  [{body:JSON.stringify({...prepared.body,
    points:prepared.body.points.map((p,i)=>i===0?{...p,risingPct:p.risingPct+0.01}:p)}),
   stored_at:now-1},'SAME_DAY_HISTORY_CONFLICT_PRESERVED'],
 ];
 for(const [prior,status] of unknowns){
  const d1=mockD1(prior);
  const result=await publishVerifiedPercentHistoryR32(d1.remote,'db',source,
   {now,finalWriteEnabled:true,approvedPreviewSha256:approved});
  assert.equal(result.status,status);
  assert.equal(d1.calls.filter(c=>c.type==='write').length,0);
 }
});

test('R38 permits only a legitimate next-session sliding-window extension with exact shared percentages',async()=>{
 const former=prepareVerifiedPercentHistoryR32(preview(249,'2026-10-30'),{now}).body;
 const forwardNow=Date.parse('2026-11-03T12:00:00Z');
 const source=preview(249,'2026-11-02');
 const prepared=prepareVerifiedPercentHistoryR32(source,{now:forwardNow});
 assert.equal(prepared.ok,true);
 assert.equal(prepared.body.points[0].date>former.points[0].date,true);
 const d1=mockD1({body:JSON.stringify(former),stored_at:now-1});
 const result=await publishVerifiedPercentHistoryR32(d1.remote,'db',source,
  {now:forwardNow,finalWriteEnabled:true,approvedPreviewSha256:prepared.evidenceSha256});
 assert.equal(result.status,'VERIFIED_PERCENT_HISTORY_FINAL');
 assert.equal(d1.calls.filter(c=>c.type==='write').length,1);
 assert.equal(d1.calls.filter(c=>c.type==='read').length,2);
 const after=JSON.parse(d1.record().body);
 assert.equal(after.lastDate,'2026-11-02');
 const formerByDate=new Map(former.points.map(point=>[point.date,point]));
 for(const point of after.points){
  const old=formerByDate.get(point.date);
  if(old)assert.deepEqual(point,old);
 }
});

test('R38 permits an approved one-day append from 249 to 250 without changing any prior point',async()=>{
 const former=prepareVerifiedPercentHistoryR32(preview(249,'2026-10-30'),{now}).body;
 const forwardNow=Date.parse('2026-11-03T12:00:00Z');
 const source=preview(250,'2026-11-02');
 const prepared=prepareVerifiedPercentHistoryR32(source,{now:forwardNow});
 assert.equal(prepared.ok,true);
 assert.equal(prepared.body.points.length,250);
 assert.equal(prepared.body.firstDate,former.firstDate);
 const d1=mockD1({body:JSON.stringify(former),stored_at:now-1});
 const result=await publishVerifiedPercentHistoryR32(d1.remote,'db',source,
  {now:forwardNow,finalWriteEnabled:true,approvedPreviewSha256:prepared.evidenceSha256});
 assert.equal(result.status,'VERIFIED_PERCENT_HISTORY_FINAL');
 const after=JSON.parse(d1.record().body);
 assert.deepEqual(after.points.slice(0,249),former.points);
 assert.equal(after.points.at(-1).date,'2026-11-02');
 assert.equal(d1.calls.filter(c=>c.type==='write').length,1);
});

test('R38 rejects a changed overlapping percent without D1 write even for approved newer preview SHA',async()=>{
 const former=prepareVerifiedPercentHistoryR32(preview(),{now}).body;
 const forwardNow=Date.parse('2026-11-03T12:00:00Z');
 const source=preview(249,'2026-11-02');
 const point=source.chart.points[10];
 point.rising++;
 point.falling--;
 point.risingPct=100*point.rising/total;
 point.fallingPct=100*point.falling/total;
 const prepared=prepareVerifiedPercentHistoryR32(source,{now:forwardNow});
 assert.equal(prepared.ok,true);
 const initial={body:JSON.stringify(former),stored_at:now-1};
 const d1=mockD1(initial);
 const result=await publishVerifiedPercentHistoryR32(d1.remote,'db',source,
  {now:forwardNow,finalWriteEnabled:true,approvedPreviewSha256:prepared.evidenceSha256});
 assert.equal(result.status,'HISTORY_PERCENT_OVERLAP_CONFLICT_PRESERVED');
 assert.equal(result.d1Writes,0);
 assert.equal(d1.calls.filter(c=>c.type==='write').length,0);
 assert.deepEqual(d1.record(),initial);
});

test('R38 rejects a disjoint future window and altered prior lineage without D1 write',async()=>{
 const forwardNow=Date.parse('2026-11-03T12:00:00Z');
 const source=preview(249,'2026-11-02');
 const approved=prepareVerifiedPercentHistoryR32(source,{now:forwardNow}).evidenceSha256;
 const former=prepareVerifiedPercentHistoryR32(preview(249,'2025-01-02'),
  {now:Date.parse('2025-01-03T12:00:00Z')}).body;
 assert.equal(validFullMarketPercentHistoryRecord(former),true);
 for(const [prior,status] of [
  [former,'HISTORY_PERCENT_NO_OVERLAP_PRESERVED'],
  [{...former,phase:'PROVISIONAL'},'UNKNOWN_HISTORY_RECORD_PRESERVED'],
  [{...former,source:'ANOTHER_PROVIDER'},'UNKNOWN_HISTORY_RECORD_PRESERVED'],
 ]){
  const original={body:JSON.stringify(prior),stored_at:now-1};
  const d1=mockD1(original);
  const result=await publishVerifiedPercentHistoryR32(d1.remote,'db',source,
   {now:forwardNow,finalWriteEnabled:true,approvedPreviewSha256:approved});
  assert.equal(result.status,status);
  assert.equal(result.d1Writes,0);
  assert.equal(d1.calls.filter(c=>c.type==='write').length,0);
  assert.deepEqual(d1.record(),original);
 }
});

test('R32 fails closed on D1 CAS/readback collision and does not claim successful publication',async()=>{
 const source=preview();
 const approved=prepareVerifiedPercentHistoryR32(source,{now}).evidenceSha256;
 const remote={async query(){return {results:[]};},async request(){return {success:false};}};
 await assert.rejects(()=>publishVerifiedPercentHistoryR32(remote,'db',source,
  {now,finalWriteEnabled:true,approvedPreviewSha256:approved}),
 /HISTORY_PERCENT_D1_READBACK_MISMATCH/);
});
