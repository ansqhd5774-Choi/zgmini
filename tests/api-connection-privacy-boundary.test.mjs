import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicApiConnectionSummary,readPublicApiConnectionHealth} from '../worker/api-connection-health.mjs';

const source=relative=>readFileSync(new URL(relative,import.meta.url),'utf8');
const KEYS=['api','http','checkedAt','coverage','failed','normal','status','total','unknown','version'].sort();

test('both public routes use only the sanitized allowlist projection, never the raw internal response',()=>{
 const route=source('../app/api/api-connection-health/route.ts');
 const worker=source('../worker/candidate-r52.ts');
 assert.match(route,/readPublicApiConnectionHealth\(env.DB\)/);
 assert.match(worker,/readPublicApiConnectionHealth\(env.DB_CORE\)/);
 assert.doesNotMatch(route,/readApiConnectionHealth\(|readPublicApiConnectionHealth\(\)\.?items/);
 assert.doesNotMatch(worker,/readApiConnectionHealth\(/);
});
test('public icon and popup are restored without provider roster or diagnostic paths',()=>{
 const ui=source('../components/collection-health-indicator.tsx');
 assert.match(ui,/Wifi size=\{18\}/);
 assert.match(ui,/zg-collection-health-popup/);
 assert.match(ui,/API : \{countLine\(health!\.api\)\}/);
 assert.match(ui,/HTTP : \{countLine\(health!\.http\)\}/);
 assert.doesNotMatch(ui,/\.host\b|endpointEvidence|lastEventStatuses|requests\b|\.map\(item|<ul/);
});
test('public response allowlist cannot accidentally leak nested upstream information',()=>{
 const raw={version:1,status:'partial',coverage:'PARTIAL',normal:1,failed:2,unknown:3,total:6,
  scope:'active-api-endpoints',activeInventoryVerified:true,limitedCoverage:false,
  checkedAt:'2026-11-16T02:00:00Z',items:[{host:'SECRET_SOURCE_HOST'}],
  endpointEvidence:{token:'SECRET_PATH'},secret:'SECRET_VALUE',
  reason:'SECRET_ROOT_CAUSE',lastEventStatuses:{'403':2}};
 const published=publicApiConnectionSummary(raw);
 assert.deepEqual(Object.keys(published).sort(),KEYS);
 assert.equal(published.total,6);
 assert.equal(published.api,null);
 assert.equal(published.http,null);
 assert.ok(!JSON.stringify(published).includes('SECRET'));
});
test('public live D1 read never returns private host or endpoint information',async()=>{
 const now=Date.parse('2026-11-16T02:00:00Z');
 const internal={
  version:1,scope:'external-provider-hosts',
  source:'PC_COLLECTION_EVENTS_FETCH_WRAPPER',coverage:'PARTIAL',
  observedAt:new Date(now-1000).toISOString(),
  items:[{host:'private-upstream.example.com',requests:2,observedDays:2,
   lastOutcome:'success',lastAttemptAt:now-1000,lastSuccessAt:now-1000,
   expectedIntervalMs:null,endpointFingerprints:0,endpointEvidenceDays:0,
   lastEventStatuses:{'200':2}}],
 };
 const db={prepare(sql){
  assert.match(sql,/public_feed_snapshots_v1/);
  return{bind(key){assert.equal(key,'api-connection-health');return{
    first:async()=>({body:JSON.stringify(internal)})};
  }}}
 };
 const res=await readPublicApiConnectionHealth(db,now);
 assert.equal(res.status,200);
 assert.match(res.headers.get('cache-control'),/no-store/);
 const text=await res.text();
 const body=JSON.parse(text);
 assert.deepEqual(Object.keys(body).sort(),KEYS);
 assert.equal(body.normal,null);
 assert.equal(body.failed,null);
 assert.equal(body.unknown,null);
 assert.equal(body.total,null);
 assert.equal(body.api,null);
 assert.equal(body.http,null);
 assert.equal(body.status,'unknown');
 assert.equal(body.coverage,'UNVERIFIED');
 assert.ok(!text.includes('private-upstream'));
 assert.ok(!text.includes('lastEventStatuses'));
 assert.ok(!text.includes('endpoint'));
 assert.ok(!text.includes('200'));
});
test('partial historical host totals never appear as verified API connection errors',()=>{
 const historical={version:1,scope:'external-provider-hosts',status:'partial',coverage:'PARTIAL',
  normal:29,failed:2,unknown:1,total:32,limitedCoverage:true,
  checkedAt:'2026-11-16T07:35:35.602Z'};
 const published=publicApiConnectionSummary(historical);
 assert.deepEqual(Object.keys(published).sort(),KEYS);
 assert.equal(published.status,'unknown');
 assert.equal(published.coverage,'UNVERIFIED');
 for(const key of ['normal','failed','unknown','total'])assert.equal(published[key],null);
 assert.equal(published.api,null);
 assert.equal(published.http,null);
 assert.equal(published.checkedAt,historical.checkedAt);
});

test('only explicitly verified active API inventory may publish count aggregates',()=>{
 const verified={version:1,scope:'active-api-endpoints',activeInventoryVerified:true,
  limitedCoverage:false,coverage:'PARTIAL',status:'healthy',normal:16,failed:0,unknown:0,total:16,
  checkedAt:'2026-11-16T07:35:35.602Z'};
 assert.equal(publicApiConnectionSummary(verified).total,16);
 assert.equal(publicApiConnectionSummary(verified).api,null);
 assert.equal(publicApiConnectionSummary(verified).http,null);
 for(const key of ['activeInventoryVerified','limitedCoverage','scope']){
  assert.equal(Object.hasOwn(publicApiConnectionSummary(verified),key),false);
 }
 assert.equal(publicApiConnectionSummary({...verified,limitedCoverage:true}).total,null);
 assert.equal(publicApiConnectionSummary({...verified,activeInventoryVerified:false}).total,null);
 assert.equal(publicApiConnectionSummary({...verified,scope:'external-provider-hosts'}).total,null);
});

test('unavailable D1 returns only neutral aggregate without internal diagnostics',async()=>{
 const res=await readPublicApiConnectionHealth({prepare(){throw Error('TOP_SECRET_DB_ERROR');}});
 assert.equal(res.status,503);
 const txt=await res.text();
 assert.deepEqual(Object.keys(JSON.parse(txt)).sort(),KEYS);
 assert.ok(!txt.includes('TOP_SECRET'));
 assert.equal(JSON.parse(txt).total,null);
});
