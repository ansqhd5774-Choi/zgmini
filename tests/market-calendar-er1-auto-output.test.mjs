import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {er1MonthlyPublicKey} from '../lib/market-calendar-er1-month-key.mjs';
import {savedER1MonthDays,futureER1Months,refreshSavedER1MonthlyOutputs} from
  '../scripts/pc-writer/market-calendar-er1-auto-output.mjs';

const row=(symbol,estimate)=>({symbol,name:symbol+' Inc',eps:null,
 revenue:null,epsEstimate:estimate,revenueEstimate:null});

function savedMonth(month,storedAt,{missing=[],invalidDay=null,lateDay=null}={}){
 const inputs=new Map();
 for(const day of savedER1MonthDays(month)){
  if(missing.includes(day))continue;
  const n=Number(day.slice(-2));
  const pre=n>=10&&n<=13?[row(['NEG','ZERO','POS','HIGH'][n-10],[-2,0,1,5][n-10])]:
   n===14?[row('MISSING',null)]:[];
  const body={date:invalidDay===day?'2026-01-01':day,
   pre,after:[],notSupplied:[]};
  inputs.set('release-calendar:earnings-api:'+day,{storedAt:lateDay===day?
   Date.parse('2027-01-01T00:30:00Z'):Date.parse(storedAt),
   body:{requestedDate:day,text:JSON.stringify(body)}});
 }
 return inputs;
}

function fakeStore(inputs){
 const outputs=new Map();let writes=0;
 return {outputs,get writes(){return writes;},
  readInput:async key=>inputs.get(key)??null,
  readOutput:async key=>outputs.get(key)??null,
  writeOutput:async(key,body,now)=>{writes++;outputs.set(key,{body,storedAt:now});}};
}

function splitNovemberArchive(inputs,pcHome,{missingPrivate=null}={}){
 const folder=path.join(pcHome,'er1-input','nov30-forward-days');
 fs.mkdirSync(folder,{recursive:true});
 for(let n=17;n<=30;n++){
  const day=`2026-11-${String(n).padStart(2,'0')}`;
  const input=inputs.get('release-calendar:earnings-api:'+day);
  inputs.delete('release-calendar:earnings-api:'+day);
  if(day===missingPrivate)continue;
  fs.writeFileSync(path.join(folder,day+'.json'),JSON.stringify({
   storedAt:new Date(input.storedAt).toISOString(),
   body:JSON.parse(input.body.text),
  }));
 }
 return folder;
}

async function at(iso,action){
 mock.timers.enable({apis:['Date'],now:new Date(iso)});
 try{return await action(Date.now());}
 finally{mock.timers.reset();}
}

test('monthly future cohort dates are dynamically correct for 28/29/30/31 days',()=>{
 assert.equal(savedER1MonthDays('2027-02').length,28);
 assert.equal(savedER1MonthDays('2028-02').length,29);
 assert.equal(savedER1MonthDays('2027-06').length,30);
 assert.equal(savedER1MonthDays('2027-01').length,31);
 assert.throws(()=>savedER1MonthDays('2027-13'),/ER1_AUTO_MONTH_INVALID/);
 assert.deepEqual(futureER1Months(Date.parse('2027-01-01T14:00:00Z')),
  ['2027-01']);
 assert.ok(futureER1Months(Date.parse('2026-12-31T15:00:00Z'))
  .includes('2027-01'));
});

test('complete January saved EPS cohort automatically becomes local output without provider GET',async()=>{
 await at('2027-01-01T14:00:00Z',async now=>{
  const store=fakeStore(savedMonth('2027-01','2026-12-31T18:00:00Z'));
  const previousFetch=globalThis.fetch;
  globalThis.fetch=async()=>{throw Error('UNEXPECTED_PROVIDER_REQUEST');};
  try{
   const result=await refreshSavedER1MonthlyOutputs({store,now});
   assert.equal(result.status,'UPDATED');
   assert.equal(result.providerRequests,0);
   assert.deepEqual(result.months.map(x=>[x.month,x.status]),
    [['2027-01','READY_OUTPUT']]);
   const saved=store.outputs.get(er1MonthlyPublicKey('2027-01'));
   assert.equal(saved.storedAt,now);
   assert.equal(saved.body.asOf,'2027-01-01');
   assert.equal(saved.body.recordCount,4);
   assert.equal(saved.body.coverage.observedIssuers,5);
   assert.equal(saved.body.coverage.unscoreableReasons.ER1_FORECAST_EPS_MISSING,1);
   assert.equal(saved.body.method,'ER1_ESTIMATED_EPS_SIGNED_RANK_100_97_20261107');
   assert.equal(saved.body.threshold,97);
   assert.ok(!JSON.stringify(saved.body).includes('epsEstimate'));
   assert.equal(store.writes,1);
   const again=await refreshSavedER1MonthlyOutputs({store,now});
   assert.equal(again.status,'NO_NEW_OUTPUT');
   assert.equal(again.months[0].status,'UNCHANGED');
   assert.equal(store.writes,1);
  }finally{globalThis.fetch=previousFetch;}
 });
});

