import {test} from 'node:test';import assert from 'node:assert/strict';
import {buildFullDiagnosticOrchestrator} from '../lib/diagnostic-layer/full-diagnostic-orchestrator.mjs';
import {buildStoredDiagnostic} from '../worker/stored-diagnostic-r61.mjs';
import {DIAGNOSTIC_FRED_SERIES} from '../lib/diagnostic-layer/input-registry.mjs';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {candidate2dbImportBoundary} from '../scripts/candidate-2db-import-boundary.mjs';
import {buildCreditR2} from '../lib/market-score/credit-r2.mjs';
for(const length of [0,20,271,400])test(`stored orchestration exact parity including artifacts, length ${length}`,()=>{
 const rows=Array.from({length},(_,i)=>({observationDate:new Date(Date.UTC(2000,0,1+i)).toISOString().slice(0,10),value:i%29===0?null:i%23===0?0:2+(i%13)/100}));
 const args={asOfDate:'2026-10-05',baseOverall:null,series:Object.fromEntries(Object.keys(DIAGNOSTIC_FRED_SERIES).map(id=>[id,rows])),external:{}};
 let calls=0;const compute=(fn,...values)=>{calls++;return fn(...values)};
 assert.deepEqual(buildStoredDiagnostic({...args,compute}),buildFullDiagnosticOrchestrator(args));assert(calls>0);
});
test('compiled candidate credit uses equivalent bond calculation',async()=>{
 const file='lib/market-score/credit-r2.mjs';let code=candidate2dbImportBoundary(process.cwd()).transform(fs.readFileSync(file,'utf8'),path.resolve(file)).code;
 code=code.replace(/from\s*(['"])([^'"]+)\1/g,(_,q,p)=>'from '+JSON.stringify(pathToFileURL(path.resolve(path.dirname(file),p)).href));
 const optimized=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).buildCreditR2;
 const rows=Array.from({length:400},(_,i)=>({observationDate:new Date(Date.UTC(2000,0,i+1)).toISOString().slice(0,10),value:3+(i%17)/10}));
 for(const supplied of [[],rows]){const args={y2:supplied,y5:supplied,y10:supplied,y30:supplied,nfciCredit:supplied,cmdi:[{observationDate:'2001-01-01',hy:0.4,ig:0.5}],asOfDate:'2001-02-01'};assert.deepEqual(optimized(args),buildCreditR2(args));}
});
