import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
 providerEndpointFingerprint,observeIndependentProviderFetch,
 appendProviderEndpointEvent,PROVIDER_ENDPOINT_LOG
} from '../scripts/pc-writer/provider-endpoint-fingerprint.mjs';
import {appendCollectionEvent} from '../scripts/pc-writer/collection-events.mjs';
import {buildApiConnectionHealthFromLog} from '../scripts/pc-writer/api-connection-health.mjs';
import {summarizeApiConnectionHealth} from '../worker/api-connection-health.mjs';

const now=Date.parse('2026-11-16T03:00:00Z');
const event=(at,host,status='200')=>({
 at:new Date(at).toISOString(),lane:'core',status:'COMPLETE',
 providers:{[host]:{requests:1,statuses:{[status]:1}}}
});
function withHome(fn){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-indep-'));
 const base=path.join(folder,'pc-writer');fs.mkdirSync(base);
 try{return fn(base);}finally{fs.rmSync(folder,{recursive:true,force:true});}
}
async function withHomeAsync(fn){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-indep-'));
 const base=path.join(folder,'pc-writer');fs.mkdirSync(base);
 try{return await fn(base);}finally{fs.rmSync(folder,{recursive:true,force:true});}
}
const digest=(url,init)=>providerEndpointFingerprint(url,init).id;
test('Alpaca observer preserves original HTTP response and does not persist key, path or query',()=>withHomeAsync(async base=>{
 let requests=0;
 const wrapper=observeIndependentProviderFetch(base,'ALPACA_INCREMENTAL',async()=>{
  requests++;return new Response('ok',{status:200});
 },{now:()=>now});
 const url='https://data.alpaca.markets/v2/stocks/bars?api_key=DO-NOT-STORE&symbols=MSFT';
 const response=await wrapper(url);
 assert.equal(response.status,200);
 assert.equal(await response.text(),'ok');
 assert.equal(requests,1);
 const log=fs.readFileSync(path.join(base,PROVIDER_ENDPOINT_LOG),'utf8');
 assert.ok(!log.includes('DO-NOT-STORE'));
 assert.ok(!log.includes('/v2/stocks/bars'));
 assert.ok(!log.includes('MSFT'));
 const entry=JSON.parse(log);
 assert.equal(entry.collector,'ALPACA_INCREMENTAL');
 assert.equal(entry.endpointPaths['data.alpaca.markets'][digest(url)].statuses['200'],1);
}));
test('Sector observer records HTTP 503 without changing the returned response',()=>withHomeAsync(async base=>{
 const wrapper=observeIndependentProviderFetch(base,'SECTOR_PROVISIONAL',async()=>new Response('down',{status:503}),{now:()=>now});
 const response=await wrapper('https://data.alpaca.markets/v2/stocks/bars');
 assert.equal(response.status,503);
 const entry=JSON.parse(fs.readFileSync(path.join(base,PROVIDER_ENDPOINT_LOG),'utf8'));
 assert.equal(entry.endpointPaths['data.alpaca.markets'][digest('https://data.alpaca.markets/v2/stocks/bars')].statuses['503'],1);
}));
test('Network error is rethrown unchanged and logged without error message',()=>withHomeAsync(async base=>{
 const original=Object.assign(new Error('PRIVATE-SECRET'),{code:'ECONNRESET'});
 const wrapper=observeIndependentProviderFetch(base,'ALPACA_INCREMENTAL',async()=>{throw original;},{now:()=>now});
 await assert.rejects(wrapper('https://data.alpaca.markets/v2/stocks/bars'),error=>error===original);
 const log=fs.readFileSync(path.join(base,PROVIDER_ENDPOINT_LOG),'utf8');
 assert.ok(!log.includes('PRIVATE-SECRET'));
 const entry=JSON.parse(log);
 assert.equal(entry.endpointPaths['data.alpaca.markets'][digest('https://data.alpaca.markets/v2/stocks/bars')].statuses.NETWORK_ERROR,1);
}));
test('Quota guard remains exact error and is not mislabeled as remote HTTP failure',()=>withHomeAsync(async base=>{
 const original=Object.assign(new Error('quota'),{code:'PROVIDER_QUOTA_GUARD'});
 const wrapper=observeIndependentProviderFetch(base,'ALPACA_INCREMENTAL',async()=>{throw original;},{now:()=>now});
 await assert.rejects(wrapper('https://data.alpaca.markets/v2/stocks/bars'),error=>error===original);
 const entry=JSON.parse(fs.readFileSync(path.join(base,PROVIDER_ENDPOINT_LOG),'utf8'));
 assert.equal(entry.endpointPaths['data.alpaca.markets'][digest('https://data.alpaca.markets/v2/stocks/bars')].statuses.PROVIDER_QUOTA_GUARD,1);
}));
test('Observer never prevents collection when local receipt writer fails',async()=>{
 const response=await observeIndependentProviderFetch('/nonexistent','ALPACA_INCREMENTAL',
  async()=>new Response('ok',{status:200}),{append(){throw Error('LOG_VOLUME_FULL')},now:()=>now})('https://data.alpaca.markets/v2/stocks/bars');
 assert.equal(response.status,200);
});
test('Unknown collector cannot impersonate an approved observation',()=>{
 assert.throws(()=>observeIndependentProviderFetch('/tmp','FICTITIOUS',async()=>{}),/UNAPPROVED_INDEPENDENT_COLLECTOR/);
});
test('Distinct independent host extends unique path count but not unverified host-normal denominator',()=>withHome(base=>{
 const bls='api.bls.gov',alpaca='data.alpaca.markets',blsUrl='https://api.bls.gov/publicAPI/v2/timeseries/data/';
 const core=event(now-3600000,bls);
 appendCollectionEvent(base,core);
 appendProviderEndpointEvent(base,{at:core.at,endpointPaths:{[bls]:{[digest(blsUrl)]:{requests:1,statuses:{'200':1}}}},endpointTrackingOmitted:0});
 appendProviderEndpointEvent(base,{at:new Date(now-1000).toISOString(),collector:'ALPACA_INCREMENTAL',
  endpointPaths:{[alpaca]:{[digest('https://data.alpaca.markets/v2/stocks/bars')]:{requests:1,statuses:{'200':1}}}},endpointTrackingOmitted:0});
 const snapshot=buildApiConnectionHealthFromLog(base,now);
 assert.equal(snapshot.items.length,1);
 assert.equal(snapshot.endpointObservation.observedFingerprintCount,1);
 assert.equal(snapshot.endpointObservation.independentObservedFingerprintCount,1);
 assert.equal(snapshot.endpointObservation.independentObservedHostCount,1);
 assert.equal(snapshot.endpointObservation.independentObservedCollectorCount,1);
 assert.equal(snapshot.endpointObservation.combinedObservedFingerprintCount,2);
 const pub=summarizeApiConnectionHealth(snapshot,now);
 assert.equal(pub.total,0); // only one collection day observed in the existing host inventory
 assert.equal(pub.endpointEvidence.combinedObservedFingerprintCount,2);
 assert.equal(pub.endpointEvidence.independentCollectorsCovered,false);
}));
test('Overlapping independent path does not inflate combined unique HTTP path count',()=>withHome(base=>{
 const host='data.alpaca.markets',url='https://data.alpaca.markets/v2/stocks/bars',id=digest(url);
 const core=event(now-3600000,host);
 appendCollectionEvent(base,core);
 appendProviderEndpointEvent(base,{at:core.at,endpointPaths:{[host]:{[id]:{requests:1,statuses:{'200':1}}}},endpointTrackingOmitted:0});
 appendProviderEndpointEvent(base,{at:new Date(now-1000).toISOString(),collector:'SECTOR_PROVISIONAL',
  endpointPaths:{[host]:{[id]:{requests:1,statuses:{'503':1}}}},endpointTrackingOmitted:0});
 const pub=summarizeApiConnectionHealth(buildApiConnectionHealthFromLog(base,now),now);
 assert.equal(pub.endpointEvidence.observedFingerprintCount,1);
 assert.equal(pub.endpointEvidence.independentObservedFingerprintCount,1);
 assert.equal(pub.endpointEvidence.combinedObservedFingerprintCount,1);
}));
test('Forged independent collector identity is rejected, not counted',()=>withHome(base=>{
 const host='api.bls.gov',core=event(now-120000,host),url='https://api.bls.gov/foo';
 appendCollectionEvent(base,core);
 fs.appendFileSync(path.join(base,PROVIDER_ENDPOINT_LOG),JSON.stringify({at:new Date(now-1000).toISOString(),
  collector:'FAKE_COLLECTOR',endpointPaths:{[host]:{[digest(url)]:{requests:1,statuses:{'200':1}}}},endpointTrackingOmitted:0})+'\n');
 const snapshot=buildApiConnectionHealthFromLog(base,now);
 assert.equal(snapshot.endpointObservation.independentObservedFingerprintCount,null);
 assert.equal(snapshot.diagnostics.invalidEndpointEvents,1);
}));
test('Unstructured stale collector result does not appear as successful new HTTP event',()=>withHome(base=>{
 const host='api.bls.gov';appendCollectionEvent(base,event(now-120000,host));
 appendProviderEndpointEvent(base,{at:new Date(now-30*86400000).toISOString(),collector:'ALPACA_INCREMENTAL',
  endpointPaths:{'data.alpaca.markets':{[digest('https://data.alpaca.markets/v2/stocks/bars')]:{requests:1,statuses:{'200':1}}}},endpointTrackingOmitted:0});
 const snapshot=buildApiConnectionHealthFromLog(base,now);
 assert.equal(snapshot.endpointObservation.independentObservedFingerprintCount,null);
}));

test('Quota-guard-only independent attempt does not count as a contacted endpoint',()=>withHome(base=>{
 const host='api.bls.gov';
 appendCollectionEvent(base,event(now-120000,host));
 const pathUrl='https://data.alpaca.markets/v2/stocks/bars';
 appendProviderEndpointEvent(base,{at:new Date(now-1000).toISOString(),
  collector:'ALPACA_INCREMENTAL',
  endpointPaths:{'data.alpaca.markets':{[digest(pathUrl)]:{requests:1,statuses:{PROVIDER_QUOTA_GUARD:1}}}},
  endpointTrackingOmitted:0});
 const snap=buildApiConnectionHealthFromLog(base,now);
 assert.equal(snap.endpointObservation.independentObservedFingerprintCount,null);
 assert.equal(snap.endpointObservation.independentObservedCollectorCount,0);
 assert.equal(snap.endpointObservation.combinedObservedFingerprintCount,null);
}));
