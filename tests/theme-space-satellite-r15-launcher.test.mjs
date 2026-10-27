import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

test('R15 PC Desktop launcher pins eight JS files and only performs audit',()=>{
 const base=path.resolve('scripts/pc-writer');
 const cmd=fs.readFileSync(path.join(base,'theme-space-satellite-r15-all-etf-score-audit.cmd'));
 const content=cmd.toString('ascii');
 const entries=[...content.matchAll(/^call :verify (\S+\.mjs) ([a-f0-9]{64})\r?$/gm)];
 assert.equal(entries.length,8);
 for(const [,file,expect] of entries){
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(base,file))).digest('hex'),
   expect,file);
 }
 assert.ok(cmd.every(byte=>byte<128),'CMD must be plain ASCII');
 assert.ok(!content.replaceAll('\r\n','').includes('\n'),'CMD must use CRLF');
 assert.match(content,/SPACE_SATELLITE_R15_ALL_ETF_SCORE_RESULT\.txt/);
 assert.match(content,/PROVIDER_GETS=0/);
 assert.match(content,/PC_DATA_WRITES=0/);
 assert.match(content,/--audit >>"%R15_LOG%"/);
 assert.doesNotMatch(content,/\b(curl|wget|powershell|wrangler|schtasks|git pull)\b/i);
});
