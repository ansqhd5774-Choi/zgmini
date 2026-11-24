import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseDiffBase,selectChangedSource} from '../scripts/lint-changed-ci.mjs';

const OLD='a'.repeat(40),PARENT='b'.repeat(40);
test('PR includes all code changes relative to its merge parent',()=>{
 assert.equal(chooseDiffBase({event:'pull_request',before:OLD,headParent:PARENT}),PARENT);
});
test('multi-commit push compares with GitHub pre-push SHA',()=>{
 assert.equal(chooseDiffBase({event:'push',before:OLD,headParent:PARENT}),OLD);
});
test('missing or initial push base fails closed',()=>{
 assert.throws(()=>chooseDiffBase({event:'push',before:'0'.repeat(40),headParent:PARENT}),
  /LINT_BASE_UNAVAILABLE/);
 assert.throws(()=>chooseDiffBase({event:'schedule',headParent:PARENT}),
  /LINT_BASE_UNAVAILABLE/);
});
test('changed-source selection covers root config and all executable source directories',()=>{
 assert.deepEqual(selectChangedSource([
  'app/a.tsx','worker/b.ts','tests/c.test.mjs','scripts/build.js','app/a.tsx',
  'tools/verify.mjs','db/schema.ts','vite.config.ts','middleware.ts','assets.d.ts',
  'public/client.jsx','.github/actions/custom/index.js','components/x.cts',
  'docs/doc.md','.github/workflows/node.js.yml','public/index.html',
  'app/deleted.tsx'
 ]),[
  '.github/actions/custom/index.js','app/a.tsx','app/deleted.tsx','assets.d.ts',
  'components/x.cts','db/schema.ts','middleware.ts','public/client.jsx',
  'scripts/build.js','tests/c.test.mjs','tools/verify.mjs',
  'vite.config.ts','worker/b.ts'
 ]);
});
test('generated assets and traversal paths never enter the executable lint file list',()=>{
 assert.deepEqual(selectChangedSource([
  'node_modules/pkg/x.js','dist/client/a.js','build/generated.mjs',
  'out/a.ts','.next/cache/a.js','coverage/file.ts',
  '.git/hooks/pre-commit.js','.wrangler/cache/a.js','.sites-runtime/a.mjs',
  '../outside.js','db/../private.ts','./app/hidden.js',
  '/absolute/file.ts','C:\\\\outside\\\\s.js','app/a.ts'
 ]),['app/a.ts']);
});
