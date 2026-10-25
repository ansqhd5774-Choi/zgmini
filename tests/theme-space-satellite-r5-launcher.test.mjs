import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {SOURCE_SHA} from '../scripts/pc-writer/theme-space-satellite-r5-preflight.mjs';

test('Desktop R5 CMD uses pinned helper, ASCII CRLF and no collection or publication',()=>{
 const base=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','scripts','pc-writer');
 const cmd=fs.readFileSync(path.join(base,'theme-space-satellite-r5-preflight.cmd'));
 const body=cmd.toString('utf8');
 assert.equal(cmd.every(b=>b<=0x7f),true);
 assert.equal(/(^|[^\r])\n/.test(body),false);
 const pin=body.match(/set "SS_R5_HELPER_HASH=([a-f0-9]{64})"/);
 assert.ok(pin);
 const actual=createHash('sha256').update(fs.readFileSync(path.join(base,
  'theme-space-satellite-r5-preflight.mjs'))).digest('hex');
 assert.equal(pin[1],actual);
 assert.equal(body.includes(`PINNED_SOURCE_SHA=${SOURCE_SHA}`),true);
 assert.equal(body.includes('E:\\ZGmini\\runtime\\node.exe'),true);
 assert.equal(body.includes('%~dp0SPACE_SATELLITE_R5_RESULT.txt'),true);
 assert.equal(body.includes('--preflight'),true);
 assert.equal(/--collect|--publish|schtasks|wrangler|powershell|%TEMP%/i.test(body),false);
});
