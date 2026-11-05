import test from 'node:test';
import assert from 'node:assert/strict';
import {RELEASE_SOURCES,parseReleaseCalendar,nyFedCalendarPages} from '../lib/release-calendar.mjs';

const eia='<h1>Electric Power Monthly</h1><p>Data for August 2026 Release Date: October 23, 2026 Next Release Date: November 24, 2026</p>';
const novUrl='https://www.newyorkfed.org/research/calendars/i-nov26.html';
const decUrl='https://www.newyorkfed.org/research/calendars/i-dec26.html';
const nov='<nav>Survey of Consumer Expectations | Global Supply Chain Pressure Index</nav><table><tr>'+
 '<td>05<br><a>Global Supply Chain Pressure Index (GSCPI)</a> (10:00)</td>'+
 '<td>09<br><a>Survey of Consumer Expectations</a> (11:00)</td>'+
 '<td>16<br><a>SCE Credit Access Survey</a> (11:00)</td>'+
 '</tr></table>';
const dec='<table><tr><td><span>04</span><a>Global Supply Chain Pressure Index (GSCPI)</a></td>'+
 '<td><span>07</span><a>Survey of Consumer Expectations</a></td></tr></table>';

test('EIA EPM official next release is parsed without hardcoded dates',()=>{
 assert.equal(RELEASE_SOURCES.eia_epm.url,'https://www.eia.gov/electricity/monthly/');
 assert.deepEqual(parseReleaseCalendar(eia,'eia_epm'),[{
  id:'eia-epm',date:'2026-11-24',title:'Electric Power Monthly',source:'eia_epm',sourceUrl:RELEASE_SOURCES.eia_epm.page,
 }]);
 assert.equal(parseReleaseCalendar(eia.replace('November 24','December 28'),'eia_epm')[0].date,'2026-12-28');
 assert.throws(()=>parseReleaseCalendar(eia.replace('November 24','February 30'),'eia_epm'),/CALENDAR_EVENTS_EMPTY/);
 assert.throws(()=>parseReleaseCalendar('Some unrelated energy page','eia_epm'),/CALENDAR_FORMAT_INVALID/);
});

test('NY Fed current and next month URLs follow US Eastern month boundaries',()=>{
 assert.deepEqual(nyFedCalendarPages(Date.parse('2026-11-05T09:00:00Z')),[
  {year:2026,month:11,url:novUrl},{year:2026,month:12,url:decUrl},
 ]);
 assert.deepEqual(nyFedCalendarPages(Date.parse('2026-12-31T23:00:00Z')),[
  {year:2026,month:12,url:decUrl},
  {year:2027,month:1,url:'https://www.newyorkfed.org/research/calendars/i-jan27.html'},
 ]);
});

test('NY Fed calendar day cells yield only the matching GSCPI and SCE events',()=>{
 const events=[...parseReleaseCalendar(nov,'nyfed',{year:2026,month:11,url:novUrl}),
  ...parseReleaseCalendar(dec,'nyfed',{year:2026,month:12,url:decUrl})];
 assert.deepEqual(events.map(e=>[e.id,e.date]),[
  ['nyfed-gscpi','2026-11-05'],['nyfed-sce','2026-11-09'],
  ['nyfed-gscpi','2026-12-04'],['nyfed-sce','2026-12-07'],
 ]);
 assert.equal(events.every(e=>e.source==='nyfed'&&/^https:\/\/www\.newyorkfed\.org/.test(e.sourceUrl)),true);
 assert.throws(()=>parseReleaseCalendar('<td>32 Survey of Consumer Expectations</td>','nyfed',{year:2026,month:11,url:novUrl}),/CALENDAR_EVENTS_EMPTY/);
 assert.throws(()=>parseReleaseCalendar(nov,'nyfed',{year:2026,month:11,url:'https://evil.example/a'}),/CALENDAR_CONTEXT_INVALID/);
});
