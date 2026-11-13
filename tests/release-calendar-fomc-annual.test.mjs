import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseFomcAnnualCalendar,parseReleaseCalendar,RELEASE_SOURCES} from '../lib/release-calendar.mjs';
import {collectReleaseCalendar} from '../scripts/pc-writer/release-calendar.mjs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {releaseImportance} from '../lib/market-calendar-importance.mjs';

const meetingDates={
 2026:['2026-01-28','2026-03-18','2026-04-29','2026-06-17','2026-07-29','2026-09-16','2026-10-28','2026-12-09'],
 // Official revision announced 2026-11-12. October is strategy-only;
 // the year's final policy decision meeting moved from December to November.
 // https://www.federalreserve.gov/newsevents/pressreleases/monetary20261112a.htm
 2027:['2027-01-27','2027-03-17','2027-04-28','2027-06-09','2027-07-28','2027-09-15','2027-10-27','2027-11-17'],
};
const names=['January','February','March','April','May','June','July','August','September','October','November','December'];
const annualSection=year=>`<div class="panel panel-default"><div class="panel-heading"><h4><a id="${year}">${year} FOMC Meetings</a></h4></div><div class="panel-body">${meetingDates[year].map((date,index)=>{
 const last=Number(date.slice(-2)),start=last-1;
 return `<div class="${index%2?'fomc-meeting--shaded ':''}row fomc-meeting" "><div class="fomc-meeting__month col-xs-4"><strong>${names[Number(date.slice(5,7))-1]}</strong></div><div class="fomc-meeting__date col-xs-4">${start}-${last}${year===2026&&index===1?'*':''}</div></div>`;
}).join('')}</div><div class="panel-footer">${year===2027?'Note: tentative meeting dates; October 26-27 is dedicated to strategy.':'* Meeting associated with a Summary of Economic Projections.'}</div></div>`;
const officialFixture=`<h1>Meeting calendars</h1>${annualSection(2026)}${annualSection(2027)}<p>Each meeting date is tentative until confirmed at the meeting immediately preceding it.</p>`;

test('Fed annual sections produce exactly eight published meeting dates per year, with no assumed clock',()=>{
 for(const [year,dates] of Object.entries(meetingDates)){
  const events=parseFomcAnnualCalendar(officialFixture,Number(year));
  assert.deepEqual(events.map(event=>event.date),dates);
  assert.ok(events.every(event=>event.id==='fomc'&&event.source==='fed_fomc'&&event.sourceUrl===RELEASE_SOURCES.fed_fomc.url));
  assert.ok(events.every(event=>!Object.hasOwn(event,'at')&&event.title==='FOMC Meeting'));
  assert.deepEqual(parseReleaseCalendar(officialFixture,'fed_fomc',{year:Number(year)}),events);
 }
 assert.equal(releaseImportance('fomc','FOMC Meeting'),3);
});

test('Federal Reserve 2026-11-12 revision ends 2027 meetings in November; October is strategy-only',()=>{
 const events=parseFomcAnnualCalendar(officialFixture,2027);
 assert.equal(events.length,8);
 assert.deepEqual(events.filter(event=>event.date>='2027-10-01').map(event=>event.date),['2027-10-27','2027-11-17']);
 assert.equal(events.some(event=>event.date==='2027-12-08'),false);
 // This validates published meeting dates, not rate-decision classification.
});

test('Fed annual parser rejects unpublished or incomplete year without synthesizing dates',()=>{
 assert.throws(()=>parseFomcAnnualCalendar(officialFixture,2028),/FOMC_YEAR_NOT_PUBLISHED/);
 assert.throws(()=>parseFomcAnnualCalendar(officialFixture.replaceAll('December','Dec'),2027),/FOMC_MEETING_ROW_INVALID/);
 assert.throws(()=>parseFomcAnnualCalendar(officialFixture.replace('7-8</div>','9-8</div>'),2027),/FOMC_MEETING_DATE_INVALID/);
 assert.throws(()=>parseFomcAnnualCalendar(annualSection(2027).replace(/<div class="panel-footer">[\s\S]*$/, ''),2027),/FOMC_SECTION_INCOMPLETE/);
});

test('existing writer stores official raw input once, retains all eight 2027 events after source failure',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-11-09T12:00:00Z');
  let fedRequests=0;
  const fetchImpl=async url=>{
   if(url===RELEASE_SOURCES.fed_fomc.url){fedRequests++;return fedRequests===1?new Response(officialFixture):new Response('unavailable',{status:503});}
   return new Response('unavailable',{status:503});
  };
  const first=await collectReleaseCalendar(db,{now,fetchImpl});
  assert.equal(first.sources.fed_fomc,'READY');
  assert.equal(fedRequests,1,'one official page request covers current and next year');
  assert.equal((await store.readInput('release-calendar:fed_fomc:2026')).body.text,officialFixture);
  const result=(await store.readOutput('release-calendar')).body;
  assert.equal(result.events.filter(event=>event.source==='fed_fomc').length,16);
  assert.ok(result.events.filter(event=>event.source==='fed_fomc'&&event.date.startsWith('2027-')).every(event=>/잠정/.test(event.title)));
  assert.ok(result.events.filter(event=>event.source==='fed_fomc'&&event.date<'2026-11-09').every(event=>!/잠정/.test(event.title)));
  assert.deepEqual(result.sources.fed_fomc.coveredYears,[2026,2027]);
  assert.equal((await collectReleaseCalendar(db,{now:now+60000,fetchImpl})).status,'CACHED');
  assert.equal(fedRequests,1);
  const second=await collectReleaseCalendar(db,{now:now+7*3600000,fetchImpl});
  assert.equal(second.sources.fed_fomc,'SOURCE_FAILED');
  const preserved=(await store.readOutput('release-calendar')).body;
  assert.deepEqual(preserved.events.filter(e=>e.source==='fed_fomc'&&e.date.startsWith('2027-')).map(e=>e.date),meetingDates[2027]);
  assert.equal(fedRequests,2);
 }finally{db.close();}
});

test('calendar client accepts only official Fed FOMC, keeps KST 2026 snapshot clock and three-star importance',()=>{
 const client=readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
 assert.match(client,/item\.source==='fed_fomc'&&item\.id==='fomc'/);
 assert.match(client,/item\.id==='press'\|\|\(item\.id==='fomc'&&!fomcEvent\)/);
 assert.match(client,/fomcEvent&&row\.at&&usDay\(new Date\(row\.at\)\)===item\.date/);
 assert.match(client,/scheduledIds\.has\(`fomc:\$\{usDay\(new Date\(row\.at\)\)\}`\)/);
 assert.match(client,/item\.id==='fomc'&&\/잠정\|tentative\/i/);
 const publishedAt=new Date('2026-10-28T18:00:00Z');
 const dateOf=(timeZone)=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(publishedAt).reduce((parts,p)=>({...parts,[p.type]:p.value}),{});
 const et=dateOf('America/New_York'),kst=dateOf('Asia/Seoul');
 assert.equal(`${et.year}-${et.month}-${et.day}`,'2026-10-28');
 assert.equal(`${kst.year}-${kst.month}-${kst.day}`,'2026-10-29');
});
