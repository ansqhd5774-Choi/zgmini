import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseReleaseCalendar,recessionReleaseInfo} from '../lib/release-calendar.mjs';

const makeIcs=items=>`BEGIN:VCALENDAR\n${items.map(({date,title,status=''})=>`BEGIN:VEVENT\nDTSTART;TZID=US-Eastern:${date.replaceAll('-','')}T083000\nSUMMARY:${title}\n${status?`STATUS:${status}\n`:''}END:VEVENT`).join('\n')}\nEND:VCALENDAR`;

test('expanded official BLS events preserve legacy IDs, exclude non-events and never collapse different releases on one date',()=>{
 const ics=makeIcs([
  {date:'2026-11-06',title:'Employment Situation'},
  {date:'2026-11-06',title:'Employment Situation of Veterans'},
  {date:'2026-11-10',title:'Consumer Price Index'},
  {date:'2026-11-10',title:'Producer Price Index'},
  {date:'2026-11-10',title:'Job Openings and Labor Turnover Survey'},
  {date:'2026-11-10',title:'BLS.gov Economic News Release Schedule'},
  {date:'2026-11-10',title:'Real Earnings',status:'CANCELLED'},
 ]);
 const events=parseReleaseCalendar(ics,'bls');
 assert.equal(events.length,5);
 assert.deepEqual(events.map(e=>e.id).sort(),['bls-employment-situation-of-veterans','cpi','employment','jolts','ppi']);
 assert.equal(events.find(e=>e.id==='employment')?.sourceUrl,'https://www.bls.gov/schedule/news_release/empsit.htm');
 assert.equal(events.find(e=>e.id==='cpi')?.sourceUrl,'https://www.bls.gov/schedule/');
 assert.ok(events.every(e=>Object.keys(e).sort().join(',')==='date,id,source,sourceUrl,title'));
 const info=recessionReleaseInfo('nfp',{events,sources:{bls:{status:'READY',checkedAt:'2026-10-26T10:00:00.000Z'}}},'2026-10-27',Date.parse('2026-10-26T11:00:00Z'));
 assert.equal(info.next,'2026-11-06');
});

test('BEA releases retain GDP and PCE IDs while distinct publications get distinct event IDs',()=>{
 const ics=makeIcs([
  {date:'2026-10-29',title:'GDP (Advance Estimate)\\, 3rd Quarter 2026'},
  {date:'2026-10-29',title:'Personal Income and Outlays\\, September 2026'},
  {date:'2026-10-29',title:'GDP by County and Personal Income by County\\, 2025'},
 ]);
 const events=parseReleaseCalendar(ics,'bea');
 assert.deepEqual(events.map(e=>e.id).sort(),['bea-gdp-by-county-and-personal-income-by-county-2025','gdp','pce']);
 assert.ok(events.every(e=>e.sourceUrl==='https://www.bea.gov/news/schedule'));
});

test('R8 stored-PC mismatches are corrections of legacy classification, not lost release dates',()=>{
 const b=parseReleaseCalendar(makeIcs([
  {date:'2025-03-20',title:'Employment Situation of Veterans'},
  {date:'2026-04-28',title:'Employment Situation of Veterans'},
 ]),'bls');
 const e=parseReleaseCalendar(makeIcs([
  {date:'2026-12-02',title:'GDP by County and Personal Income by County\\, 2025'},
 ]),'bea');
 const events=[...b,...e];
 assert.deepEqual(events.map(({source,id,date,title})=>({source,id,date,title})),[
  {source:'bls',id:'bls-employment-situation-of-veterans',date:'2025-03-20',title:'Employment Situation of Veterans'},
  {source:'bls',id:'bls-employment-situation-of-veterans',date:'2026-04-28',title:'Employment Situation of Veterans'},
  {source:'bea',id:'bea-gdp-by-county-and-personal-income-by-county-2025',date:'2026-12-02',title:'GDP by County and Personal Income by County, 2025'},
 ]);
 assert.ok(events.every(item=>item.id!=='employment'&&item.id!=='gdp'));
});

test('market calendar shows the expanded official titles through its existing stored feed without placeholder earnings',()=>{
 const client=readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
 const page=readFileSync(new URL('../app/market-calendar/page.tsx',import.meta.url),'utf8');
 assert.match(client,/fetch\('\/api\/release-calendar'/);
 assert.match(client,/ppi:\{category:'물가'/);
 assert.match(client,/jolts:\{category:'고용'/);
 assert.match(client,/item\.source==='bls'/);
 assert.match(client,/name:item\.title/);
 assert.match(client,/setKind\(key\)/);
 assert.match(page,/미국 현지 발표일/);
 assert.doesNotMatch(client,/lib\/fomc-schedule|mock|demoEvents/);
});