test('November 2026 complete saved cohort updates a new key, not the legacy published cohort',async()=>{
 await at('2026-11-01T14:00:00Z',async now=>{
  const store=fakeStore(savedMonth('2026-11','2026-10-31T18:00:00Z'));
  const legacyKey='market-calendar:earnings-nov2026-er1-score-public';
  const legacy={status:'EXISTING_NOVEMBER_LEGACY'};
  store.outputs.set(legacyKey,{body:legacy,storedAt:now-1000});
  const result=await refreshSavedER1MonthlyOutputs({store,now});
  assert.equal(result.months.find(x=>x.month==='2026-11')?.status,'READY_OUTPUT');
  assert.equal(store.outputs.get(er1MonthlyPublicKey('2026-11')).body.recordCount,4);
  assert.deepEqual(store.outputs.get(legacyKey).body,legacy);
  assert.equal(store.writes,1);
 });
});

test('November reads 16 SQLite and 14 archived private days without another GET',async()=>{
 const pcHome=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-er1-nov-'));
 try{
  await at('2026-11-07T19:00:00Z',async now=>{
   const inputs=savedMonth('2026-11','2026-11-06T18:00:00Z');
   splitNovemberArchive(inputs,pcHome);
   const store=fakeStore(inputs);
   const result=await refreshSavedER1MonthlyOutputs({store,now,pcHome});
   const november=result.months.find(x=>x.month==='2026-11');
   assert.equal(november.status,'READY_OUTPUT');
   assert.equal(november.sqliteDays,16);
   assert.equal(november.privateDays,14);
   assert.equal(november.providerRequests,0);
   assert.equal(store.outputs.get(er1MonthlyPublicKey('2026-11')).body.recordCount,4);
   assert.equal(store.writes,1);
  });
 }finally{fs.rmSync(pcHome,{recursive:true,force:true});}
});

test('missing or damaged private November day preserves the prior valid output',async()=>{
 const pcHome=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-er1-nov-'));
 try{
  await at('2026-11-07T19:00:00Z',async now=>{
   const inputs=savedMonth('2026-11','2026-11-06T18:00:00Z');
   const folder=splitNovemberArchive(inputs,pcHome);
   const store=fakeStore(inputs);
   const key=er1MonthlyPublicKey('2026-11');
   await refreshSavedER1MonthlyOutputs({store,now,pcHome});
   const previous=JSON.stringify(store.outputs.get(key).body);
   fs.unlinkSync(path.join(folder,'2026-11-30.json'));
   let result=await refreshSavedER1MonthlyOutputs({store,now,pcHome});
   assert.equal(result.months.find(x=>x.month==='2026-11').status,
    'SAVED_MONTH_INCOMPLETE');
   fs.writeFileSync(path.join(folder,'2026-11-30.json'),'not json');
   result=await refreshSavedER1MonthlyOutputs({store,now,pcHome});
   assert.equal(result.months.find(x=>x.month==='2026-11').status,
    'MONTH_SOURCE_INVALID');
   assert.equal(store.writes,1);
   assert.equal(JSON.stringify(store.outputs.get(key).body),previous);
  });
 }finally{fs.rmSync(pcHome,{recursive:true,force:true});}
});

test('December 2026 uses the same automatic month path and preserves legacy December',async()=>{
 await at('2026-12-01T14:00:00Z',async now=>{
  const store=fakeStore(savedMonth('2026-12','2026-11-30T18:00:00Z'));
  const legacyKey='market-calendar:earnings-dec2026-er1-score-public';
  const legacy={status:'EXISTING_DECEMBER_LEGACY'};
  store.outputs.set(legacyKey,{body:legacy,storedAt:now-1000});
  const result=await refreshSavedER1MonthlyOutputs({store,now});
  assert.equal(result.months.find(x=>x.month==='2026-12')?.status,'READY_OUTPUT');
  assert.equal(store.outputs.get(er1MonthlyPublicKey('2026-12')).body.recordCount,4);
  assert.deepEqual(store.outputs.get(legacyKey).body,legacy);
  assert.equal(store.writes,1);
 });
});

