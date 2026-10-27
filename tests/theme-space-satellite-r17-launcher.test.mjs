import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

test('R17 CMD only reads private PC data and SHA pins eight MJS files',()=>{
 const dir=path.resolve('scripts/pc-writer');
 const body=fs.readFileSync(path.join(dir,'theme-space-satellite-r17-hour-coverage.cmd'));
 const cmd=body.toString('ascii');
 const pinned=[...cmd.matchAll(/^call :verify (\S+\.mjs) ([a-f0-9]{64})\r?$/gm)];
 assert.equal(pinned.length,8);
 for(const [,name,hash] of pinned)assert.equal(hash,
  createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex'),name);
 assert.ok(body.every(c=>c<128));
 assert.ok(!cmd.replaceAll('\r\n','').includes('\n'));
 assert.match(cmd,/SPACE_SATELLITE_R17_HOUR_COVERAGE_RESULT\.txt/);
 assert.match(cmd,/PROVIDER_GETS=0/);
 assert.match(cmd,/PC_DATA_WRITES=0/);
 assert.match(cmd,/--audit >>"%R17_LOG%"/);
 assert.doesNotMatch(cmd,/\b(curl|wget|powershell|schtasks|wrangler|git pull)\b/i);
});
