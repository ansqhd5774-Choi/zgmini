import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {providerEndpointFingerprint,appendProviderEndpointEvent,PROVIDER_ENDPOINT_LOG} from '../scripts/pc-writer/provider-endpoint-fingerprint.mjs';
import {appendCollectionEvent} from '../scripts/pc-writer/collection-events.mjs';
import {buildApiConnectionHealthFromLog} from '../scripts/pc-writer/api-connection-health.mjs';
import {summarizeApiConnectionHealth} from '../worker/api-connection-health.mjs';
const NOW=Date.parse('2026-11-16T00:00:00Z');
const get=(url,init)=>providerEndpointFingerprint(url,init);
const req=(status='200',count=1)=>({requests:count,statuses:{[status]:count}});
const event=(at,host,routes)=>({
 at:new Date(at).toISOString(),lane:'core',status:'COMPLETE',
 providers:{[host]:req('200',Object.values(routes).reduce((n,r)=>n+r.requests,0))},
 endpointPaths:{[host]:routes},endpointTrackingOmitted:0
});
function temp(callback){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-endpoint-'));
 const home=path.join(dir,'pc-writer');fs.mkdirSync(home);
 try{return callback(home);}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('one method+path, different API keys/query/series produce one endpoint digest',()=>{
 const a=get('https://api.stlouisfed.org/fred/series/observations?api_key=SECRET123&series_id=CPIAUCSL');
 const b=get('https://api.stlouisfed.org/fred/series/observations?api_key=OTHER&series_id=GDP');
 assert.equal(a.id,b.id);assert.equal(a.host,'api.stlouisfed.org');
 assert.match(a.id,/^[0-9a-f]{32}$/);
 assert.ok(!JSON.stringify(a).includes('SECRET123'));
});
test('different paths and HTTP methods produce distinct digests',()=>{
 const base='https://api.bls.gov/publicAPI/v2/timeseries/data/';
 const a=get(base,{method:'GET'}),b=get(base,{method:'POST'}),c=get(base+'latest',{method:'GET'});
 assert.notEqual(a.id,b.id);assert.notEqual(a.id,c.id);assert.notEqual(b.id,c.id);
});
test('fetch Request method and init override are supported without leaking credentials',()=>{
 const request=new Request('https://api.bls.gov/publicAPI/v2/timeseries/data/?registrationkey=PRIVATE',{method:'POST'});
 assert.equal(get(request).id,get(request.url,{method:'POST'}).id);
 assert.equal(get(request,{method:'GET'}).id,get(request.url,{method:'GET'}).id);
 assert.ok(!JSON.stringify(get(request)).includes('registrationkey'));
});
test('invalid protocol, method and overlong path are not admitted',()=>{
 assert.equal(get('file:///tmp/secret'),null);
 assert.equal(get('https://api.bls.gov/',{method:'INVALID'}),null);
 assert.equal(get('https://api.bls.gov/'+'x'.repeat(1800)),null);
});
test('append-only log emits hashed endpoint evidence, never input URL or query',()=>temp(home=>{
 const host='api.stlouisfed.org',id=get('https://api.stlouisfed.org/fred/series/observations?api_key=DO-NOT-LOG').id;
 const e={at:new Date(NOW).toISOString(),lane:'core',status:'COMPLETE',
  providers:{[host]:req('200',3)},endpointPaths:{[host]:{[id]:req('200',3)}},
  endpointTrackingOmitted:0,secret:'DO-NOT-LOG'};
 appendCollectionEvent(home,e);appendProviderEndpointEvent(home,e);
 const body=fs.readFileSync(path.join(home,PROVIDER_ENDPOINT_LOG),'utf8');
 assert.ok(body.includes(id));assert.ok(!body.includes('DO-NOT-LOG'));
 assert.ok(!body.includes('/fred/series/observations'));
 assert.equal(JSON.parse(body).endpointPaths[host][id].requests,3);
}));
test('same host with two separate method+paths contributes two observed fingerprints',()=>temp(home=>{
 const host='api.stlouisfed.org';
 const a=get('https://api.stlouisfed.org/fred/series/observations').id;
 const b=get('https://api.stlouisfed.org/fred/series').id;
 for(const e of [event(NOW-86400000,host,{[a]:req('200',3),[b]:req('200',2)}),
  event(NOW-1000,host,{[a]:req('200',4)})]){appendCollectionEvent(home,e);appendProviderEndpointEvent(home,e);}
 const snapshot=buildApiConnectionHealthFromLog(home,NOW);
 assert.equal(snapshot.items[0].requests,9);
 assert.equal(snapshot.items[0].endpointFingerprints,2);
 assert.equal(snapshot.endpointObservation.observedFingerprintCount,2);
 assert.equal(snapshot.endpointObservation.observedHostCount,1);
 assert.equal(snapshot.endpointObservation.endpointIncompleteEvents,0);
 const pub=summarizeApiConnectionHealth(snapshot,NOW);
 assert.equal(pub.total,1);
 assert.equal(pub.endpointEvidence.observedFingerprintCount,2);
 assert.equal(pub.endpointEvidence.coverage,'PARTIAL');
 assert.equal(pub.endpointEvidence.independentCollectorsCovered,false);
 assert.ok(!JSON.stringify(pub).includes(a));
 assert.ok(!JSON.stringify(pub).includes(b));
}));
test('legacy host-only entries stay valid while endpoint coverage remains PARTIAL',()=>temp(home=>{
 const host='api.bls.gov',id=get('https://api.bls.gov/publicAPI/v2/timeseries/data/').id;
 appendCollectionEvent(home,{at:new Date(NOW-86400000).toISOString(),lane:'core',status:'COMPLETE',providers:{[host]:req('200',2)}});
 const newer=event(NOW-1000,host,{[id]:req('200',2)});
 appendCollectionEvent(home,newer);appendProviderEndpointEvent(home,newer);
 const snapshot=buildApiConnectionHealthFromLog(home,NOW);
 assert.equal(snapshot.items[0].endpointFingerprints,1);
 assert.equal(snapshot.endpointObservation.endpointIncompleteEvents,1);
 const pub=summarizeApiConnectionHealth(snapshot,NOW);
 assert.equal(pub.total,1);assert.equal(pub.endpointEvidence.coverage,'PARTIAL');
}));
test('mismatched route status counts cannot inflate observed endpoint count',()=>temp(home=>{
 const host='api.bls.gov',id=get('https://api.bls.gov/publicAPI/v2/timeseries/data/').id;
 const data=event(NOW,host,{[id]:{requests:3,statuses:{'200':2}}});
 fs.appendFileSync(path.join(home,'collection-events.jsonl'),JSON.stringify(data)+'\n');
 fs.appendFileSync(path.join(home,PROVIDER_ENDPOINT_LOG),JSON.stringify(data)+'\n');
 const snapshot=buildApiConnectionHealthFromLog(home,NOW);
 assert.equal(snapshot.items[0].endpointFingerprints,0);
 assert.equal(snapshot.endpointObservation.endpointIncompleteEvents,1);
}));
test('duplicate collection log line contributes once to fingerprint requests',()=>temp(home=>{
 const host='api.bls.gov',id=get('https://api.bls.gov/publicAPI/v2/timeseries/data/').id;
 const data=JSON.stringify(event(NOW,host,{[id]:req('200',2)}));
 fs.writeFileSync(path.join(home,'collection-events.jsonl'),data+'\n'+data+'\n');
 fs.writeFileSync(path.join(home,PROVIDER_ENDPOINT_LOG),data+'\n'+data+'\n');
 const snapshot=buildApiConnectionHealthFromLog(home,NOW);
 assert.equal(snapshot.items[0].requests,2);
 assert.equal(snapshot.items[0].endpointFingerprints,1);
 assert.equal(snapshot.diagnostics.duplicateEvents,1);
}));
