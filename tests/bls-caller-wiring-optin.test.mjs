import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=file=>fs.readFileSync(path.join(root,'scripts','pc-writer',file),'utf8');

test('regular Core forwards only an explicit in-process or sealed-host BLS option',()=>{
 const code=src('collect-local.mjs');
 assert.match(code,/export async function collectLocal\(base,\{[^\n]*blsUnregistered=undefined\}\=\{\}\)/);
 assert.match(code,/createQuotaFetch\(\{base,originalFetch,blsUnregistered\}\)/);
 // A B host-sealed grant is resolved before the collection opens its DB.
 assert.match(code,/blsUnregistered=process\.argv\.includes\('--import-only'\)\?undefined:resolveBlsCoreActivation\(base\)/);
 assert.match(code,/collectLocal\(base,\{lane:process\.argv/);
 assert.doesNotMatch(code,/blsUnregistered\s*:\s*\{\s*enabled\s*:\s*true/);
});

test('existing R4 one-year backfill keeps enforce mode and sealed opt-in default',()=>{
 const code=src('backfill-one-year.mjs');
 assert.match(code,/export async function backfillOneYear\([^\n]*blsUnregistered=undefined\}\=\{\}\)/);
 assert.match(code,/createQuotaFetch\(\{base,originalFetch,mode:'enforce',blsUnregistered\}\)/);
 assert.match(code,/Promise\.resolve\(\)\.then\(\(\)=>backfillOneYear\(base,\{blsUnregistered:resolveBlsCoreActivation\(base\)\}\)\)/);
 assert.doesNotMatch(code,/blsUnregistered\s*:\s*\{\s*enabled\s*:\s*true/);
});

test('shared quota constructor still defaults to inactive without host grant',()=>{
 const code=src('quota-fetch.mjs');
 assert.match(code,/blsUnregistered=\{enabled:false\}/);
});
