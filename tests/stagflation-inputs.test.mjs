import test from 'node:test';import assert from 'node:assert/strict';
import {prepareStagflation} from '../scripts/pc-writer/stagflation-publication.mjs';
import {STAGFLATION_S21_SERIES,calculateStagflationS21} from '../lib/diagnostic-layer/stagflation-s21.mjs';
import {publicStagflationInputs,validStagflationInputs} from '../lib/diagnostic-layer/stagflation-inputs.mjs';
import {validateStagflationRecord,stagflationPublicBody} from '../worker/stagflation-public.mjs';
const now=Date.parse('2026-10-21T00:00:00Z');
const source=()=>({series:Object.fromEntries(STAGFLATION_S21_SERIES.map(id=>[id,Array.from({length:147},(_,i)=>({observationDate:new Date(Date.UTC(2014,5+i,1)).toISOString().slice(0,10),value:id==='EXPINF5YR'?0:100*1.03**(i/12),releaseDate:null,availableAt:null,realtimeStart:'2026-10-19'}))]))});
async function prepare(input){return prepareStagflation({prepare(sql){assert.match(sql,/^SELECT /);return {async first(){return {body:JSON.stringify(input),stored_at:now-1000}}}}},{enabled:true,now});}
test('ten display signals exactly reuse the approved raw transforms and safety direction, without changing the score',async()=>{
 const input=source(),result=calculateStagflationS21(input),p=await prepare(input);assert.equal(p.prepared,true);assert.equal(p.body.score,result.score);assert.deepEqual(p.body.history.map(x=>x.score),result.history.map(x=>x.score));assert.equal(p.body.inputs.length,10);
 p.body.inputs.forEach((row,i)=>{assert.equal(row.value,result.history.at(-1).raw[i]);assert.equal(row.previousValue,result.history.at(-2).raw[i]);assert.equal(row.score,100-result.history.at(-1).signalRisk[i]);assert.equal(row.trend.length,13);assert.equal(row.observationMonth,p.body.observationMonth);assert.equal(row.releaseDate,null);});
 assert.equal(p.body.inputs[8].value,0);assert.equal(validateStagflationRecord(p.body),true);
 const body=stagflationPublicBody(p.body);assert.equal(body.inputs.length,10);assert.equal(body.inputs[8].value,0);assert.equal(body.inputs[0].trend[0].score,undefined);
});
test('missing, malformed, conflicting or duplicate display data cannot publish a false input history',async()=>{
 const p=await prepare(source());
 for(const mutate of [r=>{r.inputs.pop()},r=>{r.inputs[0].value=null},r=>{r.inputs[0].trend[0].date='2099-01-01'},r=>{r.inputs[1].id=r.inputs[0].id},r=>{r.inputs[0].previousValue+=1},r=>{r.inputs[0].score=101}]){const copy=structuredClone(p.body);mutate(copy);assert.equal(validStagflationInputs(copy),false);assert.equal(validateStagflationRecord(copy),false);}
 const legacy=structuredClone(p.body);delete legacy.inputs;delete legacy.inputDetailsVersion;assert.equal(validateStagflationRecord(legacy),true);assert.deepEqual(stagflationPublicBody(legacy).inputs,[]);
});
test('public input output excludes unexpected provider fields and never substitutes retrieval vintage for release date',async()=>{
 const p=await prepare(source());p.body.inputs[0].private='not public';p.body.inputs[0].trend[0].private='not public';const body=publicStagflationInputs(p.body.inputs);assert.ok(!JSON.stringify(body).includes('private'));assert.equal(body[0].releaseDate,null);
});
