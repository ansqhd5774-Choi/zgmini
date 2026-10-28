import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {verifyEarningsOutput,syncEarningsOutput,runR34,worktreeIdentity} from '../scripts/pc-writer/market-calendar-r34-earnings-sync.mjs';

const now=Date.parse('2026-10-29T00:00:00Z');
const days=Array.from({length:14},(_,i)=>new Date(now+i*86400000).toISOString().slice(0,10));
const rowHtml='<article class="mc-row mc-vendor-row" data-search="nvda nvidia">'+
 '<span class=mc-tag-status>예정 · 미확정</span></article>';
function row(){return {body:JSON.stringify({status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',
 rawVendorJsonExposed:false,publicJsonFeed:false,redistribution:false,
 checkedAt:new Date(now-3600000).toISOString(),coveredDays:days,
 recordCount:1,priorityCount:1,byDay:Object.fromEntries(days.map((d,i)=>[d,i?[ ]:[rowHtml]]))}),stored_at:now-1000};}

function remoteFixture(previous=null){
 let current=previous,requests=0,reads=0,writeKeys=[];
 const api={stats:{queries:0},
  async query(_db,sql,params){reads++;assert.match(sql,/kind='output'/);
   assert.deepEqual(params,['market-calendar:earnings-display-html']);
   return {results:current?[current]:[]};},
  async request(_db,batch){requests++;assert.equal(batch.length,1);
   const [{sql,params}]=batch;
   assert.match(sql,/ON CONFLICT/);assert.match(sql,/excluded.stored_at>public_feed_snapshots_v1.stored_at/);
   writeKeys.push(params[0]);current={body:params[1],stored_at:params[2]};
   return [{success:true}];},
 };
 return {api,get requests(){return requests;},get reads(){return reads;},get writeKeys(){return writeKeys;}};
}

test('R34 verifies only bounded, 14-day HTML-only display; never raw vendor input',()=>{
 const item=row(),result=verifyEarningsOutput(item,{now});
 assert.equal(result.recordCount,1);assert.equal(result.bytes,Buffer.byteLength(item.body));
 assert.match(result.sourceSha256,/^[a-f0-9]{64}$/);
 const parsed=JSON.parse(item.body);parsed.rawVendorJsonExposed=true;
 assert.throws(()=>verifyEarningsOutput({...item,body:JSON.stringify(parsed)},{now}),/CONTRACT/);
 parsed.rawVendorJsonExposed=false;parsed.byDay[days[0]]=['<script>bad</script>'];
 assert.throws(()=>verifyEarningsOutput({...item,body:JSON.stringify(parsed)},{now}),/HTML_INVALID/);
});

test('R34 sync writes exactly one allowlisted D1 output and byte-verifies readback',async()=>{
 const fixture=remoteFixture(),item=row();
 const result=await syncEarningsOutput({row:item,remote:fixture.api,core:'core',now});
 assert.equal(result.decision,'R34_D1_SYNC_VERIFIED');assert.equal(result.recordCount,1);
 assert.equal(fixture.requests,1);assert.equal(fixture.reads,2);
 assert.deepEqual(fixture.writeKeys,['market-calendar:earnings-display-html']);
});

test('R34 repeated sync with identical bytes is read-only',async()=>{
 const item=row(),fixture=remoteFixture(item);
 const result=await syncEarningsOutput({row:item,remote:fixture.api,core:'core',now});
 assert.equal(result.decision,'R34_D1_ALREADY_SYNCED');assert.equal(fixture.requests,0);
});

test('R34 keeps newer differing remote D1 row unchanged',async()=>{
 const item=row(),fixture=remoteFixture({body:'{}',stored_at:item.stored_at+1});
 await assert.rejects(syncEarningsOutput({row:item,remote:fixture.api,core:'core',now}),/REMOTE_NEWER/);
 assert.equal(fixture.requests,0);
});

test('R34 rejects stale display before touching D1',async()=>{
 const item=row(),fixture=remoteFixture();
 await assert.rejects(syncEarningsOutput({row:item,remote:fixture.api,core:'core',now:now+49*3600000}),/STALE/);
 assert.equal(fixture.reads,0);
});

test('R34 reports readback mismatch instead of success',async()=>{
 const fixture=remoteFixture();let calls=0;
 fixture.api.query=async()=>{calls++;return {results:[]};};
 await assert.rejects(syncEarningsOutput({row:row(),remote:fixture.api,core:'core',now}),/READBACK_MISMATCH/);
 assert.equal(fixture.requests,1);
});

function pcFixture(t){
 const dataRoot=fs.mkdtempSync(path.join(os.tmpdir(),'r34-earnings-sync-'));
 t.after(()=>fs.rmSync(dataRoot,{recursive:true,force:true}));
 const root=path.join(dataRoot,'repo');fs.mkdirSync(root);
 const head='a'.repeat(40);
 fs.writeFileSync(path.join(dataRoot,'config.json'),JSON.stringify({source:head,collectionTarget:'pc',enabled:true,core:'core'}));
 return {dataRoot,root,head,options:{dataRoot,getRoot:()=>root,getSource:()=>head,
  expectedWorktreeId:worktreeIdentity(root),approvedHead:head,clock:()=>now,getLocal:()=>row()}};
}

test('R34 one-time PC runner publishes no other feeds and releases its own lock',async t=>{
 const pc=pcFixture(t),fixture=remoteFixture();
 const report=await runR34({...pc.options,getRemote:async()=>fixture.api});
 assert.equal(report.decision,'R34_D1_SYNC_VERIFIED');assert.equal(report.providerRequests,0);
 assert.equal(report.filesModified,0);assert.equal(report.gitPushed,false);
 assert.equal(report.otherFeedsWritten,0);assert.equal(fixture.requests,1);
 assert.equal(fs.existsSync(path.join(pc.dataRoot,'local-cycle.lock')),false);
});

test('R34 retries only existing core lock, then succeeds within bound',async t=>{
 const pc=pcFixture(t),lock=path.join(pc.dataRoot,'local-cycle.lock');
 fs.writeFileSync(lock,'owner');let time=now,pauses=0;
 const fixture=remoteFixture();
 const report=await runR34({...pc.options,clock:()=>time,limitMs:40000,intervalMs:10000,
  pause:async ms=>{time+=ms;pauses++;if(pauses===2)fs.unlinkSync(lock);},getRemote:async()=>fixture.api});
 assert.equal(report.decision,'R34_D1_SYNC_VERIFIED');assert.equal(report.checks,3);
 assert.equal(pauses,2);assert.equal(report.attempts,1);
});

test('R34 times out without deleting another core lock or contacting remote',async t=>{
 const pc=pcFixture(t),lock=path.join(pc.dataRoot,'local-cycle.lock');
 fs.writeFileSync(lock,'owner');let time=now,remoteCalls=0;
 const report=await runR34({...pc.options,clock:()=>time,limitMs:20000,intervalMs:10000,
  pause:async ms=>{time+=ms;},getRemote:async()=>{remoteCalls++;}});
 assert.equal(report.decision,'R34_LOCK_WAIT_TIMEOUT_STOP');assert.equal(remoteCalls,0);
 assert.equal(fs.readFileSync(lock,'utf8'),'owner');
});

test('R34 refuses altered approved source before reading any data',async t=>{
 const pc=pcFixture(t);let reads=0;
 const report=await runR34({...pc.options,approvedHead:'b'.repeat(40),getLocal:()=>{reads++;return row();}});
 assert.equal(report.decision,'R34_PC_SOURCE_CONFIG_CHANGED_STOP');assert.equal(reads,0);
});