test('future month with one unsaved day never shrinks the percentile cohort',async()=>{
 await at('2027-01-01T14:00:00Z',async now=>{
  const store=fakeStore(savedMonth('2027-01','2026-12-31T18:00:00Z',
   {missing:['2027-01-31']}));
  const result=await refreshSavedER1MonthlyOutputs({store,now});
  assert.equal(result.months[0].status,'SAVED_MONTH_INCOMPLETE');
  assert.equal(store.writes,0);
 });
});

test('the same saved scoring path also updates June 2027 without a new monthly job',async()=>{
 await at('2027-06-01T14:00:00Z',async now=>{
  const store=fakeStore(savedMonth('2027-06','2027-05-31T18:00:00Z'));
  const result=await refreshSavedER1MonthlyOutputs({store,now});
  assert.deepEqual(result.months.map(x=>[x.month,x.status]),
   [['2027-06','READY_OUTPUT'],['2027-07','SAVED_MONTH_INCOMPLETE']]);
  assert.equal(store.outputs.get(er1MonthlyPublicKey('2027-06')).body.recordCount,4);
  assert.equal(store.writes,1);
 });
});

test('a failed new day cannot erase a previous valid public score',async()=>{
 await at('2027-01-01T14:00:00Z',async now=>{
  const data=savedMonth('2027-01','2026-12-31T18:00:00Z');
  const store=fakeStore(data);
  await refreshSavedER1MonthlyOutputs({store,now});
  const key=er1MonthlyPublicKey('2027-01');
  const old=JSON.stringify(store.outputs.get(key).body);
  data.delete('release-calendar:earnings-api:2027-01-29');
  const result=await refreshSavedER1MonthlyOutputs({store,now});
  assert.equal(result.months[0].status,'SAVED_MONTH_INCOMPLETE');
  assert.equal(store.writes,1);
  assert.equal(JSON.stringify(store.outputs.get(key).body),old);
 });
});

test('invalid source day fails independently; does not publish a misleading score',async()=>{
 await at('2027-01-01T14:00:00Z',async now=>{
  const store=fakeStore(savedMonth('2027-01','2026-12-31T18:00:00Z',
   {invalidDay:'2027-01-16'}));
  const result=await refreshSavedER1MonthlyOutputs({store,now});
  assert.equal(result.months[0].status,'MONTH_SOURCE_INVALID');
  assert.equal(store.writes,0);
 });
});

test('local output write failure is reported as failure, never a completed score',async()=>{
 await at('2027-01-01T14:00:00Z',async now=>{
  const store=fakeStore(savedMonth('2027-01','2026-12-31T18:00:00Z'));
  store.writeOutput=async()=>{throw Error('SIMULATED_LOCAL_IO_FAILURE');};
  await assert.rejects(refreshSavedER1MonthlyOutputs({store,now}),
   /SIMULATED_LOCAL_IO_FAILURE/);
  assert.equal(store.outputs.size,0);
 });
});

test('late UTC source cannot contaminate prior New York as-of month score',async()=>{
 await at('2027-01-01T00:29:30Z',async now=>{
  const store=fakeStore(savedMonth('2027-01','2026-12-31T18:00:00Z',
   {lateDay:'2027-01-31'}));
  const result=await refreshSavedER1MonthlyOutputs({store,now});
  assert.equal(result.months.find(x=>x.month==='2027-01')?.status,
   'PIT_INPUT_INCOMPLETE');
  assert.equal(store.writes,0);
 });
});

test('new NY day retains saved observations across the UTC midnight boundary',async()=>{
 await at('2027-01-01T04:00:00Z',async now=>{
  // New York is still on December 31, although the valid saved input was
  // collected on January 1 UTC. Previously all 31 days were discarded.
  const store=fakeStore(savedMonth('2027-01','2027-01-01T03:00:00Z'));
  const result=await refreshSavedER1MonthlyOutputs({store,now});
  assert.equal(result.months.find(x=>x.month==='2027-01')?.status,'READY_OUTPUT');
  const output=store.outputs.get(er1MonthlyPublicKey('2027-01')).body;
  assert.equal(output.asOf,'2026-12-31');
  assert.equal(output.recordCount,4);
 });
});

test('future timestamps remain excluded from NY instant-based PIT calculation',async()=>{
 await at('2027-01-01T04:00:00Z',async now=>{
  const store=fakeStore(savedMonth('2027-01','2027-01-01T04:00:01Z'));
  const result=await refreshSavedER1MonthlyOutputs({store,now});
  assert.equal(result.months.find(x=>x.month==='2027-01')?.status,
   'PIT_INPUT_INCOMPLETE');
  assert.equal(store.outputs.has(er1MonthlyPublicKey('2027-01')),false);
 });
});
