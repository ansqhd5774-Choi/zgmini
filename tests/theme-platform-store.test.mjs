import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createThemeCheckpointStore} from '../scripts/pc-writer/theme-platform-store.mjs';
const key='a'.repeat(64);
const setup=t=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-platform-'));t.after(()=>fs.rmSync(root,{recursive:true}));return {root,store:createThemeCheckpointStore({dataRoot:root})};};
test('checkpoint persistence has exact readback and CAS, retaining prior evidence',async t=>{
 const {root,store}=setup(t);assert.equal(await store.load(key),null);
 const state={fingerprint:key,revision:1,tasks:{}};await store.save(key,state,0);
 assert.deepEqual(await store.load(key),state);
 await assert.rejects(store.save(key,state,0),/CAS_CONFLICT/);
 await store.save(key,{...state,revision:2},1);
 assert.equal(fs.readdirSync(path.join(root,'theme-platform/checkpoints',key)).length,2);
});
test('interrupted or tampered evidence never becomes successful resume',async t=>{
 const {root,store}=setup(t);await store.save(key,{fingerprint:key,revision:1},0);
 fs.writeFileSync(path.join(root,'theme-platform/checkpoints',key,'revision-1.json'),'{}');
 await assert.rejects(store.load(key));
});
