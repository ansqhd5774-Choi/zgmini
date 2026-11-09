import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'scripts','pc-writer','backfill-monthly-one-year.mjs'),'utf8');

test('monthly backfill stays a direct CLI with the prior report/exit contract',()=>{
 assert.match(source,/export async function backfillMonthlyOneYear\(/);
 assert.match(source,/blsUnregistered=undefined/);
 assert.match(source,/createQuotaFetch\(\{base,originalFetch,mode:"enforce",blsUnregistered\}\)/);
 assert.match(source,/if\(process\.argv\[1\]&&path\.resolve\(process\.argv\[1\]\)===fileURLToPath\(import\.meta\.url\)\)/);
 assert.match(source,/backfillMonthlyOneYear\(\)/);
 assert.match(source,/if\(report\.status==="FAILED"\)process\.exitCode=1/);
 assert.match(source,/console\.log\(JSON\.stringify\(report\)\)/);
});

test('import is side-effect-free; explicit in-process grant is forwarded and cleaned up',async()=>{
 const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'r6-monthly-import-'));
 const state={openCount:0,closeCount:0,saveCount:0,hookCloseCount:0,options:null};
 const savedFetch=globalThis.fetch;
 try{
  fs.writeFileSync(path.join(sandbox,'backfill-monthly-one-year.mjs'),source);
  fs.writeFileSync(path.join(sandbox,'local-db.mjs'),
   'export const localDatabase=()=>{globalThis.__r6MonthlyTest.openCount++;return {close(){globalThis.__r6MonthlyTest.closeCount++}}};\n');
  fs.writeFileSync(path.join(sandbox,'local-env.mjs'),
   'export const loadLocalProviders=()=>({});export const installLocalRuntime=()=>({deregister(){globalThis.__r6MonthlyTest.hookCloseCount++}});\n');
  fs.writeFileSync(path.join(sandbox,'quota-fetch.mjs'),
   'export const createQuotaFetch=opts=>{globalThis.__r6MonthlyTest.options=opts;return {fetch:opts.originalFetch,summary:()=>({})}};\n');
  fs.writeFileSync(path.join(sandbox,'d1.mjs'),
   'export const save=()=>{globalThis.__r6MonthlyTest.saveCount++};\n');
  globalThis.__r6MonthlyTest=state;
  const imported=await import(pathToFileURL(path.join(sandbox,'backfill-monthly-one-year.mjs')).href);
  assert.equal(typeof imported.backfillMonthlyOneYear,'function');
  assert.equal(state.openCount,0);
  assert.equal(state.saveCount,0);
  assert.equal(globalThis.fetch,savedFetch);

  const grant={enabled:true,approvedBase:path.join(sandbox,'approved')};
  // This isolated fixture deliberately has no growth collector. Its import
  // fails inside the normal catch; only host wiring/cleanup are under test.
  const report=await imported.backfillMonthlyOneYear({base:path.join(sandbox,'data'),
   asOf:'2026-11-09',blsUnregistered:grant});
  assert.equal(report.status,'FAILED');
  assert.equal(state.options?.blsUnregistered,grant);
  assert.equal(state.options?.mode,'enforce');
  assert.equal(state.openCount,2);
  assert.equal(state.closeCount,2);
  assert.equal(state.hookCloseCount,1);
  assert.equal(state.saveCount,1);
  assert.equal(globalThis.fetch,savedFetch);
 }finally{
  delete globalThis.__r6MonthlyTest;
  globalThis.fetch=savedFetch;
  fs.rmSync(sandbox,{recursive:true,force:true});
 }
});
