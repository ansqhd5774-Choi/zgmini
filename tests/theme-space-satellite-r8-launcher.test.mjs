import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

test('R8 read-only Desktop CMD is ASCII/CRLF and pins all six source files',()=>{
 const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../scripts/pc-writer');
 const bytes=fs.readFileSync(path.join(dir,'theme-space-satellite-r8-real-audit.cmd'));
 const cmd=bytes.toString('latin1');
 assert.ok(bytes.every(x=>x<128));
 assert.ok(!/(?<!\r)\n/.test(cmd));
 for(const name of ['theme-space-satellite-r8-real-audit.mjs',
  'theme-space-satellite-adaptive-r2.mjs','theme-optional-score-r188.mjs',
  'theme-optional-adaptive-r2.mjs','theme-optional-pair-weight-r3.mjs',
  'theme-shared-spy-readonly-r1.mjs']){
  const digest=createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex');
  assert.ok(cmd.includes('call :verify '+name+' '+digest),`Pinned digest for ${name}`);
 }
 assert.match(cmd,/SPACE_SATELLITE_R8_REAL_AUDIT_RESULT\.txt/);
 assert.match(cmd,/--audit/);
 assert.doesNotMatch(cmd,/--collect|curl|powershell|schtasks|wrangler/i);
});
