import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const launcher=fs.readFileSync(path.join(root,'scripts/pc-writer/theme-space-satellite-r6-collect.cmd'));
const collector=fs.readFileSync(path.join(root,'scripts/pc-writer/theme-space-satellite-r6-collect.mjs'));
const cmd=launcher.toString('utf8');

test('R6 Windows launcher pins NASA/SPY-only source and keeps report beside CMD',()=>{
 assert.equal(launcher.some(byte=>byte>127),false,'CMD must be ASCII');
 assert.equal(/(^|[^\r])\n/.test(cmd),false,'CMD must use CRLF on Windows');
 const digest=createHash('sha256').update(collector).digest('hex');
 assert.match(cmd,new RegExp(`SS_R6_HASH=${digest}`));
 assert.match(cmd,/SS_R6_SOURCE_SHA=016eeedf88926d2e31e504561ddbe0c895389ee3/);
 assert.match(cmd,/SS_R6_LOG=%~dp0SPACE_SATELLITE_R6_RESULT\.txt/);
 assert.match(cmd,/--collect space-satellite 2024-01-01 2026-10-23/);
 assert.match(cmd,/PHASE=READ_ONLY_BEFORE/);
 assert.match(cmd,/PHASE=READ_ONLY_AFTER/);
 assert.match(cmd,/RESULT=BLOCKED_REVIEW_CHECKPOINT_NO_BLIND_RETRY/);
 assert.match(collector.toString('utf8'),/const pairs=\{'space-satellite':\['NASA','SPY'\]\};/);
 assert.match(collector.toString('utf8'),/maxRequests=4/);
 for(const forbidden of [/powershell/i,/schtasks/i,/%TEMP%/i,/--publish/i,/--score/i,/--install/i]){
  assert.doesNotMatch(cmd,forbidden);
 }
});
