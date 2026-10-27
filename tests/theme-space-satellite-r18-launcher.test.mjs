import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

test('R18 Desktop CMD SHA pins every local script, reads only, and uses CRLF ASCII',()=>{
 const base=path.resolve('scripts/pc-writer');
 const content=fs.readFileSync(path.join(base,'theme-space-satellite-r18-variable-basket-shadow.cmd'));
 const s=content.toString('ascii');
 const matches=[...s.matchAll(/^call :verify (\S+\.mjs) ([a-f0-9]{64})\r?$/gm)];
 assert.equal(matches.length,10);
 for(const [,filename,hash] of matches){
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(base,filename)))
   .digest('hex'),hash,filename);
 }
 assert.ok(content.every(b=>b<128),'ASCII only');
 assert.ok(!s.replaceAll('\r\n','').includes('\n'),'CRLF only');
 assert.match(s,/SPACE_SATELLITE_R18_VARIABLE_BASKET_RESULT\.txt/);
 assert.match(s,/PROVIDER_GETS=0/);
 assert.match(s,/PC_DATA_WRITES=0/);
 assert.match(s,/--audit >>"%R18_LOG%"/);
 assert.doesNotMatch(s,/\b(curl|wget|powershell|schtasks|wrangler|git pull)\b/i);
});
