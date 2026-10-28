import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cftcCotReleaseAt} from '../lib/market-calendar-cftc-time.mjs';
import {ticReleaseAt} from '../lib/market-calendar-tic-time.mjs';

const client=readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');

test('official CFTC release clock respects US daylight saving and KST next-day display',()=>{
 assert.equal(cftcCotReleaseAt('2026-10-30'),'2026-10-30T19:30:00.000Z');
 assert.equal(cftcCotReleaseAt('2026-11-06'),'2026-11-06T20:30:00.000Z');
 assert.equal(cftcCotReleaseAt('2026-02-30'),null);
 assert.equal(new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(cftcCotReleaseAt('2026-11-06'))),'05:30');
});

test('official TIC release clock respects US daylight saving and KST next-day display',()=>{
 assert.equal(ticReleaseAt('2026-10-16'),'2026-10-16T20:00:00.000Z');
 assert.equal(ticReleaseAt('2026-11-18'),'2026-11-18T21:00:00.000Z');
 assert.equal(ticReleaseAt('2026-02-30'),null);
 assert.equal(new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ticReleaseAt('2026-11-18'))),'06:00');
});

test('only validated stored release events are shown and non-timed Treasury dates stay untimed',()=>{
 assert.match(client,/const treasuryEvent=item\.source==='treasury'&&/);
 assert.match(client,/const ticEvent=item\.source==='tic'&&/);
 assert.match(client,/const cftcEvent=item\.source==='cftc'&&/);
 assert.match(client,/const eiaEvent=item\.source==='eia'&&/);
 assert.match(client,/const usdaEvent=item\.source==='usda'&&/);
 assert.match(client,/const eventAt=timed\?\.at\?\?cftcAt\?\?ticAt/);
 assert.match(client,/const displayDate=eventAt&&\(cftcAt\|\|ticAt\)\?kstDay\(new Date\(eventAt\)\):item\.date/);
 assert.match(client,/source:sourceNames\[item\.source\]/);
 assert.match(client,/sourceUrl:item\.sourceUrl/);
});

test('main calendar period selection and existing stored-feed architecture remain unchanged',()=>{
 assert.match(client,/<button type="button" className=\{`mc-period/);
 assert.match(client,/onClick=\{\(\)=>setActiveDate\(null\)\}/);
 assert.match(client,/fetch\('\/api\/release-calendar'/);
 assert.doesNotMatch(client,/new Date\(\)\.toISOString\(\).*treasury/);
});
