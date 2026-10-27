import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const base=path.resolve('scripts/pc-writer');
const cmd=fs.readFileSync(path.join(base,'theme-space-satellite-r14-missing-only.cmd'));
const content=cmd.toString('ascii');

test('R14 Desktop CMD SHA pins all eight source files before explicit collection',()=>{
 const entries=[...content.matchAll(/^call :verify (\S+\.mjs) ([a-f0-9]{64})\r?$/gm)];
 assert.equal(entries.length,8);
 for(const [,filename,digest] of entries){
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(base,filename))).digest('hex'),
   digest,filename);
 }
 assert.ok(cmd.every(b=>b<128),'Windows CMD must be 7-bit ASCII');
 assert.ok(!content.replaceAll('\r\n','').includes('\n'),'Windows CMD must be CRLF');
 assert.match(content,/call :verify theme-space-satellite-r14-missing-only\.mjs/);
 assert.match(content,/--collect >>"%R14_LOG%"/);
 assert.match(content,/E:\\ZGmini\\runtime\\node\.exe/);
 assert.match(content,/SPACE_SATELLITE_R14_MISSING_ONLY_RESULT\.txt/);
 assert.match(content,/>"%R14_LOG%" echo REPORT=/);
 assert.doesNotMatch(content,/\b(curl|wget|powershell|wrangler|schtasks|git pull)\b/i);
});
