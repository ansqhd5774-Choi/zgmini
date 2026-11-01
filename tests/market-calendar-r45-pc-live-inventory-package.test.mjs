import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cmd=new URL('../scripts/pc-writer/MARKET_CALENDAR_R45_PC_LIVE_INVENTORY.cmd',import.meta.url);
const readme=new URL('../scripts/pc-writer/README_MARKET_CALENDAR_R45_PC_LIVE_INVENTORY.txt',import.meta.url);

test('portable Windows command is ASCII/CRLF and has no apply path',()=>{
 const data=fs.readFileSync(cmd);
 assert.ok(data.every(byte=>byte<128));
 const text=data.toString('ascii');
 assert.equal(/(?<!\r)\n/.test(text),false);
 assert.match(text,/if not "%~1"=="" goto R45_INV_USAGE/);
 assert.match(text,/if exist "%R45_INV_RESULT%"/);
 assert.match(text,/market-calendar-r45-pc-live-inventory\.mjs/);
 assert.match(text,/--base=/);
 assert.doesNotMatch(text,/\-\-apply|schtasks\s+\/change|git\s+pull|powershell|del\s|erase\s/i);
});

test('instructions do not turn read-only observation into authority to change PC',()=>{
 const text=fs.readFileSync(readme,'ascii');
 assert.match(text,/READ ONLY/);
 assert.match(text,/NOT grant permission/);
 assert.match(text,/Do NOT run any previous R45 detach --apply/);
 assert.match(text,/Core five-minute interval/);
});
