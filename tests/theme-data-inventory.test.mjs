import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {containedFile,inspectManifest,inspectRegistry} from '../scripts/pc-writer/theme-data-inventory.mjs';
const fixture=fn=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-location-'));try{fn(root)}finally{fs.rmSync(root,{recursive:true,force:true})}};
test('manifest detects missing and modified raw rather than accepting the recorded filename',()=>fixture(root=>{
 const bytes=Buffer.from('{"price":0}');fs.writeFileSync(path.join(root,'raw.json'),bytes);
 const manifest={version:1,themeId:'test',files:[{path:'raw.json',sha256:createHash('sha256').update(bytes).digest('hex'),source:'https://example.test',collectedAt:'2026-10-23T00:00:00Z',observationFrom:'2026-10-21',observationThrough:'2026-10-22',priceMode:'TEST',schemaVersion:'TEST_V1'}]};
 fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest));assert.equal(inspectManifest(root,'manifest.json','test').status,'SHA_VERIFIED');
 fs.writeFileSync(path.join(root,'raw.json'),'changed');assert.equal(inspectManifest(root,'manifest.json','test').files[0].status,'SHA_MISMATCH');
 fs.unlinkSync(path.join(root,'raw.json'));assert.equal(inspectManifest(root,'manifest.json','test').files[0].status,'MISSING');
}));
test('outside paths, absolute paths and manifest identity are rejected',()=>fixture(root=>{
 for(const p of ['../raw.json','C:/raw.json','/raw.json','raw\\file.json'])assert.throws(()=>containedFile(root,p));
 fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({version:1,themeId:'other',files:[]}));assert.equal(inspectManifest(root,'manifest.json','test').status,'INVALID_MANIFEST');
}));
test('existing nine themes and staged single-ETF quantum retain distinct isolated contracts',()=>{
 const registry=JSON.parse(fs.readFileSync(new URL('../config/theme-data-registry.json',import.meta.url)));
 assert.equal(registry.themes.length,10);assert.equal(new Set(registry.themes.map(t=>t.id)).size,10);
 const result=inspectRegistry(registry,{dataRoot:os.tmpdir()});assert.equal(result.providerCalls,0);assert.equal(result.d1Writes,0);
 for(const id of ['ai-semiconductor','biotech']){const t=result.themes.find(t=>t.id===id);assert.equal(t.runtime.collector.status,'UNREGISTERED');assert.notEqual(t.rawManifest.status,'SHA_VERIFIED');assert.ok(t.blockers.length);assert.equal(t.publicRuntime,'NOT_QUERIED');}
 const quantum=result.themes.find(t=>t.id==='quantum-computing');assert.deepEqual(registry.themes.find(t=>t.id==='quantum-computing').symbols,['QTUM']);assert.equal(quantum.taskRegistration,'NOT_QUERIED');assert.ok(quantum.blockers.length);assert.equal(quantum.publicRuntime,'NOT_QUERIED');
 const broken=structuredClone(registry);broken.themes[1].id=broken.themes[0].id;assert.throws(()=>inspectRegistry(broken,{dataRoot:os.tmpdir()}));
});
