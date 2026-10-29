import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const prior=fs.readFileSync(new URL('../staging/market-calendar/r29-private/scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
const next=fs.readFileSync(new URL('../staging/market-calendar/r37-census/scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
test('R37 retains all other source collection logic and public event schema',()=>{
 const a=prior.indexOf('async function fetchCensusYear('),b=prior.indexOf('\nexport async function collectReleaseCalendar',a);
 const c=next.indexOf('function censusDiagnosticCode('),d=next.indexOf('\nexport async function collectReleaseCalendar',c);
 assert.ok(a>0&&b>a&&c>0&&d>c);
 assert.equal(next.slice(0,c),prior.slice(0,a));
 assert.equal(next.slice(d),prior.slice(b));
 assert.match(next,/key\+':census:diagnostic:'\+year/);
 assert.match(next,/REQUEST_TIMEOUT_OR_ABORT/);
 assert.match(next,/YEAR_EVENTS_EMPTY_OR_WRONG_YEAR/);
 assert.match(next,/saveCensusPrivateDiagnostic\(store,key,year,now,'SOURCE_FAILED',attempts\)/);
 assert.doesNotMatch(next.slice(d),/censusDiagnostics/);
});
