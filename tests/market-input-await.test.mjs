import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {mergeEarningsProductionCandidate} from '../lib/market-score/earnings-e1-r5-production-domain.mjs';
const source=fs.readFileSync(new URL('../scripts/pc-writer/market.mjs',import.meta.url),'utf8');
const body=source.split('const collectInputs=async()=>{')[1].split('\n };')[0];
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const compile=()=>new AsyncFunction('readStoredMarketInputs','store','now','runEarningsR5ProductionCycle','base','preserveEarningsDiagnosticCompatibility','mergeEarningsProductionCandidate',body);
const stored={series:{DGS10:[{date:'2026-10-15',value:4}]},external:{credit:{score:70},publicDomainScores:{earnings:{methodologyVersion:'E1-R4',score:85}}},providerSummary:{macro:'stored'}};
test('the actual market input collector waits for storage and preserves other domains during R5 merge',async()=>{
 let release;const pending=new Promise(r=>release=r);let called=false;
 const candidate={status:'READY',methodologyVersion:'E1-R5',score:74,noReweight:true,missing:[]};
 const result=compile()(()=>pending,{},Date.now(),async()=>{called=true;return{candidate}},'local',(value,current)=>{assert.equal(current,stored.external.publicDomainScores.earnings);return value},mergeEarningsProductionCandidate);
 await Promise.resolve();assert.equal(called,false);release(stored);
 const merged=await result;assert.deepEqual(merged.series,stored.series);assert.deepEqual(merged.providerSummary,stored.providerSummary);assert.deepEqual(merged.external.credit,stored.external.credit);assert.equal(merged.external.publicDomainScores.earnings.score,74);
});
test('a failed R5 cycle returns resolved stored inputs intact',async()=>{
 const result=await compile()(async()=>stored,{},Date.now(),async()=>{throw Error('failed')},'local',x=>x,mergeEarningsProductionCandidate);
 assert.deepEqual(result,stored);
});
