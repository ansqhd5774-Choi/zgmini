import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {scoreER1Issuers} from '../lib/market-calendar-er1-earnings-score.mjs';
import {makeER1PublicDisplay,validateER1PublicDisplay} from '../lib/market-calendar-er1-public-display.mjs';
import {
 NOV2026_ER1_PUBLIC_KEY,selectFutureNovemberSymbols,validateVendorActual,
 syncNovemberER1D1,runNovemberProbePublish
} from '../scripts/pc-writer/market-calendar-nov30-er1-probe-publish.mjs';

const NOV_NOW=Date.parse('2026-11-05T08:00:00Z');
const EVENTS=[
 {date:'2026-11-02',ticker:'OLD'},
 {date:'2026-11-20',ticker:'ZZZ'},
 {date:'2026-11-06',ticker:'BBB'},
 {date:'2026-11-06',ticker:'AAA'},
 {date:'2026-11-07',ticker:'CCC'},
 {date:'2026-11-08',ticker:'DDD'},
 {date:'2026-11-20',ticker:'AAA'}
];
const ACTUAL=symbol=>[
 {symbol,date:'2026-10-20',eps:2.5,revenue:10000000},
 {symbol,date:'2026-07-20',eps:1.5,revenue:9000000},
 {symbol,date:'2026-11-06',eps:null,revenue:null}
];

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-er1-nov-'));
 const input=path.join(root,'er1-input');fs.mkdirSync(input,{recursive:true});
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 return {root,input};
}
function stage(file,symbol){
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify({storedAt:'2026-11-04T12:00:00Z',
  body:ACTUAL(symbol)}),{flag:'wx'});
}
function mockScore(rows,{asOf}){
 assert.equal(asOf,'2026-11-05');
 assert.ok(rows.length>=1&&rows.length<=3);
 for(const row of rows){
  assert.ok(row.releases.some(x=>x.date<'2026-11-05'&&
   typeof x.eps==='number'&&typeof x.revenue==='number'));
  assert.ok(!row.releases.some(x=>Object.hasOwn(x,'epsEstimate')));
 }
 return {status:'READY_SHADOW',coverage:{scoreableIssuers:rows.length},asOf};
}
function mockPublic(scored){
 return {recordCount:scored.coverage.scoreableIssuers,star3Count:0,
  status:'READY_ER1_PUBLIC',scores:[{ticker:'AAA',score:79.5}]};
}
function mockD1(){
 let value=null,writes=0;
 const remote={
  async query(_core,_sql,params){assert.deepEqual(params,[NOV2026_ER1_PUBLIC_KEY]);
   return {results:value?[{body:value.body,stored_at:value.storedAt}]:[]};},
  async request(_core,statements){assert.equal(statements.length,1);
   const p=statements[0].params;assert.equal(p[0],NOV2026_ER1_PUBLIC_KEY);
   value={body:p[1],storedAt:p[2]};writes++;}
 };
 return {remote,getWrites:()=>writes,getValue:()=>value};
}

