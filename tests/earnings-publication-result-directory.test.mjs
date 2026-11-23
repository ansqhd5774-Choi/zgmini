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
  assert.match(file,/excludedSourceRoot:stageRoot/);
  assert.match(file,/LOG_LOCATION=\$\{path\.resolve\(resultDirectory\)===path\.resolve\(os\.tmpdir\(\)\)/);
  assert.doesNotMatch(file,/LOG_LOCATION=\$\{process\.env\.ZGMINI_EARNINGS_C_LOG_DIR/);
  assert.doesNotMatch(file,/D1_PREFLIGHT\.cmd|D1_APPLY\.cmd/);
  assert.match(file,/LOG_FILE=\$\{path\.basename\(file\)\}/);
  assert.doesNotMatch(file,/console\.log\(`LOG=\$\{file\}`\)/);
  assert.match(file,/resolvePublicationResultDirectory/);
  assert.match(file,/path\.join\(resultDirectory,\s*`EARNINGS_BLS_SERVICE_R1_D1_RESULT_/);
  assert.doesNotMatch(file,/path\.join\(HERE,\s*`EARNINGS_BLS_SERVICE_R1_D1_RESULT_/);
});

test('request evidence path cannot enter the publisher checkout or an aliased child',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-w05-output-'));
  try{
    const source=path.join(root,'source');
    const child=path.join(source,'scripts','pc-writer');
    const allowed=path.join(root,'request-output');
    const alias=path.join(root,'source-alias');
    fs.mkdirSync(child,{recursive:true});
    fs.mkdirSync(allowed);
    const choose=requested=>resolvePublicationResultDirectory({
      requested,excludedSourceRoot:source});
    assert.throws(()=>choose(source),/EARNINGS_PUBLICATION_RESULT_WITHIN_SOURCE_STOP/);
    assert.throws(()=>choose(child),/EARNINGS_PUBLICATION_RESULT_WITHIN_SOURCE_STOP/);
    assert.equal(choose(allowed),allowed);
    assert.equal(resolvePublicationResultDirectory({
      excludedSourceRoot:source}),os.tmpdir());
    try{fs.symlinkSync(child,alias,process.platform==='win32'?'junction':'dir');}
    catch(e){if(['EPERM','EACCES','ENOTSUP'].includes(e?.code)){t.diagnostic('symlink unavailable on test host');return;}throw e;}
    assert.throws(()=>choose(alias),/EARNINGS_PUBLICATION_RESULT_WITHIN_SOURCE_STOP/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('invalid excluded source root fails without writing evidence',()=>{
  assert.throws(()=>resolvePublicationResultDirectory({
    excludedSourceRoot:'relative'}),/EARNINGS_PUBLICATION_SOURCE_ROOT_INVALID/);
  assert.throws(()=>resolvePublicationResultDirectory({
    excludedSourceRoot:path.join(os.tmpdir(),'zgmini-w05-nonexistent-checkout')}),
  /EARNINGS_PUBLICATION_SOURCE_ROOT_UNAVAILABLE/);
});


test('WPSFD42 APPLY requires immutable service checkpoint pins and rechecks before any D1 client',()=>{
  const file=fs.readFileSync(new URL('../scripts/pc-writer/EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs',import.meta.url),'utf8');
  assert.match(file,/ZGMINI_EARNINGS_SERVICE_SOURCE_VERSION/);
  assert.match(file,/ZGMINI_EARNINGS_SERVICE_SOURCE_STORED_AT/);
  assert.match(file,/EARNINGS_C_SERVICE_APPLY_PIN_REQUIRED/);
  assert.match(file,/EARNINGS_C_SERVICE_SOURCE_DRIFT/);
  assert.match(file,/PREFLIGHT_SOURCE_PIN=VERIFIED/);
  assert.match(file,/SOURCE_HTTP_REQUESTS=0/);
  assert.match(file,/if\(fresh!==2\)/);
  assert.ok(file.indexOf("throw Error('EARNINGS_C_SERVICE_SOURCE_DRIFT')")<
    file.indexOf("await import('./d1.mjs')"));
});
