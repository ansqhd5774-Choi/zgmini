import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

test('R16 Windows CMD SHA pins sources; network-free and read-only',()=>{
 const base=path.resolve('scripts/pc-writer');
 const buf=fs.readFileSync(path.join(base,'theme-space-satellite-r16-gap-forensic.cmd'));
 const cmd=buf.toString('ascii');
 const rows=[...cmd.matchAll(/^call :verify (\S+\.mjs) ([a-f0-9]{64})\r?$/gm)];
 assert.equal(rows.length,8);
 for(const [,name,digest] of rows){
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(base,name))).digest('hex'),
   digest,name);
 }
 assert.ok(buf.every(b=>b<128),'CMD must be ASCII');
 assert.ok(!cmd.replaceAll('\r\n','').includes('\n'),'CMD must be CRLF');
 assert.match(cmd,/SPACE_SATELLITE_R16_GAP_FORENSIC_RESULT\.txt/);
 assert.match(cmd,/PROVIDER_GETS=0/);assert.match(cmd,/PC_DATA_WRITES=0/);
 assert.match(cmd,/--audit >>"%R16_LOG%"/);
 assert.doesNotMatch(cmd,/\b(curl|wget|powershell|schtasks|wrangler|git pull)\b/i);
});
