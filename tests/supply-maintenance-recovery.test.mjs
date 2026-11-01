import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {parseSupplyFredCsv,supplyFailureReason} from '../scripts/supply-source-validation.mjs';
import {collectSupplyExtraSources} from '../scripts/supply-r10-extra-sources.mjs';
import {collectSupplyR10} from '../scripts/pc-writer/supply-r10.mjs';
import {additionalCollectionEntries} from '../scripts/pc-writer/additional-collection-health.mjs';
import {collectionHealthSummary,readCollectionHealth} from '../worker/collection-health.mjs';
const bytes=s=>new TextEncoder().encode(s);
test('HTTP 200 maintenance page is distinguished from malformed CSV',()=>{
 assert.throws(()=>parseSupplyFredCsv(bytes('<!doctype html><title>Site Maintenance | St. Louis Fed</title>'),'PCEC96'),/PROVIDER_MAINTENANCE/);
 for(const text of ['observation_date,OTHER\n2026-01-01,1','observation_date,PCEC96\n2026-02-30,1','observation_date,PCEC96\n2026-01-01,1\n2026-01-01,2','observation_date,PCEC96\n2026-01-01,not-a-number'])assert.throws(()=>parseSupplyFredCsv(bytes(text),'PCEC96'),/FRED_CSV_SCHEMA/);
 assert.deepEqual(parseSupplyFredCsv(bytes('observation_date,PCEC96\n2026-01-01,0\n2026-02-01,.\n2026-03-01,-1'),'PCEC96'),[{observationDate:'2026-01-01',value:0},{observationDate:'2026-03-01',value:-1}]);
});
test('maintenance preserves good raw and parsed files; later valid response replaces them without retry loops',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'zgmini-supply-maintenance-'));
 try{
  for(const id of ['PCEC96','DPCERA3M086SBEA']){await fs.writeFile(path.join(dir,id+'.csv'),'previous-good-csv');await fs.writeFile(path.join(dir,id+'.json'),'[{"value":5}]');}
  let calls=0;let result=await collectSupplyExtraSources(dir,{fetcher:async()=>{calls++;return new Response('<title>Site Maintenance | St. Louis Fed</title>')}});
  assert.equal(calls,3);assert.ok(result.every(x=>x.error==='PROVIDER_MAINTENANCE'));
  assert.equal(await fs.readFile(path.join(dir,'PCEC96.csv'),'utf8'),'previous-good-csv');assert.equal(await fs.readFile(path.join(dir,'PCEC96.json'),'utf8'),'[{"value":5}]');
  const history=Array.from({length:180},(_,i)=>`${new Date(Date.UTC(2010,0,1+i)).toISOString().slice(0,10)},${i}`).join('\n');
  calls=0;result=await collectSupplyExtraSources(dir,{fetcher:async url=>{calls++;const id=new URL(url).searchParams.get('id');return id?new Response(`observation_date,${id}\n${history}`):new Response('Site Maintenance')}});
  assert.equal(calls,3);assert.equal(result.filter(x=>x.status==='STORED').length,2);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,'PCEC96.json'),'utf8')).length,180);
  assert.match(await fs.readFile(path.join(dir,'PCEC96.csv'),'utf8'),/^observation_date,PCEC96/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('six-hour deferral retains attempt timestamp and never executes providers',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'zgmini-supply-defer-'));
 try{const checkedAt=Date.UTC(2026,9,22);const report={status:'SOURCE_FAILED',checkedAt,reason:'PROVIDER_MAINTENANCE'};await fs.writeFile(path.join(dir,'local-supply-r10-collection.json'),JSON.stringify(report));
  const result=await collectSupplyR10(dir,{now:checkedAt+3600000});assert.equal(result.status,'RETRY_DEFERRED');assert.equal(result.checkedAt,checkedAt);assert.equal(result.nextRetryAt,checkedAt+21600000);assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir,'local-supply-r10-collection.json'),'utf8')),report);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('public health retains failure and safe maintenance reason, strips arbitrary errors',async()=>{
 const now=Date.UTC(2026,9,22),supply={status:'SOURCE_FAILED',checkedAt:now-1,reason:'PROVIDER_MAINTENANCE',nextRetryAt:now+21600000};
 const body=collectionHealthSummary(additionalCollectionEntries({supply}),now);const item=body.items.find(x=>x.id==='job:supplyR10');assert.equal(item.state,'failed');assert.equal(item.reason,'PROVIDER_MAINTENANCE');
 const db={prepare:()=>({bind(){return this},first:async()=>({body:JSON.stringify(body)})})};const publicBody=await (await readCollectionHealth(db,now)).json();assert.equal(publicBody.items.find(x=>x.id==='job:supplyR10').reason,'PROVIDER_MAINTENANCE');
 assert.equal(collectionHealthSummary([{id:'x',reason:'private error',checkedAt:now,outcome:'failure'}],now).items[0].reason,undefined);
 assert.equal(supplyFailureReason([{error:'PROVIDER_MAINTENANCE'}]),'PROVIDER_MAINTENANCE');assert.equal(supplyFailureReason([{error:'FRED_CSV_SCHEMA'}]),'SOURCE_FORMAT_ERROR');
});
