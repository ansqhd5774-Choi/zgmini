import test from 'node:test';import assert from 'node:assert/strict';
import {readStagflation,validateStagflationRecord,STAGFLATION_PUBLIC_KEY} from '../worker/stagflation-public.mjs';
import {STAGFLATION_S21_VERSION} from '../lib/diagnostic-layer/stagflation-s21.mjs';
const now=Date.parse('2026-10-21T00:00:00Z');
function record(){return {status:'READY',publicationAuthorized:true,score:75,methodVersion:STAGFLATION_S21_VERSION,sourceHash:'a'.repeat(64),sourceStoredAt:new Date(now-1000).toISOString(),historyPolicy:'CURRENT_VINTAGE_RECONSTRUCTION_NOT_PIT',observationMonth:'2026-08-01',history:Array.from({length:13},(_,i)=>({observationMonth:new Date(Date.UTC(2025,7+i,1)).toISOString().slice(0,10),score:75,status:'READY',axes:{inflation:25,realEconomy:20,labor:30,expectationsEnergy:10,slowdown:23.5},contraction:{production:false,consumption:false,income:false,employment:false},raw:['private']}))};}
const db=(body,storedAt=now-500)=>({prepare(sql){assert.match(sql,/^SELECT /);return {bind(key){assert.equal(key,STAGFLATION_PUBLIC_KEY);return {async first(){return body?{body:JSON.stringify(body),stored_at:storedAt}:null}}}}}});
test('approved stored projection only; private audit arrays never returned',async()=>{
 const r=record();r.history.at(-1).axes.private='do not return';assert.equal(validateStagflationRecord(r),true);
 const response=await readStagflation(db(r),{now}),body=await response.json();assert.equal(response.status,200);assert.equal(body.trend.length,13);assert.equal(body.score,75);assert.equal(body.axes.private,undefined);assert.equal(body.raw,undefined);assert.equal(body.sourceHash,undefined);assert.ok(!JSON.stringify(body).includes('private'));
});
test('unapproved research and old method cannot be published',async()=>{for(const patch of [{publicationAuthorized:false},{methodVersion:'OLD'},{score:66},{historyPolicy:'PIT'}]){const r={...record(),...patch};assert.equal((await readStagflation(db(r),{now})).status,503);}});
test('pending, stale, future and malformed projections fail closed',async()=>{
 assert.equal((await readStagflation(db(null),{now})).status,503);
 assert.equal((await readStagflation(db(record(),0),{now})).status,503);
 assert.equal((await readStagflation(db(record(),now+1),{now})).status,503);
 const r=record();r.history[3].observationMonth=r.history[2].observationMonth;assert.equal(validateStagflationRecord(r),false);
 r.history=record().history;r.history.at(-1).axes.labor=null;assert.equal(validateStagflationRecord(r),false);
});
