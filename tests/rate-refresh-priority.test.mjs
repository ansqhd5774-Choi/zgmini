import test from 'node:test';import assert from 'node:assert/strict';
import {shouldPrioritizeRates,overdueRateJob,RATE_REFRESH_ATTEMPT_INTERVAL_MS as HOUR} from '../scripts/pc-writer/rate-refresh-priority.mjs';
const now=10*HOUR;
test('overdue rates get a core slot despite continuously due public feeds',async()=>{
 const core={prepare(sql){if(sql.includes('sqlite_master'))return {async first(){return {name:'market_collection_jobs_v1'};}};assert.match(sql,/WHERE job='rates'/);return {async first(){return {finished_at:now-3*HOUR,lease_until:0,status:'COMPLETE'};}};}};
 assert.equal(await overdueRateJob(core,now),'rates');
 assert.equal(shouldPrioritizeRates(null,now),true);
});
test('first collection can bootstrap without an existing job table',async()=>{
 assert.equal(await overdueRateJob({prepare(){return {async first(){return null;}};}},now),'rates');
});
test('success and failure share an hourly attempt cooldown; boundary is inclusive',()=>{
 for(const status of ['COMPLETE','SOURCE_FAILED','COLLECT_FAILED']){
  assert.equal(shouldPrioritizeRates({finished_at:now-HOUR+1,status},now),false);
  assert.equal(shouldPrioritizeRates({finished_at:now-HOUR,status},now),true);
 }
});
test('active lease and future/invalid timestamps cannot trigger extra collection',()=>{
 assert.equal(shouldPrioritizeRates({finished_at:0,lease_until:now+1},now),false);
 for(const finished_at of [now+1,-1,'bad'])assert.equal(shouldPrioritizeRates({finished_at},now),false);
});