test('November future-only selection is deterministic and capped at three',()=>{
 assert.deepEqual(selectFutureNovemberSymbols(EVENTS,'2026-11-05'),['AAA','BBB','CCC']);
 assert.deepEqual(selectFutureNovemberSymbols(EVENTS,'2026-11-29'),[]);
 assert.throws(()=>selectFutureNovemberSymbols([{date:'2026-11-33',ticker:'XXX'}],
  '2026-11-05'),/NOV30_ER1_CALENDAR_ROW_INVALID/);
});
test('only complete numeric actual fields are allowed; estimates are not substituted',()=>{
 assert.equal(validateVendorActual(ACTUAL('AAA'),'AAA').length,3);
 assert.throws(()=>validateVendorActual([{symbol:'AAA',date:'2026-10-10',
  epsEstimate:2,revenueEstimate:300}],'AAA'),/NOV30_ER1_VENDOR_ACTUAL_INVALID/);
 assert.throws(()=>validateVendorActual([{symbol:'AAA',date:'2026-10-10',
  eps:2,revenue:-1}],'AAA'),/NOV30_ER1_VENDOR_ACTUAL_INVALID/);
});
test('pilot reuses existing, calls provider at most twice and never publishes D1',async t=>{
 const f=fixture(t),d1=mockD1();let calls=0;
 stage(path.join(f.input,'dec31-symbol-probe','AAA.json'),'AAA');
 const opts={pcHome:f.root,requireWindows:false,clock:()=>NOV_NOW,
  env:{EARNINGS_API_KEY:'test_test_key_123'},calendarLoader:async()=>EVENTS,
  scorer:mockScore,publicSerializer:mockPublic,
  remoteFactory:async()=>({remote:d1.remote,core:'fixture'}),
  fetcher:async u=>{calls++;assert.ok(!String(u).includes('BAD_SECRET'));
   return {ok:true,status:200,text:async()=>JSON.stringify(ACTUAL(new URL(u).searchParams.get('symbol')))}}
 };
 const a=await runNovemberProbePublish(opts);
 assert.equal(a.status,'PASS',a.code);assert.equal(a.selectedSymbols,3);
 assert.equal(a.providerCalls,2);assert.equal(a.reusedActualSymbols,1);
 assert.equal(a.stagedActualSymbols,2);assert.equal(a.d1Writes,0);
 assert.equal(a.code,'NOV30_ER1_PILOT_PREVIEW_VERIFIED');
 assert.equal(calls,2);assert.equal(d1.getWrites(),0);
 assert.equal(d1.getValue(),null);
 const b=await runNovemberProbePublish(opts);
 assert.equal(b.status,'PASS',b.code);assert.equal(b.providerCalls,0);
 assert.equal(b.reusedActualSymbols,3);assert.equal(b.d1Writes,0);
 assert.equal(calls,2);assert.equal(d1.getWrites(),0);
});
test('unchanged ER1 scorer and serializer produce valid private preview from saved actuals',async t=>{
 const f=fixture(t),asOf='2026-11-04',now=Date.parse(asOf+'T20:00:00Z');
 const events=[{date:'2026-11-06',ticker:'AAA'},{date:'2026-11-07',ticker:'BBB'},
  {date:'2026-11-08',ticker:'CCC'}];
 const dates=['2026-10-20','2026-07-20','2026-04-20','2026-01-20'];
 for(let i=0;i<3;i++){
  const symbol=['AAA','BBB','CCC'][i];
  const body=dates.map((date,k)=>({symbol,date,eps:1.2+i,revenue:1e7+i*1e6-k*1e5}));
  const dir=path.join(f.input,'dec31-symbol-probe');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,symbol+'.json'),JSON.stringify({storedAt:
   '2026-11-03T12:00:00Z',body}),{flag:'wx'});
 }
 let networkCalls=0;
 const report=await runNovemberProbePublish({pcHome:f.root,requireWindows:false,
  clock:()=>now,calendarLoader:async()=>events,scorer:scoreER1Issuers,
  publicSerializer:makeER1PublicDisplay,fetcher:async()=>{
   networkCalls++;throw Error('network should remain unused');
  }});
 assert.equal(report.status,'PASS',report.code);assert.equal(networkCalls,0);
 assert.equal(report.scoreableIssuers,3);assert.equal(report.star3Count,0);
 assert.equal(report.d1Writes,0);
 const derived=JSON.parse(fs.readFileSync(path.join(f.input,
  'nov30-er1-probe-derived','current.json'),'utf8'));
 assert.ok(validateER1PublicDisplay(derived,{now}));
 assert.equal(derived.method,'ER1_RELEASE1TO4_REVENUE_EPS_FIXED_97_20261102');
 assert.ok(derived.scores.every(row=>row.score<97));
 assert.ok(!JSON.stringify(derived).includes('10000000'));
});
test('separate D1 helper uses isolated key with exact readback and no duplicate write',async()=>{
 const d1=mockD1(),body='{"status":"fixture","score":79.5}';
 const first=await syncNovemberER1D1({remote:d1.remote,core:'fixture',body,storedAt:NOV_NOW});
 assert.deepEqual(first,{code:'NOV30_ER1_D1_VERIFIED',wrote:true});
 const second=await syncNovemberER1D1({remote:d1.remote,core:'fixture',body,storedAt:NOV_NOW});
 assert.deepEqual(second,{code:'NOV30_ER1_D1_ALREADY_MATCHED',wrote:false});
 assert.equal(d1.getWrites(),1);
 assert.ok(!d1.getValue().body.includes('10000000'));
});
test('429 keeps prior stage for resume and never publishes partial candidate',async t=>{
 const f=fixture(t),d1=mockD1();let calls=0;
 const report=await runNovemberProbePublish({
  pcHome:f.root,requireWindows:false,clock:()=>NOV_NOW,
  env:{EARNINGS_API_KEY:'test_test_key_123'},calendarLoader:async()=>EVENTS,
  scorer:mockScore,publicSerializer:mockPublic,
  remoteFactory:async()=>({remote:d1.remote,core:'fixture'}),
  fetcher:async u=>{
   calls++;return calls===1?
    {ok:true,status:200,text:async()=>JSON.stringify(ACTUAL('AAA'))}:
    {ok:false,status:429};
  }
 });
 assert.equal(report.status,'PARTIAL');
 assert.equal(report.code,'NOV30_ER1_PROVIDER_QUOTA_STOP');
 assert.equal(report.providerCalls,2);assert.equal(report.stagedActualSymbols,1);
 assert.equal(d1.getWrites(),0);
 assert.ok(fs.existsSync(path.join(f.input,'nov30-er1-probe','AAA.json')));
 assert.ok(!fs.existsSync(path.join(f.input,'nov30-er1-probe','BBB.json')));
});
test('dedicated D1 write refuses newer remote data',async()=>{
 const remote={query:async()=>({results:[{body:'old',stored_at:NOV_NOW+1}]}),
  request:async()=>{throw Error('must not be invoked')}};
 await assert.rejects(syncNovemberER1D1({remote,core:'fixture',body:'new',storedAt:NOV_NOW}),
  /NOV30_ER1_D1_NEWER_PRESERVED/);
});
