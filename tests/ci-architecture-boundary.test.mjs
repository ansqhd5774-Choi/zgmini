import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkDirectImport,inspectArchitectureSource,auditArchitecture}
 from '../scripts/ci-architecture-boundary.mjs';

const publicFile='app/api/market-score/route.ts';
test('direct PC Writer and Controller imports are disallowed in public app and components',()=>{
 for(const specifier of [
  '../../../scripts/pc-writer/run.mjs',
  '@/scripts/pc-writer/publish.mjs',
  '../../../controller/config.mjs',
  '@/scripts/pc-controller/install.mjs'
 ]){
  const result=checkDirectImport(publicFile,specifier);
  assert.equal(result?.rule,'public-runtime-must-not-import-private-pc');
 }
 assert.equal(checkDirectImport('components/heading.tsx','../scripts/pc-writer/secret.mjs')?.target,
  'scripts/pc-writer/secret.mjs');
});
test('existing worker projection readers and Cloudflare module imports remain allowed',()=>{
 for(const input of [
  '../../../worker/market-operational-store.mjs',
  'cloudflare:workers','node:crypto','react','@/lib/market-trend.mjs',
  '../../../lib/theme-visible-asof-r1.mjs'
 ])assert.equal(checkDirectImport(publicFile,input),null);
 assert.equal(checkDirectImport('scripts/pc-writer/run.mjs','../../controller/run.mjs'),null);
});
test('source AST finds static import, re-export, dynamic import, and require',()=>{
 const source=[
  "import x from '@/scripts/pc-writer/job.mjs'",
  "export {tool} from '../../../controller/bridge.mjs'",
  "const d=import('../../../scripts/pc-writer/task.mjs')",
  "const r=require('@/scripts/pc-controller/entry.mjs')"
 ].join('\n');
 const results=inspectArchitectureSource(source,publicFile);
 assert.equal(results.length,4);
 assert.deepEqual(results.map(v=>v.line),[1,2,3,4]);
 assert(results.every(v=>v.rule==='public-runtime-must-not-import-private-pc'));
});
test('quoted comments and runtime text do not trigger false positive',()=>{
 const source=[
  "// import x from '@/scripts/pc-writer/run.mjs'",
  "const text=\"import something from ../../../controller/entry.mjs\";",
  "import {read} from '../../../worker/market-operational-store.mjs'",
  "export type {Data} from '@/lib/readonly-types'"
 ].join('\n');
 assert.deepEqual(inspectArchitectureSource(source,publicFile),[]);
});
test('unknown package aliases, parent escapes and files outside scope are not judged',()=>{
 assert.equal(checkDirectImport(publicFile,'other-package/pc-writer/run'),null);
 assert.equal(checkDirectImport(publicFile,'../../../../scripts/pc-writer/run.mjs'),null);
 assert.equal(checkDirectImport('tests/check.test.mjs','../scripts/pc-writer/run.mjs'),null);
 assert.throws(()=>checkDirectImport(null,'test'),/CI_ARCH_IMPORT_ARGUMENTS/);
 assert.throws(()=>inspectArchitectureSource(null,publicFile),/CI_ARCH_SOURCE_INVALID/);
});
test('repository scan checks real files under four root areas and reports exact line only',async()=>{
 const root=await mkdtemp(join(tmpdir(),'zg-arch-'));
 try{
  for(const path of ['app/api/test','components','hooks','worker'])
   await mkdir(join(root,path),{recursive:true});
  await writeFile(join(root,'app/api/test/route.ts'),
   "import {x} from '../../../scripts/pc-writer/run.mjs'\n");
  await writeFile(join(root,'components/a.tsx'),
   "import {useState} from 'react'\n");
  await writeFile(join(root,'hooks/a.ts'),"export const ok=true;\n");
  await writeFile(join(root,'worker/a.mjs'),"export const reader=()=>null;\n");
  const report=await auditArchitecture(root);
  assert.equal(report.inspectedFiles,4);
  assert.equal(report.violations.length,1);
  assert.equal(report.violations[0].line,1);
  assert.equal(report.violations[0].file,'app/api/test/route.ts');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('existing Node CI invokes architecture check without replacing audit or unit tests',()=>{
 const wf=readFileSync(new URL('../.github/workflows/node.js.yml',import.meta.url),'utf8');
 assert.match(wf,/node scripts\/ci-architecture-boundary\.mjs/);
 assert.match(wf,/node --test tests\/\*\.test\.mjs/);
 assert.match(wf,/npm audit --omit=dev --audit-level=high/);
 assert.doesNotMatch(wf,/continue-on-error:\s*true/);
});
