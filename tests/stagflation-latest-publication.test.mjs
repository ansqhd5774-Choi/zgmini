import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {prepareLatestStagflation,publishLatestStagflation} from '../scripts/pc-writer/stagflation-latest-publication.mjs';
import {readLatestStagflation} from '../worker/stagflation-latest-public.mjs';
import {STAGFLATION_S21_SERIES as ids} from '../lib/diagnostic-layer/stagflation-s21.mjs';
import {STAGFLATION_LATEST_KEY,validLatestStagflation} from '../lib/diagnostic-layer/stagflation-latest-record.mjs';
const now=Date.parse('2026-10-21T10:00:00Z');
function source(){const series=Object.fromEntries(ids.map((id,j)=>[id,Array.from({length:213},(_,i)=>({observationDate:new Date(Date.UTC(2009,i,1)).toISOString().slice(0,10),value:id==='EXPINF5YR'?2.5+Math.sin(i/5)*.3:100*Math.exp(i*.002)*(1+.01*Math.sin(i/(3+j)))}))]));series.INDPRO.push({observationDate:'2026-10-01',value:155});return {body:JSON.stringify({series}),stored_at:now-1000};}
const local=row=>({prepare:()=>({first:async()=>row})});
function remote(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY,body TEXT,stored_at INTEGER)');return {db,query:async(_db,sql,params)=>({results:db.prepare(sql).all(...params)}),request:async(_db,items)=>{for(const x of items)db.prepare(x.sql).run(...x.params);},adapter:{prepare:sql=>({bind:(...args)=>({first:async()=>db.prepare(sql).get(...args)})})}};}
test('stored-only preparation requires opt-in, fresh complete inputs and actual newer observations',async()=>{
 assert.equal((await prepareLatestStagflation(local(source()),{now})).status,'DISABLED');
 assert.equal((await prepareLatestStagflation(local({...source(),stored_at:now+1}),{enabled:true,now})).prepared,false);
 const p=await prepareLatestStagflation(local(source()),{enabled:true,now});assert.equal(p.prepared,true);assert.equal(p.body.inputCount,8);assert.equal(p.body.phase,'PROVISIONAL');
});
test('publication records actual observations, preserves confirmed keys and does not append unchanged scores',async()=>{
 const r=remote();r.db.prepare('INSERT INTO market_public_snapshots_v1 VALUES(?,?,?)').run('detail:stagflation-risk:s21','confirmed-preserved',1);
 const p=await prepareLatestStagflation(local(source()),{enabled:true,now});const first=await publishLatestStagflation(r,'test',p);assert.equal(first.status,'VERIFIED');assert.equal(first.historyPoints,1);
 const again=await publishLatestStagflation(r,'test',{...p,storedAt:now+1000,body:{...p.body,calculatedAt:new Date(now+1000).toISOString()}});assert.equal(again.historyPoints,1);
 assert.equal(r.db.prepare('SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?').get('detail:stagflation-risk:s21').body,'confirmed-preserved');r.db.close();
});
test('public reader rejects unauthorized, stale and corrupted records without exposing private metadata',async()=>{
 const r=remote(),p=await prepareLatestStagflation(local(source()),{enabled:true,now});await publishLatestStagflation(r,'test',p);
 // An unrelated malformed confirmed row cannot alter provisional validation.
 const response=await readLatestStagflation(r.adapter,{now});assert.equal(response.status,200);const body=await response.json();assert.equal(body.inputCount,8);assert.equal('inputSignature' in body,false);assert.equal('jointRisks' in body,false);
 const row=r.db.prepare('SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?').get(STAGFLATION_LATEST_KEY),record=JSON.parse(row.body);assert.equal(validLatestStagflation(record),true);
 assert.equal((await readLatestStagflation(r.adapter,{now:now+10*86400000})).status,503);
 for(const mutate of [x=>x.publicationAuthorized=false,x=>x.score+=1,x=>x.inputMonths.PCEPI='2026-11-01',x=>x.history[0].score=-1]){
  const copy=structuredClone(record);mutate(copy);r.db.prepare('UPDATE market_public_snapshots_v1 SET body=? WHERE snapshot_key=?').run(JSON.stringify(copy),STAGFLATION_LATEST_KEY);assert.equal((await readLatestStagflation(r.adapter,{now})).status,503);
 }r.db.close();
});
test('write timeout reads back applied result once instead of submitting another mutation',async()=>{
 const r=remote(),p=await prepareLatestStagflation(local(source()),{enabled:true,now});const write=r.request;let mutations=0;r.request=async(...args)=>{mutations++;await write(...args);throw Error('TIMEOUT');};
 assert.equal((await publishLatestStagflation(r,'test',p)).status,'VERIFIED');assert.equal(mutations,1);r.db.close();
});
test('common-month catch-up hides the provisional result while preserving actual observations',async()=>{
 const r=remote(),p=await prepareLatestStagflation(local(source()),{enabled:true,now});await publishLatestStagflation(r,'test',p);
 const row=source(),input=JSON.parse(row.body);
 for(const id of ids)if(input.series[id].at(-1).observationDate!=='2026-10-01')input.series[id].push({observationDate:'2026-10-01',value:input.series[id].at(-1).value*1.001});
 const complete=await prepareLatestStagflation(local({...row,body:JSON.stringify(input)}),{enabled:true,now:now+1000});assert.equal(complete.status,'NO_NEWER_INPUTS');
 assert.equal((await publishLatestStagflation(r,'test',complete)).status,'SUPERSEDED');
 const response=await readLatestStagflation(r.adapter,{now:now+1000});assert.equal(response.status,503);assert.equal((await response.json()).reason,'PROVISIONAL_SUPERSEDED');
 const record=JSON.parse(r.db.prepare('SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?').get(STAGFLATION_LATEST_KEY).body);assert.equal(record.history.length,1);r.db.close();
});
