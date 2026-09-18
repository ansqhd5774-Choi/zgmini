import test from 'node:test';
import assert from 'node:assert/strict';
import {runRev7Backfill,previousRev7Candidate} from '../worker/korea-rev7-backfill.mjs';

const success=date=>({
  requestedDate:date,status:'SUCCESS',complete:true,
  rows:[{date,securityId:'1',shortCode:'1',close:1,high:1,low:1,changeAmount:1,shareVolume:1}],
  series:{date},quality:{kospiCount:1,validHighCount:1,validLowCount:1,validShareVolumeCount:1},
  krxRequestCount:5,bokRequestCount:2,researchOnly:true,productionEligible:false
});
const empty=date=>({requestedDate:date,status:'NO_TRADING_OBSERVATION',complete:true,rows:[],series:null,
  krxRequestCount:1,bokRequestCount:0,researchOnly:true,productionEligible:false});

class Store{
  constructor(){this.data=new Map();this.progress={successfulTradingDates:0,oldestProcessedDate:null,latestProcessedDate:null,status:'IDLE'};this.lease=false;this.status=[];this.snapshots=0;}
  async acquireLease(){if(this.lease)return false;this.lease=true;return true;}
  async renewLease(){if(!this.lease)throw Error('lease');}
  async releaseLease(){this.lease=false;return true;}
  async getBackfillProgress(){return {...this.progress};}
  async markBackfillStatus(status,failureCode=null){this.status.push([status,failureCode]);this.progress.status=status;this.progress.lastFailureCode=failureCode;}
  async getDate(d){return this.data.get(d)??null;}
  async saveDate(s){this.data.set(s.requestedDate,s);this.progress.oldestProcessedDate=this.progress.oldestProcessedDate?s.requestedDate<this.progress.oldestProcessedDate?s.requestedDate:this.progress.oldestProcessedDate:s.requestedDate;this.progress.latestProcessedDate=this.progress.latestProcessedDate?s.requestedDate>this.progress.latestProcessedDate?s.requestedDate:this.progress.latestProcessedDate:s.requestedDate;if(s.status==='SUCCESS')this.progress.successfulTradingDates++;}
  async getHistory(){return {marketRows:[],dailySeries:[]};}
  async saveSnapshot(){this.snapshots++;return true;}
}
test('calendar walker handles leap/year boundaries',()=>{
  assert.equal(previousRev7Candidate('20240301'),'20240229');
  assert.equal(previousRev7Candidate('20260101'),'20251231');
});
test('one successful date is bounded and releases lease',async()=>{
  const s=new Store(),calls=[];
  const r=await runRev7Backfill({store:s,krxKey:'k',bokKey:'b',targetAdditionalDates:1,
    fetchDate:async d=>{calls.push(d);return success(d);}});
  assert.equal(r.status,'CHUNK_COMPLETE');
  assert.equal(r.providerRequests,7);
  assert.equal(r.krxRequests,5);
  assert.equal(r.bokRequests,2);
  assert.equal(r.additionalSuccessfulDates,1);
  assert.equal(r.progress.successfulTradingDates,1);
  assert.equal(s.lease,false);
  assert.equal(r.leaseReleased,true);
  assert.deepEqual(calls,['20260915']);
  assert.deepEqual(s.status,[['RUNNING',null],['PAUSED',null]]);
});
test('weekend and empty weekday do not increment success',async()=>{
  const s=new Store(),calls=[];
  const r=await runRev7Backfill({store:s,krxKey:'k',bokKey:'b',targetAdditionalDates:1,maxCalendarCandidates:5,
    fetchDate:async d=>{calls.push(d);return d==='20260915'?empty(d):success(d);}});
  assert.deepEqual(calls,['20260915','20260914']);
  assert.equal(r.noObservationDates,1);
  assert.equal(r.additionalSuccessfulDates,1);
  assert.equal(r.providerRequests,8);
});
test('resume starts before the oldest persisted date and does not refetch it',async()=>{
  const s=new Store();await s.saveDate(success('20260915'));
  const calls=[];
  const r=await runRev7Backfill({store:s,krxKey:'k',bokKey:'b',targetAdditionalDates:1,fetchDate:async d=>{calls.push(d);return success(d);}});
  assert.deepEqual(calls,['20260914']);
  assert.equal(r.reusedDates,0);
  assert.equal(r.additionalSuccessfulDates,1);
  assert.equal(r.progress.successfulTradingDates,2);
  assert.equal(r.progress.oldestProcessedDate,'20260914');
  assert.equal(r.leaseReleased,true);
});
test('provider failure stops, records ERROR, and releases lease',async()=>{
  const s=new Store();
  const r=await runRev7Backfill({store:s,krxKey:'k',bokKey:'b',fetchDate:async()=>{throw Error('private');}});
  assert.equal(r.status,'ERROR');
  assert.equal(r.failureCode,'PROVIDER_FAILURE');
  assert.equal(s.progress.status,'ERROR');
  assert.equal(s.lease,false);
  assert.equal(r.leaseReleased,true);
  assert.equal(JSON.stringify(r).includes('private'),false);
});
test('second concurrent runner is fenced',async()=>{
  const s=new Store();s.lease=true;
  const r=await runRev7Backfill({store:s,krxKey:'k',bokKey:'b',fetchDate:async d=>success(d)});
  assert.equal(r.status,'ALREADY_RUNNING');
  assert.equal(r.leaseReleased,false);
});
