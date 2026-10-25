import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {easternIso,upcomingSchedule,remainingParts,kstDisplay} from '../lib/fomc-schedule.mjs';

const file=fs.readFileSync(new URL('../components/fomc-countdown.tsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../components/fomc-countdown.css',import.meta.url),'utf8');

test('original yellow banner and flip clock sizes remain unchanged',()=>{
 assert.match(css,/\.zg-fomc-bar\{position:relative;height:24px;min-height:24px/);
 assert.match(css,/@media\(min-width:1024px\)\{\.zg-fomc-bar\{height:30px;min-height:30px/);
 assert.match(css,/\.zg-fomc-digit\{position:relative;display:inline-block/);
 assert.match(file,/function FlipDigit/);
 assert.match(file,/onClick=\{toggle\}/);
 assert.match(file,/aria-expanded=\{expanded\}/);
 assert.match(file,/hidden=\{!expanded\}/);
});
test('calendar includes verified releases and excludes calls',()=>{
 const now=Date.parse('2026-10-25T03:00:00Z');
 const events=upcomingSchedule(now,null);
 assert.ok(events.length>=8);
 assert.equal(events[0].kind,'연준');
 assert.deepEqual(events.map(e=>e.at),events.map(e=>e.at).sort());
 assert.ok(events.some(e=>e.name==='알파벳'&&e.estimated));
 assert.ok(events.some(e=>e.name==='미국 CPI'&&!e.estimated));
 assert.ok(!events.some(e=>/콜|컨퍼런스/.test(e.name)));
});
test('verified macro dates use Eastern daylight saving and standard time',()=>{
 assert.equal(easternIso('2026-10-29',8,30),'2026-10-29T12:30:00.000Z');
 assert.equal(easternIso('2026-11-06',8,30),'2026-11-06T13:30:00.000Z');
 assert.equal(kstDisplay(easternIso('2026-10-28',16)),'10.29 05:00');
});
test('countdown advances each second without day leading zero',()=>{
 const target='2026-10-29T12:30:00Z';
 const a=remainingParts(target,Date.parse('2026-10-26T12:30:02Z'));
 const b=remainingParts(target,Date.parse('2026-10-26T12:30:03Z'));
 assert.equal(a.days,2);
 assert.equal(a.seconds,58);
 assert.equal(b.seconds,57);
 assert.match(file,/\{parts.days\}/);
});
test('310px wraps centered four-column names with unchanged 37px height',()=>{
 assert.match(css,/@media\(max-width:359px\)/);
 assert.match(css,/grid-template-columns:28px minmax\(0,1fr\) 77px 86px/);
 assert.match(css,/\.zg-schedule-name-text\{white-space:normal;word-break:keep-all/);
 assert.match(css,/text-align:center/);
 assert.match(css,/\.zg-schedule-item\{height:37px;min-height:37px;max-height:37px/);
 assert.match(css,/\.zg-schedule-company-logo\{display:block;flex:none;width:14px;height:14px/);
});
