import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseTicReleaseDatesHtml,TIC_RELEASE_DATES_URL} from '../staging/market-calendar/r27-tic/lib/tic-calendar.mjs';
import {ticReleaseAt} from '../lib/market-calendar-tic-time.mjs';
import {mockTicHtml} from './fixtures/market-calendar-r27-tic-html.mjs';

test('R27 official table yields 49 dated, five-field events and distinct categories',()=>{
 const events=parseTicReleaseDatesHtml(mockTicHtml());
 assert.equal(events.length,49);
 assert.equal(events.filter(e=>e.date.startsWith('2026')).length,25);
 assert.equal(events.filter(e=>e.date.startsWith('2027')).length,24);
 assert.equal(new Set(events.map(e=>e.id)).size,49);
 assert.ok(events.every(e=>Object.keys(e).sort().join(',')==='date,id,source,sourceUrl,title'));
 assert.ok(events.every(e=>e.source==='tic'&&e.sourceUrl===TIC_RELEASE_DATES_URL));
 assert.ok(events.some(e=>e.id==='tic-monthly-2026-11'&&e.date==='2026-11-18'));
 assert.ok(events.some(e=>e.id==='tic-annual-us-foreign-final-2026-10'&&e.date==='2026-10-30'));
 assert.ok(events.some(e=>e.id==='tic-quarterly-external-debt-2026-01'&&e.title.includes('공휴일 지연')));
 assert.ok(events.some(e=>e.id==='tic-annual-foreign-us-preliminary-2027-02'&&e.title.includes('잠정')));
});

test('R27 malformed table, missing dates and wrong table columns fail closed',()=>{
 const html=mockTicHtml();
 assert.throws(()=>parseTicReleaseDatesHtml(html.replace('2027</u>','2028</u>')),/TIC_YEAR_COVERAGE_INCOMPLETE/);
 assert.throws(()=>parseTicReleaseDatesHtml(html.replace('November','Nov')),/TIC_MONTH_INVALID/);
 assert.throws(()=>parseTicReleaseDatesHtml(html.replace('16 (delayed)','32 (delayed)')),/TIC_DAY_NOTE_UNRECOGNIZED/);
 assert.throws(()=>parseTicReleaseDatesHtml(html.replace('30 - final','30 - estimated')),/TIC_DAY_NOTE_UNRECOGNIZED/);
 assert.throws(()=>parseTicReleaseDatesHtml(html.replace('Monthly:','Weekly:')),/TIC_COLUMN_CONTRACT_CHANGED/);
 assert.throws(()=>parseTicReleaseDatesHtml(html,{fromDate:'2026-02-30'}),/TIC_FROM_DATE_INVALID/);
});

test('R27 time converts 4pm New York with DST to next-day KST without changing stored date',()=>{
 assert.equal(ticReleaseAt('2026-10-30'),'2026-10-30T20:00:00.000Z');
 assert.equal(ticReleaseAt('2026-11-18'),'2026-11-18T21:00:00.000Z');
 assert.equal(ticReleaseAt('2027-03-18'),'2027-03-18T20:00:00.000Z');
 assert.equal(ticReleaseAt('2027-12-16'),'2027-12-16T21:00:00.000Z');
 assert.equal(ticReleaseAt('2026-02-30'),null);
 for(const d of ['2026-10-30','2026-11-18']){
  const at=ticReleaseAt(d);
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(at));
  const z=Object.fromEntries(p.map(x=>[x.type,x.value]));
  assert.equal(z.year+'-'+z.month+'-'+z.day,d==='2026-10-30'?'2026-10-31':'2026-11-19');
  assert.equal(z.hour,d==='2026-10-30'?'05':'06');
 }
});

test('R27 UI recognizes TIC ids and converts official US dates for calendar rows',()=>{
 const ui=fs.readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
 assert.match(ui,/item\.source==='tic'/);
 assert.match(ui,/ticReleaseAt\(item\.date\)/);
 assert.match(ui,/kstDay\(new Date\(eventAt\)\)/);
 assert.match(ui,/국제자본/);
});
