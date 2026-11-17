import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {resolvePublicationResultDirectory} from '../scripts/pc-writer/earnings-publication-result-directory.mjs';

test('WPSFD42 one-shot result defaults to user TEMP with no DB or provider access',()=>{
  assert.equal(resolvePublicationResultDirectory(),os.tmpdir());
  assert.equal(resolvePublicationResultDirectory({requested:''}),os.tmpdir());
  assert.notEqual(resolvePublicationResultDirectory(),path.resolve('scripts/pc-writer'));
});
test('approved B scoped evidence goes to the exact existing request directory',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-w05-wps-'));
  try{
    assert.equal(resolvePublicationResultDirectory({requested:root,fallback:process.cwd()}),root);
    assert.throws(()=>resolvePublicationResultDirectory({requested:root+'-not-found',fallback:process.cwd()}),
      /EARNINGS_PUBLICATION_RESULT_DIRECTORY_INVALID/);
    assert.throws(()=>resolvePublicationResultDirectory({requested:'relative',fallback:process.cwd()}),
      /EARNINGS_PUBLICATION_RESULT_DIRECTORY_INVALID/);
    const file=path.join(root,'not-a-directory.txt');fs.writeFileSync(file,'fixture');
    assert.throws(()=>resolvePublicationResultDirectory({requested:file,fallback:process.cwd()}),
      /EARNINGS_PUBLICATION_RESULT_DIRECTORY_INVALID/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('invalid fallback is rejected without side effects',()=>{
  assert.throws(()=>resolvePublicationResultDirectory({fallback:'relative'}),
    /EARNINGS_PUBLICATION_FALLBACK_DIRECTORY_INVALID/);
});

test('WPSFD42 publisher uses B request-scoped logs and safe TEMP fallback, without feature CMD dependency',()=>{
  const file=fs.readFileSync(new URL('../scripts/pc-writer/EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs',import.meta.url),'utf8');
  assert.match(file,/ZGMINI_EARNINGS_C_LOG_DIR/);
  assert.match(file,/fallback:os\.tmpdir\(\)/);
  assert.match(file,/let resultDirectory=os\.tmpdir\(\)/);
  assert.doesNotMatch(file,/D1_PREFLIGHT\.cmd|D1_APPLY\.cmd/);
  assert.match(file,/LOG_FILE=\$\{path\.basename\(file\)\}/);
  assert.doesNotMatch(file,/console\.log\(`LOG=\$\{file\}`\)/);
  assert.match(file,/resolvePublicationResultDirectory/);
  assert.match(file,/path\.join\(resultDirectory,\s*`EARNINGS_BLS_SERVICE_R1_D1_RESULT_/);
  assert.doesNotMatch(file,/path\.join\(HERE,\s*`EARNINGS_BLS_SERVICE_R1_D1_RESULT_/);
});
