import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

test('R19 Windows CMD checks all pinned MJS and keeps writes limited to Desktop log',()=>{
 const root=path.resolve('scripts/pc-writer');
 const bytes=fs.readFileSync(path.join(root,'theme-space-satellite-r19-composition-effect.cmd'));
 const s=bytes.toString('ascii');
 const pins=[...s.matchAll(/^call :verify (\S+\.mjs) ([a-f0-9]{64})\r?$/gm)];
 assert.equal(pins.length,11);
 for(const [,file,expected] of pins){
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,file)))
   .digest('hex'),expected,file);
 }
 assert.ok(bytes.every(b=>b<128),'ASCII only');
 assert.ok(!s.replaceAll('\r\n','').includes('\n'),'CRLF only');
 assert.match(s,/SPACE_SATELLITE_R19_COMPOSITION_EFFECT_RESULT\.txt/);
 assert.match(s,/PROVIDER_GETS=0/);
 assert.match(s,/PC_DATA_WRITES=0/);
 assert.match(s,/"--audit"| --audit >>"%R19_LOG%"/);
 assert.doesNotMatch(s,/\b(curl|wget|powershell|schtasks|wrangler|git pull)\b/i);
});
