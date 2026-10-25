import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const base=path.resolve('scripts/pc-writer');
const text=fs.readFileSync(path.join(base,'theme-space-satellite-r13-local-universe-audit.cmd'),'utf8');

test('R13 desktop launcher pins every local Node source SHA and stays read-only',()=>{
  const rows=[...text.matchAll(/^call :verify (\S+\.mjs) ([a-f0-9]{64})\r?$/gm)];
  assert.equal(rows.length,7);
  for(const [,filename,digest] of rows){
    const actual=createHash('sha256').update(fs.readFileSync(path.join(base,filename))).digest('hex');
    assert.equal(actual,digest,filename);
  }
  assert.match(text,/SPACE_SATELLITE_R13_EXISTING_RAW_RESULT\.txt/);
  assert.match(text,/E:\\ZGmini\\runtime\\node\.exe/);
  assert.match(text,/set "ZGMINI_DATA_ROOT=%R13_DATA%"/);
  assert.doesNotMatch(text,/(curl|wget|powershell|wrangler|schtasks|github\.com|git pull)/i);
  assert.match(text,/--audit/);
  assert.match(text,/:hash_mismatch/);
});
