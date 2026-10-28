import test from 'node:test';
import assert from 'node:assert/strict';
import {CFTC_COT_URL,parseCftcCotHtml} from '../staging/market-calendar/r25-cftc/lib/cftc-calendar.mjs';
import {RELEASE_SOURCES} from '../staging/market-calendar/r25-cftc/lib/release-calendar.mjs';
import {monthRows,mockCftcHtml} from './fixtures/market-calendar-r25-cftc-html.mjs';

test('R25 parses 52 explicit dates and 9 future dates with 3 holiday delays',()=>{
 const all=parseCftcCotHtml(mockCftcHtml());
 assert.equal(all.length,52);
 const future=parseCftcCotHtml(mockCftcHtml(),{fromDate:'2026-10-28'});
 assert.deepEqual(future.map(e=>e.date),['2026-10-30','2026-11-06','2026-11-16','2026-11-20','2026-11-30','2026-12-04','2026-12-11','2026-12-18','2026-12-28']);
 assert.deepEqual(future.filter(e=>e.title.includes('Holiday-delayed')).map(e=>e.date),['2026-11-16','2026-11-30','2026-12-28']);
 assert.ok(all.every(e=>e.source==='cftc'&&e.id==='cftc-cot'&&e.sourceUrl===CFTC_COT_URL));
 assert.ok(all.every(e=>Object.keys(e).sort().join(',')==='date,id,source,sourceUrl,title'));
 assert.equal(RELEASE_SOURCES.cftc.url,CFTC_COT_URL);
});

test('R25 cannot manufacture unannounced years or extrapolate Fridays',()=>{
 const all=parseCftcCotHtml(mockCftcHtml());
 assert.ok(all.every(e=>e.date.startsWith('2026-')));
 assert.equal(parseCftcCotHtml(mockCftcHtml(),{fromDate:'2027-01-01'}).length,0);
 const newYear=mockCftcHtml({year:2027});
 assert.ok(parseCftcCotHtml(newYear).every(e=>e.date.startsWith('2027-')));
});

test('R25 fails closed for missing month, duplicate year/date and unsupported cell',()=>{
 assert.throws(()=>parseCftcCotHtml(mockCftcHtml({rows:monthRows.slice(1)})),/CFTC_YEAR_MONTHS_INCOMPLETE/);
 const doubled=mockCftcHtml().replace('</body>',mockCftcHtml().match(/<h3>[\s\S]*<\/table>/)[0]+'</body>');
 assert.throws(()=>parseCftcCotHtml(doubled),/CFTC_DUPLICATE_YEAR/);
 const invalid=[...monthRows.map(r=>[...r])];invalid[9][1]='45';
 assert.throws(()=>parseCftcCotHtml(mockCftcHtml({rows:invalid})),/CFTC_INVALID_OR_DUPLICATE_DATE/);
 const mutated=[...monthRows.map(r=>[...r])];mutated[10][1]='every Friday';
 assert.throws(()=>parseCftcCotHtml(mockCftcHtml({rows:mutated})),/CFTC_DATE_CELL_INVALID/);
});

test('R25 preserves only explained holiday annotations',()=>{
 assert.throws(()=>parseCftcCotHtml(mockCftcHtml({explanation:false})),/CFTC_HOLIDAY_MARKER_EXPLANATION_MISSING/);
 assert.throws(()=>parseCftcCotHtml('<html>Release Schedule</html>'),/CFTC_OFFICIAL_PAGE_INVALID/);
 assert.throws(()=>parseCftcCotHtml(mockCftcHtml(),{fromDate:'invalid'}),/CFTC_FROM_DATE_INVALID/);
});
