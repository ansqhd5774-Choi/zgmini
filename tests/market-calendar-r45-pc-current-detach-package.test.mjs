import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cmd=new URL('../scripts/pc-writer/MARKET_CALENDAR_R45_PC_CURRENT_DETACH.cmd',import.meta.url);
const readme=new URL('../scripts/pc-writer/README_MARKET_CALENDAR_R45_PC_CURRENT_DETACH.txt',import.meta.url);

test('Windows CMD is ASCII CRLF and requires exact preflight before apply',()=>{
 const b=fs.readFileSync(cmd);
 assert.ok(b.every(x=>x<128));
 const s=b.toString('ascii');
 assert.equal(/(?<!\r)\n/.test(s),false);
 assert.match(s,/if "%~1"=="" goto R45_NOW_RUN/);
 assert.match(s,/findstr \/C:"R45_CURRENT_PREFLIGHT_READY_NO_CHANGES"/);
 assert.match(s,/if exist "%R45_NOW_RESULT%"/);
 assert.match(s,/market-calendar-r45-pc-current-detach\.mjs/);
 assert.match(s,/market-calendar-r45-pc-live-inventory\.mjs/);
 assert.doesNotMatch(s,/powershell|schtasks\s+\/change|git\s+pull|del\s|erase\s/i);
});

test('instructions separate source evidence review from an explicit PC mutation',()=>{
 const s=fs.readFileSync(readme,'ascii');
 assert.match(s,/READ-ONLY/);
 assert.match(s,/review BEFORE any apply/);
 assert.match(s,/Core Task and R7 helper launcher are never changed/);
 assert.match(s,/Existing Core locks are never deleted/);
});
