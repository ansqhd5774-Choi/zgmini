import {test} from 'node:test';import assert from 'node:assert/strict';
import {buildFullDiagnosticOrchestrator} from '../lib/diagnostic-layer/full-diagnostic-orchestrator.mjs';
import {buildStoredDiagnostic} from '../worker/stored-diagnostic-r61.mjs';
import {DIAGNOSTIC_FRED_SERIES} from '../lib/diagnostic-layer/input-registry.mjs';
for(const length of [0,20,271,400])test(`stored orchestration exact parity including artifacts, length ${length}`,()=>{
 const rows=Array.from({length},(_,i)=>({observationDate:new Date(Date.UTC(2000,0,1+i)).toISOString().slice(0,10),value:i%29===0?null:i%23===0?0:2+(i%13)/100}));
 const args={asOfDate:'2026-10-05',baseOverall:null,series:Object.fromEntries(Object.keys(DIAGNOSTIC_FRED_SERIES).map(id=>[id,rows])),external:{}};
 let calls=0;const compute=(fn,...values)=>{calls++;return fn(...values)};
 assert.deepEqual(buildStoredDiagnostic({...args,compute}),buildFullDiagnosticOrchestrator(args));assert(calls>0);
});
