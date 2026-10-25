import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

test('R7 Windows CMD is ASCII CRLF, pinned to NASA-only source, Desktop log',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const script=fs.readFileSync(path.join(root,'scripts/pc-writer/theme-space-satellite-r7-nasa-only.mjs'));
 const cmd=fs.readFileSync(path.join(root,'scripts/pc-writer/theme-space-satellite-r7-nasa-only.cmd'));
 const content=cmd.toString('latin1'),digest=createHash('sha256').update(script).digest('hex');
 assert.match(content,new RegExp(digest));
 assert.ok(cmd.every(byte=>byte<128));
 assert.ok(!/(?<!\r)\n/.test(content));
 assert.match(content,/SPACE_SATELLITE_R7_NASA_RESULT\.txt/);
 assert.match(content,/--collect space-satellite 2026-03-30 2026-10-23/);
 assert.match(content,/E:\\ZGmini\\data/);
 assert.doesNotMatch(content,/--collect space-satellite 2024-01-01/);
 assert.doesNotMatch(content,/powershell|start \/b|schtasks|wrangler/i);
 assert.doesNotMatch(script.toString(),/api\/v1\/bars\/stocks\/(?:SPY|UFO)\//);
});
