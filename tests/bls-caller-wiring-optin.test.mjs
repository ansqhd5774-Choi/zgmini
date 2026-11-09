import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=file=>fs.readFileSync(path.join(root,'scripts','pc-writer',file),'utf8');

test('regular Core only forwards an explicit trusted in-process BLS option',()=>{
 const code=src('collect-local.mjs');
 assert.match(code,/export async function collectLocal\(base,\{[^\n]*blsUnregistered=undefined\}\=\{\}\)/);
 assert.match(code,/createQuotaFetch\(\{base,originalFetch,blsUnregistered\}\)/);
 // The pre-existing CLI still supplies lane/importOnly/job, not a grant.
 assert.match(code,/collectLocal\(process\.env\.ZGMINI_PC_HOME[^\n]*\{lane:process\.argv/);
 assert.doesNotMatch(code,/blsUnregistered\s*:\s*\{\s*enabled\s*:\s*true/);
});

test('existing R4 one-year backfill keeps enforce mode and opt-in defaults off',()=>{
 const code=src('backfill-one-year.mjs');
 assert.match(code,/export async function backfillOneYear\([^\n]*blsUnregistered=undefined\}\=\{\}\)/);
 assert.match(code,/createQuotaFetch\(\{base,originalFetch,mode:'enforce',blsUnregistered\}\)/);
 assert.match(code,/if\(process\.argv\[1\][^\n]*\{\s*backfillOneYear\(\)/);
 assert.doesNotMatch(code,/blsUnregistered\s*:\s*\{\s*enabled\s*:\s*true/);
});

test('shared quota constructor still defaults to inactive without host grant',()=>{
 const code=src('quota-fetch.mjs');
 assert.match(code,/blsUnregistered=\{enabled:false\}/);
});
