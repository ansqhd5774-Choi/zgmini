import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildApiConnectionHealthFromLog,buildMonitoredSourceHealth} from '../scripts/pc-writer/api-connection-health.mjs';
import {providerEndpointFingerprint} from '../scripts/pc-writer/provider-endpoint-fingerprint.mjs';
import {summarizeApiConnectionHealth,readApiConnectionHealth,publicApiConnectionSummary,
 MONITORED_CALENDAR_SOURCES,API_CONNECTION_HEALTH_KEY,API_CONNECTION_SNAPSHOT_MAX_AGE_MS} from '../worker/api-connection-health.mjs';

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
 assert.equal(x.items[0].reasonCode,'LAST_EVENT_HAS_FAILURE');
 assert.deepEqual(x.items[0].lastEventStatuses,{'200':1,NETWORK_ERROR:1});
});

test('scheduled silence is stale only when repeated cadence has evidence',()=>{
 const stamps=[-10,-9,-8,-7,-6,-5,-4].map(n=>now+n*86400000);
 const x=summarize(stamps.map(t=>event(t,'api.earningsapi.com','200')));
 assert.equal(x.items[0].state,'stale');assert.equal(x.failed,1);
 assert.equal(x.items[0].reasonCode,'CADENCE_OVERDUE');
 assert.equal(x.items[0].cadenceSupported,true);
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

test('three burst-only collection days do not imply hourly source stoppage',()=>{
 const day=86400000;
 const ev=[-11,-10,-9].flatMap(d=>[event(now+d*day,'cdn.www.census.gov','200'),event(now+d*day+3600000,'cdn.www.census.gov','200')]);
 const result=summarize(ev);
 assert.equal(result.items[0].observedDays,3);
 assert.equal(result.items[0].state,'unknown');
 assert.equal(result.items[0].reasonCode,'NONPERIODIC_CADENCE_UNVERIFIED');
 assert.equal(result.items[0].cadenceSupported,false);
 assert.equal(result.failed,0);
 assert.equal(result.unknown,1);
});

test('invalid or secret-bearing published status counters fail closed',()=>{
 const snap=fixture(({base,write})=>{
  write([event(now-86400000,'data.sec.gov','200'),
   event(now-60000,'data.sec.gov','503')]);
  return buildApiConnectionHealthFromLog(base,now);
 });
 snap.items[0].lastEventStatuses={'503':1,SECRET_TOKEN:1};
 const out=summarizeApiConnectionHealth(snap,now);
 assert.equal(out.reason,'INVALID_OBSERVATION');
 assert.equal(out.total,null);
 assert.equal(JSON.stringify(out).includes('SECRET_TOKEN'),false);
});
test('explicit whitelisted SEC HTTP statuses are extracted from the latest existing event only',()=>{
 const result=summarize([
  event(now-86400000,'data.sec.gov','200',5),
  mk(now-20000,{'data.sec.gov':{requests:4,statuses:{'200':2,'403':1,'429':1}}})
 ]);
 assert.equal(result.items[0].requests,9);
 assert.equal(result.items[0].state,'failed');
 assert.deepEqual(result.items[0].lastEventStatuses,{'200':2,'403':1,'429':1});
 assert.equal(result.items[0].reasonCode,'LAST_EVENT_HAS_FAILURE');
});


const evidenceNow=Date.parse('2026-11-16T08:40:00Z');
const today='2026-11-16T06:40:00.000Z';
const monitoredCalendar=()=>({sources:Object.fromEntries(MONITORED_CALENDAR_SOURCES.map(id=>[id,{
 status:'READY',checkedAt:today,sourceUrl:'https://official.example.org/valid'
}]))});
const receipt=(id,url,at,status='200')=>{
 const fingerprint=providerEndpointFingerprint(url);
 return JSON.stringify({at,endpointPaths:{[fingerprint.host]:{[fingerprint.id]:{
  requests:1,statuses:{[status]:1}
 }}}});
};
const recentReceipts=()=>({status:'OBSERVED',tailTruncated:false,rowsTruncated:false,lines:[
 receipt('earnings_api','https://api.earningsapi.com/v1/calendar/earnings',today),
 receipt('dol_eta539','https://oui.doleta.gov/unemploy/csv/ar539.csv',today)
]});

test('all 16 monitored source groups aggregate only from 14 parsed calendar sources and two exact HTTP path receipts',()=>{
 const snapshot=buildMonitoredSourceHealth(monitoredCalendar(),recentReceipts(),evidenceNow);
 const summary=summarizeApiConnectionHealth(snapshot,evidenceNow);
 assert.equal(snapshot.items.length,16);
 assert.equal(summary.normal,16);
 assert.equal(summary.failed,0);
 assert.equal(summary.unknown,0);
 assert.equal(summary.total,16);
 assert.equal(summary.status,'unknown'); // HTTP cohort has not been observed yet
 assert.equal(publicApiConnectionSummary(summary).normal,16);
 assert.equal(publicApiConnectionSummary(summary).total,16);
 assert.deepEqual(Object.keys(publicApiConnectionSummary(summary)).sort(),
  ['version','status','coverage','normal','failed','unknown','total','checkedAt','api','http'].sort());
});

test('unobserved direct endpoint paths are unknown, not proved by unrelated successful host calls',()=>{
 const unrelated='https://oui.doleta.gov/unemploy/wkclaims/report.asp';
 const log={status:'OBSERVED',tailTruncated:false,rowsTruncated:false,
  lines:[receipt('unrelated',unrelated,today)]};
 const summary=summarizeApiConnectionHealth(buildMonitoredSourceHealth(monitoredCalendar(),log,evidenceNow),evidenceNow);
 assert.equal(summary.normal,14);
 assert.equal(summary.unknown,2);
 assert.equal(summary.failed,0);
 assert.equal(summary.total,16);
 assert.equal(summary.status,'unknown');
});

test('exact latest direct-path 503 is warning even if yesterday was 200',()=>{
 const url='https://oui.doleta.gov/unemploy/csv/ar539.csv';
 const log={status:'OBSERVED',lines:[
  receipt('dol_eta539',url,'2026-11-15T06:40:00.000Z'),
  receipt('dol_eta539',url,today,'503'),
  receipt('earnings_api','https://api.earningsapi.com/v1/calendar/earnings',today)
 ]};
 const summary=summarizeApiConnectionHealth(buildMonitoredSourceHealth(monitoredCalendar(),log,evidenceNow),evidenceNow);
 assert.equal(summary.failed,1);
 assert.equal(summary.normal,15);
 assert.equal(summary.unknown,0);
 assert.equal(summary.status,'partial');
});

test('stale 200, missing calendar parse and quota guard do not become false connection alarms',()=>{
 const stale='2026-11-09T06:40:00.000Z';
 const sources=monitoredCalendar();
 sources.sources.bls={status:'READY',checkedAt:stale};
 const log={status:'OBSERVED',lines:[
  receipt('earnings_api','https://api.earningsapi.com/v1/calendar/earnings',today,'PROVIDER_QUOTA_GUARD'),
  receipt('dol_eta539','https://oui.doleta.gov/unemploy/csv/ar539.csv',stale)
 ]};
 const snapshot=buildMonitoredSourceHealth(sources,log,evidenceNow);
 const summary=summarizeApiConnectionHealth(snapshot,evidenceNow);
 assert.equal(summary.normal,13);
 assert.equal(summary.failed,0);
 assert.equal(summary.unknown,3);
});

test('incomplete or forged monitored registry never publishes a green count',()=>{
 const snapshot=buildMonitoredSourceHealth(monitoredCalendar(),recentReceipts(),evidenceNow);
 const forged={...snapshot,items:snapshot.items.slice(0,15)};
 const out=summarizeApiConnectionHealth(forged,evidenceNow);
 assert.equal(out.total,null);
 assert.equal(publicApiConnectionSummary(out).total,null);
 const old=summarizeApiConnectionHealth(snapshot,evidenceNow+API_CONNECTION_SNAPSHOT_MAX_AGE_MS+1);
 assert.equal(old.total,null);
});


const allHttpHosts=(at,outcomes={})=>({
 version:1,scope:'external-provider-hosts',source:'PC_COLLECTION_EVENTS_FETCH_WRAPPER',
 coverage:'PARTIAL',observedAt:new Date(at).toISOString(),
 items:Array.from({length:32},(_,i)=>{
  const outcome=outcomes[i]??'success';
  const attempted=at-12000;
  return {host:'host'+i+'.provider.example.org',requests:2,observedDays:2,
   lastOutcome:outcome,lastAttemptAt:attempted,
   lastSuccessAt:outcome==='failure'?at-86400000:attempted,
   expectedIntervalMs:null,endpointFingerprints:0,endpointEvidenceDays:0,
   lastEventStatuses:outcome==='failure'?{'503':2}:{'200':2}};
 })
});
test('separate API 14/14 and HTTP 32/32 when both evidence sets are valid',()=>{
 const snapshot=buildMonitoredSourceHealth(monitoredCalendar(),recentReceipts(),evidenceNow);
 snapshot.httpHosts=allHttpHosts(evidenceNow);
 const summary=summarizeApiConnectionHealth(snapshot,evidenceNow);
 const body=publicApiConnectionSummary(summary);
 assert.deepEqual(body.api,{normal:14,failed:0,unknown:0,total:14});
 assert.deepEqual(body.http,{normal:32,failed:0,unknown:0,total:32});
 assert.equal(body.status,'healthy');
 assert.equal(body.normal,16); // legacy monitored sources unchanged
 assert.ok(!JSON.stringify(body).includes('host0.provider'));
});
test('HTTP host failure changes ratio, never prints fabricated 32/32',()=>{
 const snapshot=buildMonitoredSourceHealth(monitoredCalendar(),recentReceipts(),evidenceNow);
 snapshot.httpHosts=allHttpHosts(evidenceNow,{7:'failure'});
 const body=publicApiConnectionSummary(summarizeApiConnectionHealth(snapshot,evidenceNow));
 assert.deepEqual(body.api,{normal:14,failed:0,unknown:0,total:14});
 assert.deepEqual(body.http,{normal:31,failed:1,unknown:0,total:32});
 assert.equal(body.status,'partial');
});

test('HTTP host connectivity remains green for same-batch SEC frame 200+optional 404',()=>{
 const snapshot=buildMonitoredSourceHealth(monitoredCalendar(),recentReceipts(),evidenceNow);
 snapshot.httpHosts=allHttpHosts(evidenceNow);
 const sec=snapshot.httpHosts.items[10];
 sec.lastOutcome='mixed';sec.lastEventStatuses={'200':7,'404':2};
 sec.requests=9;
 const raw=summarizeApiConnectionHealth(snapshot.httpHosts,evidenceNow);
 assert.equal(raw.items[10].state,'failed'); // source-level HTTP errors remain observable
 const body=publicApiConnectionSummary(summarizeApiConnectionHealth(snapshot,evidenceNow));
 assert.deepEqual(body.http,{normal:32,failed:0,unknown:0,total:32});
 assert.equal(body.status,'healthy');
});
test('HTTP 404-only does not become a green connection',()=>{
 const snapshot=buildMonitoredSourceHealth(monitoredCalendar(),recentReceipts(),evidenceNow);
 snapshot.httpHosts=allHttpHosts(evidenceNow,{10:'failure'});
 snapshot.httpHosts.items[10].lastEventStatuses={'404':2};
 const body=publicApiConnectionSummary(summarizeApiConnectionHealth(snapshot,evidenceNow));
 assert.deepEqual(body.http,{normal:31,failed:0,unknown:1,total:32});
 assert.equal(body.status,'unknown');
});
test('HTTP mixed 2xx with authorization, request, server or network failure remains warning',()=>{
 for(const error of ['400','401','403','410','500','503','NETWORK_ERROR']){
  const snapshot=buildMonitoredSourceHealth(monitoredCalendar(),recentReceipts(),evidenceNow);
  snapshot.httpHosts=allHttpHosts(evidenceNow);
  const h=snapshot.httpHosts.items[10];h.lastOutcome='mixed';h.lastEventStatuses={'200':1,[error]:1};
  const body=publicApiConnectionSummary(summarizeApiConnectionHealth(snapshot,evidenceNow));
  assert.deepEqual(body.http,{normal:31,failed:1,unknown:0,total:32},error);
 }
});
test('HTTP 429 plus 2xx is reachable, quota guard alone is unknown',()=>{
 const snapshot=buildMonitoredSourceHealth(monitoredCalendar(),recentReceipts(),evidenceNow);
 snapshot.httpHosts=allHttpHosts(evidenceNow);
 const h=snapshot.httpHosts.items[10];h.lastOutcome='mixed';h.lastEventStatuses={'200':1,'429':1};
 const body=publicApiConnectionSummary(summarizeApiConnectionHealth(snapshot,evidenceNow));
 assert.equal(body.http.normal,32);
});
test('HTTP cannot call a fabricated success green without a 2xx receipt',()=>{
 const snapshot=buildMonitoredSourceHealth(monitoredCalendar(),recentReceipts(),evidenceNow);
 snapshot.httpHosts=allHttpHosts(evidenceNow);
 const h=snapshot.httpHosts.items[10];h.lastOutcome='success';h.lastEventStatuses={'404':2};
 const body=publicApiConnectionSummary(summarizeApiConnectionHealth(snapshot,evidenceNow));
 assert.deepEqual(body.http,{normal:31,failed:0,unknown:1,total:32});
});

test('HTTP stale cadence is unknown rather than orange failure',()=>{
 const snapshot=buildMonitoredSourceHealth(monitoredCalendar(),recentReceipts(),evidenceNow);
 snapshot.httpHosts=allHttpHosts(evidenceNow);
 const h=snapshot.httpHosts.items[10];
 h.lastAttemptAt=evidenceNow-10*86400000;
 h.lastSuccessAt=h.lastAttemptAt;
 const body=publicApiConnectionSummary(summarizeApiConnectionHealth(snapshot,evidenceNow));
 assert.deepEqual(body.http,{normal:31,failed:0,unknown:1,total:32});
 assert.equal(body.status,'unknown');
});
test('legacy-only monitored snapshot retains API 14 but does not assert HTTP 32',()=>{
 const snapshot=buildMonitoredSourceHealth(monitoredCalendar(),recentReceipts(),evidenceNow);
 const body=publicApiConnectionSummary(summarizeApiConnectionHealth(snapshot,evidenceNow));
 assert.deepEqual(body.api,{normal:14,failed:0,unknown:0,total:14});
 assert.equal(body.http,null);
 assert.equal(body.status,'unknown');
});
test('untrusted standalone HTTP host snapshot never exposes host names as public status',()=>{
 const body=publicApiConnectionSummary(summarizeApiConnectionHealth(allHttpHosts(evidenceNow),evidenceNow));
 assert.equal(body.api,null);
 assert.equal(body.http,null);
 assert.equal(body.total,null);
});

test('HTTP quota guard and 429 are unknown, never a false orange connection failure',()=>{
 const snapshot=buildMonitoredSourceHealth(monitoredCalendar(),recentReceipts(),evidenceNow);
 snapshot.httpHosts=allHttpHosts(evidenceNow,{3:'failure',4:'failure'});
 snapshot.httpHosts.items[3].lastEventStatuses={'429':2};
 snapshot.httpHosts.items[4].lastEventStatuses={PROVIDER_QUOTA_GUARD:2};
 const status=publicApiConnectionSummary(summarizeApiConnectionHealth(snapshot,evidenceNow));
 assert.deepEqual(status.http,{normal:30,failed:0,unknown:2,total:32});
 assert.equal(status.status,'unknown');
});
