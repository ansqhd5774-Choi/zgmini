import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildApiConnectionHealthFromLog} from '../scripts/pc-writer/api-connection-health.mjs';
import {summarizeApiConnectionHealth,readApiConnectionHealth,API_CONNECTION_HEALTH_KEY,API_CONNECTION_SNAPSHOT_MAX_AGE_MS} from '../worker/api-connection-health.mjs';

const now=Date.parse('2026-11-15T13:00:00.000Z');
const mk=(at,providers,extra={})=>({at:new Date(at).toISOString(),lane:'core',status:'COMPLETE',providers,...extra});
const event=(at,host,status,requests=1)=>mk(at,{[host]:{requests,statuses:{[status]:requests}}});
function fixture(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-wifi-api-'));
 const base=path.join(root,'pc-writer');fs.mkdirSync(base);
 const file=path.join(base,'collection-events.jsonl');
 const write=records=>fs.writeFileSync(file,records.map(x=>JSON.stringify(x)).join('\n')+'\n');
 try{return fn({root,base,file,write});}
 finally{fs.rmSync(root,{force:true,recursive:true});}
}
const summarize=events=>fixture(({base,write})=>{write(events);return summarizeApiConnectionHealth(buildApiConnectionHealthFromLog(base,now),now);});

test('repeated real provider hosts are counted, not configured job or endpoint counts',()=>{
 const x=summarize([
  event(now-2*86400000,'api.bls.gov','200',5),
  event(now-86400000,'api.bls.gov','200',3),
  event(now-86400000,'api.earningsapi.com','200',15),
  event(now-120000,'api.earningsapi.com','200',15),
  event(now-100000,'one-off.example.org','200',1)
 ]);
 assert.equal(x.total,2);assert.equal(x.unverifiedSingles,1);
 assert.equal(x.normal,2);assert.equal(x.coverage,'PARTIAL');assert.equal(x.status,'partial');
 assert.equal(x.items.length,3);
});

test('latest HTTP503 overrides older HTTP200, without pretending collection jobs are healthy',()=>{
 const x=summarize([event(now-86400000,'api.stlouisfed.org','200'),event(now-60000,'api.stlouisfed.org','503')]);
 assert.equal(x.total,1);assert.equal(x.failed,1);assert.equal(x.normal,0);
 assert.equal(x.items[0].lastOutcome,'failure');assert.equal(x.items[0].state,'failed');
 assert.equal(x.items[0].lastSuccessAt,now-86400000);
});

test('mixed 2xx and network error must not be labelled normal',()=>{
 const x=summarize([event(now-86400000,'api.bls.gov','200'),mk(now-60000,{'api.bls.gov':{requests:2,statuses:{'200':1,NETWORK_ERROR:1}}})]);
 assert.equal(x.failed,1);assert.equal(x.items[0].lastOutcome,'mixed');
});

test('scheduled silence is stale only when repeated cadence has evidence',()=>{
 const stamps=[-8,-7,-6,-5,-4].map(n=>now+n*86400000);
 const x=summarize(stamps.map(t=>event(t,'api.earningsapi.com','200')));
 assert.equal(x.items[0].state,'stale');assert.equal(x.failed,1);
 assert.equal(x.items[0].expectedIntervalMs,86400000);
});

test('two old observations do not invent a schedule or a healthy current connection',()=>{
 const x=summarize([event(now-10*86400000,'api.bls.gov','200'),event(now-9*86400000,'api.bls.gov','200')]);
 assert.equal(x.items[0].expectedIntervalMs,null);assert.equal(x.items[0].state,'unknown');
 assert.equal(x.coverage,'PARTIAL');
});

test('past success must expire when the PC publisher has stopped',()=>{
 const old=fixture(({base,write})=>{write([event(now-86400000,'api.bls.gov','200'),event(now-1000,'api.bls.gov','200')]);return buildApiConnectionHealthFromLog(base,now);});
 assert.equal(summarizeApiConnectionHealth(old,now+API_CONNECTION_SNAPSHOT_MAX_AGE_MS+1).total,null);
 assert.equal(summarizeApiConnectionHealth(old,now+API_CONNECTION_SNAPSHOT_MAX_AGE_MS+1).reason,'SOURCE_STALE');
});

test('missing log provides no fabricated hosts or normal count',()=>fixture(({base})=>{
 const snapshot=buildApiConnectionHealthFromLog(base,now);
 assert.equal(snapshot.items.length,0);const x=summarizeApiConnectionHealth(snapshot,now);
 assert.equal(x.total,0);assert.equal(x.status,'unknown');
}));

test('unsafe symlink log is not followed',()=>fixture(({base,file,root})=>{
 const other=path.join(root,'external');fs.writeFileSync(other,'SECRET');
 fs.symlinkSync(other,file);
 assert.equal(buildApiConnectionHealthFromLog(base,now).items.length,0);
}));

test('invalid request status accounting is excluded without leaking sensitive error bodies',()=>fixture(({base,write})=>{
 write([mk(now-60000,{'api.bls.gov':{requests:3,statuses:{'200':2}}},{secret:'SECRET-TOKEN',url:'https://example.org?token=SECRET-TOKEN'})]);
 const out=buildApiConnectionHealthFromLog(base,now);
 assert.equal(out.items.length,0);assert.equal(out.diagnostics.invalidEvents,1);
 assert.ok(!JSON.stringify(out).includes('SECRET-TOKEN'));
}));

test('never confuse one vendor with 15 individual API endpoints',()=>{
 const x=summarize([event(now-86400000,'api.earningsapi.com','200',15),event(now-1000,'api.earningsapi.com','200',15)]);
 assert.equal(x.total,1);assert.equal(x.items[0].requests,30);
});

test('public reader queries one fixed D1 snapshot key and no live upstream',async()=>{
 const snap=fixture(({base,write})=>{write([event(now-86400000,'api.bls.gov','200'),event(now-1000,'api.bls.gov','200')]);return buildApiConnectionHealthFromLog(base,now);});
 let calls=0;
 const db={prepare(sql){calls++;assert.match(sql,/snapshot_key='current'/);return {bind(key){assert.equal(key,API_CONNECTION_HEALTH_KEY);return {first:async()=>({body:JSON.stringify(snap)})}}}}};
 const res=await readApiConnectionHealth(db,now+1000);
 assert.equal(res.status,200);assert.equal((await res.json()).total,1);assert.equal(calls,1);
});

test('unavailable D1 fails closed and does not substitute old collection-health 25',async()=>{
 const res=await readApiConnectionHealth({prepare(){throw Error('DB_UNAVAILABLE')}},now);
 assert.equal(res.status,503);const x=await res.json();assert.equal(x.total,null);assert.equal(x.reason,'SOURCE_UNAVAILABLE');
});

test('14x24h rolling window can span 15 distinct KST calendar days',()=>{
 const day=24*3600000;
 const snapshot=fixture(({base,write})=>{
  write(Array.from({length:15},(_,i)=>event(now-(14-i)*day,'api.bls.gov','200')));
  return buildApiConnectionHealthFromLog(base,now);
 });
 assert.equal(snapshot.items[0].observedDays,15);
 const result=summarizeApiConnectionHealth(snapshot,now);
 assert.equal(result.total,1);
 assert.equal(result.reason,null);
 assert.equal(result.items[0].state,'normal');
});
