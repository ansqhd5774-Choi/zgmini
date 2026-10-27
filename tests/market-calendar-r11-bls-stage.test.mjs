import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseReleaseCalendar as stage,recessionReleaseInfo,RELEASE_SOURCES as stageSources} from '../staging/market-calendar/r11-bls/lib/release-calendar.mjs';
import {parseReleaseCalendar as expanded,RELEASE_SOURCES as expandedSources} from '../lib/release-calendar.mjs';

const ics=(items)=>`BEGIN:VCALENDAR\n${items.map(({date,title,status})=>`BEGIN:VEVENT\nDTSTART:${date.replaceAll('-','')}T083000\nSUMMARY:${title}\n${status?`STATUS:${status}\n`:''}END:VEVENT`).join('\n')}\nEND:VCALENDAR`;

test('R11 stage one expands only BLS with exact known IDs, collisions avoided, and cancelled/meta omitted',()=>{
 const text=ics([
  {date:'2026-11-06',title:'Employment Situation'},
  {date:'2026-11-06',title:'Employment Situation of Veterans'},
  {date:'2026-11-06',title:'Consumer Price Index'},
  {date:'2026-11-06',title:'Producer Price Index'},
  {date:'2026-11-06',title:'Job Openings and Labor Turnover Survey'},
  {date:'2026-11-06',title:'BLS.gov Economic News Release Schedule'},
  {date:'2026-11-06',title:'Real Earnings',status:'CANCELLED'},
 ]);
 const rows=stage(text,'bls');
 assert.deepEqual(rows,expanded(text,'bls'));
 assert.equal(rows.length,5);
 assert.deepEqual(rows.map(e=>e.id).sort(),['bls-employment-situation-of-veterans','cpi','employment','jolts','ppi']);
 assert.equal(rows.find(e=>e.id==='employment').sourceUrl,'https://www.bls.gov/schedule/news_release/empsit.htm');
 assert.equal(rows.find(e=>e.id==='cpi').sourceUrl,'https://www.bls.gov/schedule/');
 assert.ok(rows.every(e=>Object.keys(e).sort().join(',')==='date,id,source,sourceUrl,title'));
 const info=recessionReleaseInfo('nfp',{events:rows,sources:{bls:{status:'READY',checkedAt:'2026-10-27T06:00:00Z'}}},'2026-10-27',Date.parse('2026-10-27T07:00:00Z'));
 assert.equal(info.next,'2026-11-06');
});

test('R11 stage one leaves BEA on old GDP/PCE-only behavior',()=>{
 const text=ics([
  {date:'2026-11-15',title:'GDP (Advance Estimate)\\, 3rd Quarter 2026'},
  {date:'2026-11-16',title:'Personal Income and Outlays\\, September 2026'},
  {date:'2026-11-17',title:'GDP by County and Personal Income by County\\, 2025'},
  {date:'2026-11-18',title:'International Trade in Goods and Services'},
 ]);
 const rows=stage(text,'bea');
 assert.deepEqual(rows.map(e=>e.id),['gdp','pce','gdp']);
 assert.ok(rows.every(e=>e.sourceUrl==='https://www.bea.gov/news/schedule'));
 assert.notDeepEqual(rows,expanded(text,'bea'));
});

test('R11 stage one Fed, Census, and source definitions stay unchanged',()=>{
 assert.deepEqual(stageSources,expandedSources);
 const fed='<p><strong>2026:</strong>October 20, November 19</p>';
 const census='<table><tr><td>Advance Monthly Sales for Retail and Food Services</td><td>October 15, 2026</td></tr></table>';
 for(const [source,text] of [['fed',fed],['census',census]])assert.deepEqual(stage(text,source),expanded(text,source));
});

test('R11 stage one source is inert until approved one-file selection',()=>{
 const production=readFileSync(new URL('../scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
 assert.match(production,/from '\.\.\/\.\.\/lib\/release-calendar\.mjs'/);
 assert.doesNotMatch(production,/staging\/market-calendar/);
});
