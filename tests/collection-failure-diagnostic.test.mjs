import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {safeCollectionFailure}from'../worker/collection-failure-diagnostic.mjs';import {appendCollectionEvent}from'../scripts/pc-writer/collection-events.mjs';
test('collection errors keep category and repository location without raw messages or local path',()=>{
 const e={name:'TypeError',message:'private-url?key=fixture-secret',stack:'TypeError: private-url?key=fixture-secret\n at collect (file:///E:/private/project/worker/growth-input.mjs:32:9)',cause:{code:'ECONNRESET'}};
 assert.deepEqual(safeCollectionFailure(e),{name:'TypeError',code:'ECONNRESET',location:{module:'worker/growth-input.mjs',line:32,column:9}});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'collection-diagnostic-'));try{appendCollectionEvent(dir,{at:new Date().toISOString(),status:'ERROR',job:'growth',failureDiagnostic:safeCollectionFailure(e)});const text=fs.readFileSync(dir+'/collection-events.jsonl','utf8');assert(!text.includes('fixture-secret'));assert(!text.includes('E:'));assert.equal(JSON.parse(text).failureDiagnostic.location.line,32);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('untrusted error values and outside code paths are not logged',()=>{
 assert.deepEqual(safeCollectionFailure({name:'private-name',code:'private-code',stack:'at https://provider.example/raw?key=secret:1:2'}),{name:'Error',code:null,location:null});
});
