import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

test('R9 standalone CMD pins eight exact source versions and writes its report beside itself',()=>{
 const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../scripts/pc-writer');
 const bytes=fs.readFileSync(path.join(dir,'theme-space-satellite-r9-relative-audit.cmd'));
 const cmd=bytes.toString('latin1');
 assert.ok(bytes.every(b=>b<128),'ASCII-only Windows CMD');
 assert.ok(!/(?<!\r)\n/.test(cmd),'CRLF newlines');
 for(const name of ['theme-space-satellite-r9-relative-audit.mjs',
  'theme-space-satellite-r8-real-audit.mjs','theme-space-satellite-adaptive-r2.mjs',
  'theme-optional-score-r188.mjs','theme-optional-adaptive-r2.mjs',
  'theme-optional-pair-weight-r3.mjs','theme-optional-relative-weight-r4.mjs',
  'theme-shared-spy-readonly-r1.mjs']){
  const digest=createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex');
  assert.ok(cmd.includes('call :verify '+name+' '+digest),`SHA pin for ${name}`);
  assert.ok(cmd.includes('if not exist "%~dp0'+name+'" goto package_missing'));
 }
 assert.match(cmd,/SPACE_SATELLITE_R9_PRIVATE_SHADOW_RESULT\.txt/);
 assert.match(cmd,/%~dp0SPACE_SATELLITE_R9_PRIVATE_SHADOW_RESULT\.txt/);
 assert.match(cmd,/E:\\ZGmini\\runtime\\node\.exe/);
 assert.match(cmd,/--audit/);
 assert.doesNotMatch(cmd,/--collect|curl|powershell|schtasks|wrangler|npm install/i);
});
