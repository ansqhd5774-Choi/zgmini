import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cmd=new URL('../scripts/pc-writer/MARKET_CALENDAR_R45_PC_CURRENT_DETACH.cmd',import.meta.url);
const oneClick=new URL('../scripts/pc-writer/MARKET_CALENDAR_R45_PC_APPLY_ONE_CLICK.cmd',import.meta.url);
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
 assert.match(s,/:R45_NOW_LOCAL_STOP/);
 assert.match(s,/R45_CURRENT_APPROVED_NODE_MISSING_STOP/);
 assert.match(s,/R45_CURRENT_PREFLIGHT_RESULT_MISSING_STOP/);
 assert.match(s,/> "%R45_NOW_RESULT%" echo \{"audit"/);
});

test('separate one-click apply launcher creates or locates a durable TXT result',()=>{
 const b=fs.readFileSync(oneClick);
 assert.ok(b.every(x=>x<128));
 const s=b.toString('ascii');
 assert.equal(/(?<!\r)\n/.test(s),false);
 assert.match(s,/if not exist "%R45_ONCE_PREFLIGHT%" call "%R45_ONCE_RUNNER%"/);
 assert.match(s,/findstr \/C:"R45_CURRENT_PREFLIGHT_READY_NO_CHANGES"/);
 assert.match(s,/call "%R45_ONCE_RUNNER%" --apply/);
 assert.match(s,/R45_CURRENT_ONE_CLICK_APPLY_RESULT_MISSING_STOP/);
 assert.match(s,/SEND THIS TXT FILE TO CHATGPT/);
 assert.match(s,/pause/);
 assert.doesNotMatch(s,/powershell|schtasks|git\s|del\s|erase\s|timeout\s|taskkill\s/i);
});

test('instructions separate source evidence review from an explicit PC mutation',()=>{
 const s=fs.readFileSync(readme,'ascii');
 assert.match(s,/READ-ONLY/);
 assert.match(s,/ONLY AFTER CHATGPT REVIEWED YOUR READY RESULT/);
 assert.match(s,/Double-click MARKET_CALENDAR_R45_PC_APPLY_ONE_CLICK\.cmd/);
 assert.match(s,/No terminal commands or manual arguments/);
 assert.match(s,/Core Task and R7 helper launcher are never changed/);
 assert.match(s,/Existing Core locks are never deleted/);
});
