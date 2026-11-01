import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../scripts/pc-writer/theme-data-center-power-r4-bootstrap.cmd',import.meta.url));
const cmd=source.toString('ascii');

test('user Windows CMD pins an immutable existing GitHub release and preserves same-folder log',()=>{
 assert.ok(source.every(c=>c<128),'non-ASCII CMD byte');
 assert.equal(cmd.replace(/\r\n/g,'').includes('\n'),false,'CMD must use CRLF');
 assert.match(cmd,/set "DC_SHA=2f0f1a2c1b31e20f9e943e90824885d586448d29"/);
 assert.match(cmd,/set "DC_LOG=%~dp0DATA_CENTER_POWER_R4_RESULT\.txt"/);
 assert.match(cmd,/--source-sha=%DC_SHA%/);
 assert.match(cmd,/--collect data-center-power 2024-01-01 2026-10-22/);
 assert.match(cmd,/theme-data-center-power-publish-r3\.mjs" --once/);
 assert.doesNotMatch(cmd,/--publish|schtasks|wrangler deploy|--accept-anonymous-license-risk/i);
 assert.doesNotMatch(cmd,/powershell|\\Temp\\|%TEMP%/i);
});
