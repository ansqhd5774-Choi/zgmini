import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBlsAnnualCalendar,parseBlsBedNextRelease} from '../lib/release-calendar.mjs';
import {collectReleaseCalendar} from '../scripts/pc-writer/release-calendar.mjs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';

const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const labels=['Employment Situation','Consumer Price Index','Real Earnings','Producer Price Index','U.S. Import and Export Price Indexes'];
const dateText=(year,month,day)=>{
 const weekday=new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,day)));
 return `${weekday}, ${months[month-1]} ${day}, ${year}`;
};
const row=(year,month,day,title,time='08:30 AM')=>`<tr class="release-list-odd-row"><td class="date-cell"><p>${dateText(year,month,day)}</p></td><td class="time-cell"><p>${time}</p></td><td class="desc-cell"><p><strong>${title}</strong> for December ${year-1}</p></td></tr>`;
function annualPage(year){
 return months.map((_,index)=>{
  const month=index+1,quarterly=index%3===0?'Employment Cost Index':index%3===1?'Productivity and Costs (P)':'Productivity and Costs (R)';
  const entries=[...labels.map((label,i)=>row(year,month,[5,8,8,11,14][i],label)),row(year,month,17,quarterly)];
  entries.push(row(year,month,1,'Federal Holiday',''));
  return `<h1>${months[index]} ${year}</h1><table class="release-list"><thead><tr><th>Date</th><th>Time</th><th>Release</th></tr></thead><tbody>${entries.join('')}</tbody></table>`;
 }).join('');
}
const bedPage='The Business Employment Dynamics news release for Second Quarter 2026 is scheduled to be published on Wednesday, January 27, 2027, at 10:00 a.m. (ET).';
const ics='BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261106T083000\nSUMMARY:Employment Situation\nEND:VEVENT\nEND:VCALENDAR';
const icsWithPartial2027=ics.replace('END:VCALENDAR','BEGIN:VEVENT\nDTSTART:20270105T083000\nSUMMARY:Employment Situation\nEND:VEVENT\nEND:VCALENDAR');

test('one BLS annual HTML request parses twelve months, 72 releases, and no holidays',()=>{
 const events=parseBlsAnnualCalendar(annualPage(2027),2027);
 assert.equal(events.length,72);
 assert.equal(events.filter(e=>e.id==='employment').length,12);
 assert.equal(events.filter(e=>e.id==='cpi').length,12);
 assert.equal(events.filter(e=>e.id==='real-earnings').length,12);
 assert.equal(events.filter(e=>e.id==='productivity').length,8);
 assert.equal(events.filter(e=>e.id==='eci').length,4);
 assert.equal(new Set(events.map(e=>e.date)).size,60);
 assert.ok(events.every(e=>e.source==='bls'&&e.sourceUrl==='https://www.bls.gov/schedule/2027/home.htm'));
});

test('BLS annual page rejects mismatched and partial years before raw storage',()=>{
 assert.throws(()=>parseBlsAnnualCalendar(annualPage(2026),2027),/BLS_ANNUAL_EVENTS_EMPTY/);
 assert.throws(()=>parseBlsAnnualCalendar(annualPage(2027).replace(/<table class="release-list">[\s\S]*?<\/table>/,''),2027),/BLS_ANNUAL_TABLE_COUNT_INVALID/);
 const lastMonth=annualPage(2027).replace(/<h1>December 2027<\/h1><table class="release-list">[\s\S]*?<\/table>/,'<h1>December 2027</h1><table class="release-list"><thead><tr><th>Date</th><th>Time</th><th>Release</th></tr></thead><tbody></tbody></table>');
 assert.throws(()=>parseBlsAnnualCalendar(lastMonth,2027),/BLS_ANNUAL_MONTH_COVERAGE_INCOMPLETE/);
 assert.throws(()=>parseBlsAnnualCalendar('<html>Maintenance</html>',2027),/BLS_ANNUAL_TABLE_COUNT_INVALID/);
});

test('BED official release contributes one distinct 2027 observation',()=>{
 assert.deepEqual(parseBlsBedNextRelease(bedPage),[{id:'bls-business-employment-dynamics',date:'2027-01-27',title:'Business Employment Dynamics',source:'bls',sourceUrl:'https://www.bls.gov/news.release/cewbd.htm'}]);
 assert.throws(()=>parseBlsBedNextRelease('Published results but no next publication announcement'),/BLS_BED_OFFICIAL_DATE_MISSING/);
});

test('existing calendar store combines ICS and year-at-a-time BLS pages without changing schema',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  let annual2027Requests=0;
  const fetchImpl=async url=>{
   if(url==='https://www.bls.gov/schedule/news_release/bls.ics')return new Response(annual2027Requests===0?ics:icsWithPartial2027);
   if(url==='https://www.bls.gov/schedule/2026/home.htm')return new Response(annualPage(2026));
   if(url==='https://www.bls.gov/schedule/2027/home.htm'){
    annual2027Requests++;
    return annual2027Requests===1?new Response(annualPage(2027)):new Response('Temporarily unavailable',{status:503});
   }
   if(url==='https://www.bls.gov/news.release/cewbd.htm')return annual2027Requests===1?new Response(bedPage):new Response('Temporarily unavailable',{status:503});
   return new Response('Unrelated provider unavailable',{status:503});
  };
  const now=Date.parse('2026-11-09T01:00:00Z');
  const first=await collectReleaseCalendar(db,{now,fetchImpl});
  assert.equal(first.sources.bls,'READY');
  const initial=await store.readOutput('release-calendar');
  assert.equal(initial.body.events.filter(e=>e.source==='bls'&&e.date.startsWith('2027-')).length,73);
  assert.equal(new Set(initial.body.events.filter(e=>e.source==='bls'&&e.date.startsWith('2027-')).map(e=>e.date)).size,61);
  assert.deepEqual(initial.body.sources.bls.coveredYears,[2026,2027]);
  assert.equal((await store.readInput('release-calendar:bls:annual:2027')).body.text,annualPage(2027));
  assert.equal(annual2027Requests,1);
  const second=await collectReleaseCalendar(db,{now:now+7*3600000,fetchImpl});
  assert.equal(second.sources.bls,'READY');
  const preserved=await store.readOutput('release-calendar');
  assert.deepEqual(preserved.body.sources.bls.missingYears,[2027]);
  assert.equal(preserved.body.events.filter(e=>e.source==='bls'&&e.date.startsWith('2027-')).length,73);
  assert.equal(preserved.body.events.filter(e=>e.source==='bls'&&e.id==='employment'&&e.date==='2027-01-05').length,1);
  assert.equal(annual2027Requests,2);
 }finally{db.close();}
});
