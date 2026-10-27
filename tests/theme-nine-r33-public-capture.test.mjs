import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cmd=fs.readFileSync(path.join(root,
 'scripts/pc-writer/THEME_NINE_R33_PUBLIC_BASELINE_READONLY.cmd'),'ascii');

test('public snapshot CMD uses only one existing ZGMINI GET, no provider path',()=>{
 assert.match(cmd,/curl\.exe --fail --silent --show-error --location --max-time 25 --retry 0 --output/);
 assert.equal((cmd.match(/https:\/\/zgmini\.kr\/api\/theme-fear-greed/g)||[]).length,2);
 assert.doesNotMatch(cmd,/\s--(request|data|upload-file)\s/i);
 assert.doesNotMatch(cmd,/wrangler|powershell|schtasks|%TEMP%|https:\/\/getmarkethistory/i);
});
test('public snapshot CMD remains ASCII, CRLF and adjacent-output only',()=>{
 assert.ok(Buffer.from(cmd,'ascii').every(c=>c<128));
 assert.match(cmd,/^@echo off\r\n/);
 assert.doesNotMatch(cmd,/(^|[^\r])\n/);
 assert.match(cmd,/set "R33_PUBLIC_FILE=%~dp0THEME_NINE_R33_PUBLIC_BASELINE_/);
 assert.match(cmd,/set "R33_PUBLIC_LOG=%~dp0THEME_NINE_R33_PUBLIC_RESULT_/);
});
