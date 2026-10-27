import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {inspectNineR42Modules,literalRefs} from '../scripts/pc-writer/theme-nine-r42-source-dependency-audit.mjs';
const roster=JSON.parse(readFileSync(new URL('../config/theme-nine-r20-approved-candidates.json',import.meta.url)));

test('R42 discovers only relative modules and reports no source text',()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'r42-unit-'));
 try{
  mkdirSync(path.join(root,'nested'));
  writeFileSync(path.join(root,'r181-primary-cycle.mjs'),
   'import "./nested/symbols.mjs"; const value="BOTZ";');
  writeFileSync(path.join(root,'nested','symbols.mjs'),'export const etfs=["SOXX","SPY"];');
  const r=inspectNineR42Modules({sourceRoot:root,roster});
  assert.equal(r.status,'SOURCE_DEPENDENCY_AUDITED_RUNTIME_COVERAGE_UNKNOWN');
  assert.equal(r.modules.find(m=>m.file==='r181-primary-cycle.mjs').staticTickerMentions,1);
  assert.equal(r.modules.find(m=>m.file==='nested/symbols.mjs').staticTickerMentions,1);
  assert.equal(JSON.stringify(r).includes('const value='),false);
  assert.equal(r.providerCalls,0);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('R42 rejects absolute and escaping source paths',()=>{
 assert.deepEqual(literalRefs('import "/tmp/private.mjs"; import "../safe.mjs";'),['../safe.mjs']);
});
