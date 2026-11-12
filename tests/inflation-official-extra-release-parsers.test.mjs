import test from 'node:test';
import assert from 'node:assert/strict';
import {
 INFLATION_EXTRA_RELEASE_SOURCES,
 parseEiaEpmNextRelease,
 parseNyfedInflationReleaseMonth,
 nyfedInflationReleaseMonthUrls,
} from '../lib/inflation-official-extra-release-parsers.mjs';

const epm=`<html><h1>Electric Power Monthly</h1><div>
 Data for August 2026 Release Date: October 23, 2026
 <span>Next Release Date: November 24, 2026</span></div></html>`;

const nyfed=`<html><div><a>PREVIOUS MONTH</a> NOVEMBER 2026 <a>NEXT MONTH</a></div>
 <table>
  <tr><td><div>05<br><a href='/gscpi'>Global Supply Chain Pressure Index (GSCPI)</a><br>(10:00)</div></td>
  <td><div>06<br><a>Employment Situation</a></div></td></tr>
  <tr><td><div>09<br><a href='/sce'>Survey of Consumer Expectations</a><br>(11:00)</div></td>
  <td><div>16<br><a>SCE Credit Access Survey</a><br>(11:00)</div></td></tr>
 </table></html>`;

test('EIA Electric Power Monthly HTML yields exact official next release, not an STEO date',()=>{
 assert.deepEqual(parseEiaEpmNextRelease(epm),[{
  id:'eia-epm',date:'2026-11-24',title:'Electric Power Monthly',source:'eia_epm',
  sourceUrl:'https://www.eia.gov/electricity/monthly/index.php',
 }]);
 assert.throws(()=>parseEiaEpmNextRelease('Short-Term Energy Outlook Next Release Date: November 10, 2026'),/EIA_EPM_PAGE_INVALID/);
 assert.throws(()=>parseEiaEpmNextRelease('Electric Power Monthly Release Date: October 23, 2026'),/EIA_EPM_NEXT_RELEASE_MISSING/);
 assert.throws(()=>parseEiaEpmNextRelease('Electric Power Monthly Next Release Date: February 31, 2027'),/EIA_EPM_DATE_INVALID/);
});

test('NYFed monthly calendar maps exact GSCPI and SCE names without confusing SCE sub-surveys',()=>{
 assert.deepEqual(parseNyfedInflationReleaseMonth(nyfed,{
  year:2026,month:11,sourceUrl:'https://www.newyorkfed.org/research/calendars/i-nov26.html',
 }),[
  {id:'nyfed-gscpi',date:'2026-11-05',title:'Global Supply Chain Pressure Index (GSCPI)',source:'nyfed',sourceUrl:'https://www.newyorkfed.org/research/calendars/i-nov26.html'},
  {id:'nyfed-sce',date:'2026-11-09',title:'Survey of Consumer Expectations',source:'nyfed',sourceUrl:'https://www.newyorkfed.org/research/calendars/i-nov26.html'},
 ]);
});

test('NYFed parser distinguishes wrong pages from valid months without the target releases',()=>{
 assert.throws(()=>parseNyfedInflationReleaseMonth(nyfed,{year:2026,month:12}),/NYFED_MONTH_MISMATCH/);
 assert.throws(()=>parseNyfedInflationReleaseMonth(nyfed,{year:2026,month:13}),/NYFED_MONTH_INVALID/);
 const unrelated=nyfed.replace('Global Supply Chain Pressure Index (GSCPI)','Other Survey').replace('Survey of Consumer Expectations','SCE Labor Market Survey');
 assert.deepEqual(parseNyfedInflationReleaseMonth(unrelated,{year:2026,month:11}),[]);
 const cancelled=nyfed.replace('Global Supply Chain Pressure Index (GSCPI)','Global Supply Chain Pressure Index (GSCPI) - Cancelled').replace('Survey of Consumer Expectations','Survey of Consumer Expectations - Postponed');
 assert.deepEqual(parseNyfedInflationReleaseMonth(cancelled,{year:2026,month:11}),[]);
 const crossed=nyfed.replace('<a href=\'/gscpi\'>Global Supply Chain Pressure Index (GSCPI)</a>','<del><a href=\'/gscpi\'>Global Supply Chain Pressure Index (GSCPI)</a></del>');
 assert.deepEqual(parseNyfedInflationReleaseMonth(crossed,{year:2026,month:11}).map(x=>x.id),['nyfed-sce']);
 assert.throws(()=>parseNyfedInflationReleaseMonth('<h2>November 2026</h2><table><tr><td>Other</td></tr></table>',{year:2026,month:11}),/NYFED_CALENDAR_DAYS_MISSING/);
});

test('NYFed cancel markers are per-event, not per-day, and month controls may move',()=>{
 const restructured=nyfed.replace('<a>PREVIOUS MONTH</a> NOVEMBER 2026 <a>NEXT MONTH</a>',
  '<h2>NOVEMBER 2026</h2><a>NEXT MONTH</a><a>PREVIOUS MONTH</a>');
 assert.equal(parseNyfedInflationReleaseMonth(restructured,{year:2026,month:11}).length,2);

 const unrelatedCrossed=nyfed.replace('<a href=\'/gscpi\'>Global Supply Chain Pressure Index (GSCPI)</a>',
  '<del><a>Other Report</a></del><a href=\'/gscpi\'>Global Supply Chain Pressure Index (GSCPI)</a>');
 assert.deepEqual(parseNyfedInflationReleaseMonth(unrelatedCrossed,{year:2026,month:11}).map(x=>x.id),
  ['nyfed-gscpi','nyfed-sce']);

 const sameDay=nyfed.replace('<a href=\'/gscpi\'>Global Supply Chain Pressure Index (GSCPI)</a>',
  '<del><a href=\'/gscpi\'>Global Supply Chain Pressure Index (GSCPI)</a></del><a href="/sce">Survey of Consumer Expectations</a>');
 assert.deepEqual(parseNyfedInflationReleaseMonth(sameDay,{year:2026,month:11}).map(x=>[x.id,x.date]),
  [['nyfed-sce','2026-11-05'],['nyfed-sce','2026-11-09']]);
});

test('NYFed URL lookup uses eastern current/next month including year rollover',()=>{
 assert.deepEqual(nyfedInflationReleaseMonthUrls(Date.parse('2027-01-01T03:00:00Z')).map(x=>x.url),[
  'https://www.newyorkfed.org/research/calendars/i-dec26.html',
  'https://www.newyorkfed.org/research/calendars/i-jan27.html',
 ]);
 assert.deepEqual(nyfedInflationReleaseMonthUrls(Date.parse('2027-01-01T06:00:00Z')).map(x=>x.url),[
  'https://www.newyorkfed.org/research/calendars/i-jan27.html',
  'https://www.newyorkfed.org/research/calendars/i-feb27.html',
 ]);
 assert.equal(INFLATION_EXTRA_RELEASE_SOURCES.nyfed.format,'monthly-html');
});
