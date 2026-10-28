import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEiaScheduleHtml,parseEiaWpsrCalendarJson} from '../staging/market-calendar/r23-eia/lib/eia-calendar.mjs';

const wpsr=`<html><h1>Weekly Petroleum Status Report Schedule</h1><table class="basic-table schedule">
<tr><th>Data for the week ending</th><th>Alternate release date</th><th>Release day</th><th>Release time</th><th>Holiday</th></tr>
<tr><th>November 6, 2026</th><td>November 12, 2026</td><td>Thursday</td><td>12:00 p.m.</td><td>Veterans Day</td></tr>
<tr><th>February 26, 2026</th><td>February 30, 2026</td><td>Monday</td><td>10:30 a.m.</td><td>Invalid</td></tr>
</table></html>`;
const wngsr=`<html><h1>Weekly Natural Gas Storage Report</h1><h3>Holiday Release Schedule</h3>
<table class="simpletable"><tr><th>Alternate release date</th><th>Release day</th><th>Release time</th><th>Holiday</th></tr>
<tr><td>November 13, 2026</td><td><span>Friday</span></td><td><span>10:30 a.m.</span></td><td>Veterans Day</td></tr>
<tr><td>November 25, 2026</td><td>Wednesday</td><td>12:00 p.m.</td><td>Thanksgiving</td></tr>
</table></html>`;
const steo=`<html><h1>Short-Term Energy Outlook</h1><h1>Schedule</h1>
<table class="zebra"><thead><tr><th>Issue</th><th>Release date</th><th>Notes</th></tr></thead><tbody>
<tr><td>November 2026</td><td>11/10/2026</td><td></td></tr>
<tr><td>December 2026</td><td>12/08/2026</td><td></td></tr>
<tr><td>January 2027</td><td>01/12/2027</td><td></td></tr>
<tr><td>February 2027</td><td>02/30/2027</td><td></td></tr>
</tbody></table></html>`;

test('R23 WPSR parser uses only holiday-exception dates printed by EIA',()=>{
 const events=parseEiaScheduleHtml(wpsr,'wpsr-schedule',{fromDate:'2026-10-28'});
 assert.deepEqual(events.map(e=>e.date),['2026-11-12']);
 assert.equal(events[0].id,'eia-wpsr');
 assert.equal(events[0].source,'eia');
 assert.match(events[0].title,/ET 12:00 p\.m\./);
 assert.equal(Object.keys(events[0]).sort().join(','),'date,id,source,sourceUrl,title');
});

test('R23 WNGSR parser handles independent exception dates and filters past events',()=>{
 const events=parseEiaScheduleHtml(wngsr,'wngsr-schedule',{fromDate:'2026-11-01'});
 assert.deepEqual(events.map(e=>e.date),['2026-11-13','2026-11-25']);
 assert.ok(events.every(e=>e.id==='eia-wngsr'));
 assert.deepEqual(parseEiaScheduleHtml(wngsr,'wngsr-schedule',{fromDate:'2026-11-20'}).map(e=>e.date),['2026-11-25']);
});

test('R23 STEO parses the actual disclosed table, never synthetic future months',()=>{
 const events=parseEiaScheduleHtml(steo,'steo-schedule',{fromDate:'2026-10-28'});
 assert.deepEqual(events.map(e=>e.date),['2026-11-10','2026-12-08','2027-01-12']);
 assert.ok(events.every(e=>e.id==='eia-steo'));
});

test('R23 STEO next release is an explicit label, not a generated recurrence',()=>{
 const next='<html><h1>Short-Term Energy Outlook</h1>'+(' '.repeat(100))+
  '<strong>Next Release Date:</strong> November 10, 2026</html>';
 assert.deepEqual(parseEiaScheduleHtml(next,'steo-next',{fromDate:'2026-10-28'}).map(e=>e.date),['2026-11-10']);
 assert.throws(()=>parseEiaScheduleHtml(next.replace('November 10, 2026','Next Tuesday'),'steo-next'),/EIA_NO_EXPLICIT_DATES/);
});

test('R23 rejects incorrect official identity, invalid input and missing future date',()=>{
 assert.throws(()=>parseEiaScheduleHtml(wpsr,'wngsr-schedule'),/EIA_WNGSR_IDENTITY_INVALID/);
 assert.throws(()=>parseEiaScheduleHtml(wngsr,'wpsr-schedule'),/EIA_WPSR_IDENTITY_INVALID/);
 assert.throws(()=>parseEiaScheduleHtml(steo,'steo-schedule',{fromDate:'2028-01-01'}),/EIA_NO_EXPLICIT_DATES/);
 assert.throws(()=>parseEiaScheduleHtml(steo,'unknown'),/EIA_KIND_INVALID/);
 assert.throws(()=>parseEiaScheduleHtml(steo,'steo-schedule',{fromDate:'2026-02-30'}),/EIA_INPUT_INVALID/);
});

test('R23 WPSR JSON takes official dated rows and excludes exceptional repost timestamps',()=>{
 const row=(date,data,time,holiday=false)=>({data_for_date:data,release_date:date,
  next_release_date:'2026-11-18',holiday_delayed:holiday,holiday_name:holiday?'Veterans Day':null,
  release_time:time,blackout_minutes:15});
 const rows=[row('2026-11-04','2026-10-30','10:30'),
  row('2026-11-12','2026-11-06','12:00',true),
  row('2026-11-13','2026-11-06','13:50'),
  row('2026-02-30','2026-02-23','10:30')];
 const events=parseEiaWpsrCalendarJson(JSON.stringify(rows),{fromDate:'2026-10-28'});
 assert.deepEqual(events.map(e=>e.date),['2026-11-04','2026-11-12']);
 assert.match(events[1].title,/휴일 조정/);
 assert.equal(events[0].source,'eia');
 assert.throws(()=>parseEiaWpsrCalendarJson('{bad-json'),/EIA_WPSR_JSON_INVALID/);
 assert.throws(()=>parseEiaWpsrCalendarJson('[]'),/EIA_WPSR_JSON_SHAPE_INVALID/);
});
