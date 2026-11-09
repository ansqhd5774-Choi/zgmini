import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReleaseCalendar} from '../lib/release-calendar.mjs';
import {economicInputCalendarCoverage,modelInputsForCalendarEvent} from '../lib/market-calendar-economic-input-display.mjs';
import {ECONOMIC_CALENDAR_SOURCE_REGISTRY} from '../lib/market-calendar-economic-input-index.mjs';
import {describeOfficialCalendarCoverage} from '../lib/market-calendar-source-links.mjs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {collectReleaseCalendar} from '../scripts/pc-writer/release-calendar.mjs';

// Published dates on the official Census 2027 list, represented as a synthetic
// six-column page. Reference periods are test fixtures, not provider snapshots.
const bfsDates=[
 '2027-01-13','2027-02-10','2027-03-12','2027-04-14','2027-05-12','2027-06-11',
 '2027-07-15','2027-08-11','2027-09-13','2027-10-14','2027-11-10',
];
const m3Dates=[
 '2027-01-07','2027-02-03','2027-03-04','2027-04-02','2027-05-04','2027-06-03',
 '2027-07-02','2027-08-03','2027-09-02','2027-10-04','2027-11-03','2027-12-02',
];
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const displayDate=day=>{
 const [y,m,d]=day.split('-').map(Number);
 return `${months[m-1]} ${d}, ${y}`;
};
const censusRow=(title,day,period)=>
 `<tr><td>${title}</td><td>${displayDate(day)}</td><td>10:00 AM</td><td>${period}</td><td>Final</td><td>Official</td></tr>`;

test('Census 2027 whole-year BFS and M3 dates parse into 23 distinct official releases and 10 model inputs',()=>{
 const rows=[
  ...bfsDates.map((date,i)=>censusRow('Business Formation Statistics',date,`Reference BFS ${i+1}`)),
  ...m3Dates.map((date,i)=>censusRow("Full Report - Manufacturers' Shipments, Inventories and Orders",date,`Reference M3 ${i+1}`)),
 ];
 const html=`<table><thead><tr><th>Release</th><th>Date</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
 const events=parseReleaseCalendar(html,'census');
 assert.equal(events.length,23);
 assert.equal(new Set(events.map(e=>`${e.id}:${e.date}`)).size,23);
 assert.deepEqual([...new Set(events.map(e=>e.date))].sort(),[...bfsDates,...m3Dates].sort());
 const bfs=events.filter(e=>e.id.startsWith('census-business-formation-statistics-'));
 const m3=events.filter(e=>e.id.startsWith('census-full-report-manufacturers-shipments-inventories-and-orders-'));
 assert.equal(bfs.length,11);
 assert.equal(m3.length,12);
 assert.ok(bfs.every(e=>e.source==='census'&&modelInputsForCalendarEvent(e)===3));
 assert.ok(m3.every(e=>e.source==='census'&&modelInputsForCalendarEvent(e)===7));
 const feed={status:'READY',events};
 const display=economicInputCalendarCoverage(feed,{nextYear:2027});
 assert.equal(display.totalInputs,283);
 assert.equal(display.officialEligible,186);
 assert.equal(display.nextYearConfirmed,10);
 const source=describeOfficialCalendarCoverage(ECONOMIC_CALENDAR_SOURCE_REGISTRY,feed,{today:'2027-01-01'});
 assert.equal(source.officialWithStoredEvent,10);
 assert.equal(source.syntheticEventsCreated,0);
});

test('a failed next-year Census refresh retains the previously stored full-year official dates',async()=>{
 const db=localDatabase(':memory:');
 try{
  const now=Date.parse('2026-11-09T12:00:00Z');
  const store=publicFeedStore(db);
  await store.initialize();
  const past2027Html=`<table><tbody>${[
   ...bfsDates.map((date,i)=>censusRow('Business Formation Statistics',date,`BFS ${i}`)),
   ...m3Dates.map((date,i)=>censusRow("Full Report - Manufacturers' Shipments, Inventories and Orders",date,`M3 ${i}`)),
  ].join('')}</tbody></table>`;
  const prior2027=parseReleaseCalendar(past2027Html,'census');
  assert.equal(prior2027.length,23);
  const prior2025=parseReleaseCalendar(
   `<table><tbody>${censusRow('Business Formation Statistics','2025-11-13','October 2025')}</tbody></table>`,'census');
  assert.equal(prior2025.length,1);
  await store.writeOutput('release-calendar',{
   status:'READY',events:[...prior2025,...prior2027],
   sources:{census:{status:'READY',coveredYears:[2026,2027]}},
  },now-3600000);
  const requested=[];
  const fetchImpl=async url=>{
   requested.push(url);
   if(url.includes('calendar-listview-2026.html'))return new Response(
    `<table><tbody>${censusRow('Business Formation Statistics','2026-11-13','October 2026')}</tbody></table>`);
   return new Response('Temporarily unavailable',{status:503});
  };
  await collectReleaseCalendar(db,{now,fetchImpl});
  const stored=(await store.readOutput('release-calendar')).body;
  assert.equal(stored.sources.census.status,'READY');
  assert.deepEqual(stored.sources.census.coveredYears,[2026],
   'preserved older dates are not misreported as freshly fetched 2027 coverage');
  const retained=stored.events.filter(event=>event.source==='census'&&event.date.startsWith('2027-'));
  assert.equal(retained.length,23,'one failed next-year request must not delete already confirmed dates');
  assert.deepEqual(new Set(retained.map(event=>`${event.id}:${event.date}`)),
   new Set(prior2027.map(event=>`${event.id}:${event.date}`)));
  assert.deepEqual(stored.events.filter(event=>event.source==='census'&&event.date.startsWith('2025-')),
   prior2025,'an annual refresh must retain already published historic Census releases');
  assert.equal(requested.filter(url=>url.includes('census.gov')).length,3,
   'one annual 2026 fetch and two official 2027 fallbacks');
 }finally{db.close();}
});
