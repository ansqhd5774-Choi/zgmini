import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {marketOperationalStore} from '../worker/market-operational-store.mjs';
import {parseFedMonthlyCalendar,parseReleaseCalendar,RELEASE_SOURCES}
 from '../staging/market-calendar/r23-eia/lib/release-calendar.mjs';
import {EIA_SOURCE_URLS,parseEiaWpsrCalendarJson}
 from '../staging/market-calendar/r23-eia/lib/eia-calendar.mjs';

const candidate=new URL('../staging/market-calendar/r23-eia/scripts/pc-writer/release-calendar.mjs',import.meta.url);
const dependencies={
 '../../lib/release-calendar.mjs':new URL('../staging/market-calendar/r23-eia/lib/release-calendar.mjs',import.meta.url).href,
 '../../lib/eia-calendar.mjs':new URL('../staging/market-calendar/r23-eia/lib/eia-calendar.mjs',import.meta.url).href,
 '../../worker/public-feed-store.mjs':new URL('../worker/public-feed-store.mjs',import.meta.url).href,
 '../../worker/market-operational-store.mjs':new URL('../worker/market-operational-store.mjs',import.meta.url).href,
};
let code=fs.readFileSync(candidate,'utf8');
for(const [name,url] of Object.entries(dependencies))code=code.replaceAll(`from '${name}'`,`from '${url}'`);
const {collectReleaseCalendar}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

const row=(title,days,note='',time='3:00 p.m.')=>`<div class="row"><div class="panel panel-unstyled"><div class="panel-body"><div class="row">`+
 `<div class="col-xs-2"><p>${time}</p></div>`+
 `<div class="col-xs-7"><p>${title}</p><p>${note}</p></div>`+
 `<div class="col-xs-3"><p>${days}</p></div></div></div></div></div>`;
const section=(title,rows)=>`<div class="row cal-nojs__rowTitle"><h4 class="col-md-12">${title}</h4></div>${rows.join('')}`;
const fedMonth=(month,year,{includeMinutes=false}={})=>`<html><body><div id="article" class='cal-nojs clearfix'>`+
 `<div class="row-title text-center"><h4 class="text-center">${month} ${year}</h4></div>`+
 section('FOMC Meetings',includeMinutes?[
  row('FOMC Meeting','28'),row('FOMC Press Conference','28'),row('FOMC Minutes','7')]:[])+
 section('Beige Book',[row('Beige Book','14')])+
 section('Statistical Releases',[
  row('G.17 - Industrial Production and Capacity Utilization','16'),
  row('G.19 - Consumer Credit','7'),
  row('H.4.1 - Factors Affecting Reserve Balances','1, 8, 15'),
  row('G.20 - Finance Companies','30','Publication date for this release is approximate.'),
 ])+section('Other',[])+`</div></body></html>`;

const censusRow=(title,date,period)=>`<tr><td>${title}</td><td>${date}</td><td>8:30 AM</td><td>${period}</td></tr>`;
const census2026='<table>'+censusRow('Advance Monthly Sales for Retail and Food Services','October 15, 2026','September 2026')+'</table>';
const census2027='<table>'+censusRow('Advance Monthly Sales for Retail and Food Services','January 15, 2027','December 2026')+'</table>';
const ics=(name,day)=>`BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:${day}T123000Z\nSUMMARY:${name}\nEND:VEVENT\nEND:VCALENDAR`;
const wpsrJson=JSON.stringify([
 {data_for_date:'2026-10-23',release_date:'2026-10-28',next_release_date:'2026-11-04',holiday_delayed:false,holiday_name:null,release_time:'10:30',blackout_minutes:15},
 {data_for_date:'2026-11-06',release_date:'2026-11-12',next_release_date:'2026-11-18',holiday_delayed:true,holiday_name:'Veterans Day',release_time:'12:00',blackout_minutes:15},
 {data_for_date:'2026-11-06',release_date:'2026-11-13',next_release_date:'2026-11-18',holiday_delayed:false,holiday_name:null,release_time:'13:50',blackout_minutes:3},
]);
const wpsrSchedule=`<html><h1>Weekly Petroleum Status Report Schedule</h1><table class="basic-table schedule"><tr><th>Data for the week ending</th><th>Alternate release date</th><th>Release day</th><th>Release time</th><th>Holiday</th></tr><tr><th>November 6, 2026</th><td>November 12, 2026</td><td>Thursday</td><td>12:00 p.m.</td><td>Veterans Day</td></tr></table></html>`;
const wngsr=`<html><h1>Weekly Natural Gas Storage Report</h1><h3>Holiday Release Schedule</h3><table class="simpletable"><tr><th>Alternate release date</th><th>Release day</th><th>Release time</th><th>Holiday</th></tr><tr><td>November 13, 2026</td><td>Friday</td><td>10:30 a.m.</td><td>Veterans Day</td></tr></table></html>`;
const steo=`<html><h1>Short-Term Energy Outlook</h1><h1>Schedule</h1><table class="zebra"><thead><tr><th>Issue</th><th>Release date</th><th>Notes</th></tr></thead><tbody><tr><td>November 2026</td><td>11/10/2026</td><td></td></tr><tr><td>January 2027</td><td>01/12/2027</td><td></td></tr></tbody></table></html>`;
const steoNext=`<html><h1>Short-Term Energy Outlook</h1><strong>Next Release Date:</strong> November 10, 2026</html>`;
const makeFetch=overrides=>{
 const calls=[];
 const fetchImpl=async url=>{
  calls.push(url);
  if(url in overrides){const v=overrides[url];if(v===null)return new Response('Unavailable',{status:404});return new Response(v);}
  if(url.includes('bls.gov'))return new Response(ics('Employment Situation','20261106'));
  if(url===EIA_SOURCE_URLS['wpsr-json'])return new Response(wpsrJson);
  if(url===EIA_SOURCE_URLS['wpsr-schedule'])return new Response(wpsrSchedule);
  if(url===EIA_SOURCE_URLS['wngsr-schedule'])return new Response(wngsr);
  if(url===EIA_SOURCE_URLS['steo-schedule'])return new Response(steo);
  if(url===EIA_SOURCE_URLS['steo-next'])return new Response(steoNext);
  if(url.includes('bea.gov'))return new Response(ics('Personal Income and Outlays','20261029'));
  if(url.includes('/releases/g17/'))return new Response('<p><strong>2026:</strong>November 17</p>');
  if(url.includes('/newsevents/')){
   const month=url.match(/2026-(october|november|december)/i)?.[1];
   if(month)return new Response(fedMonth(month[0].toUpperCase()+month.slice(1),'2026',{includeMinutes:true}));
   return new Response('<html><h1>Future calendar not published</h1></html>');
  }
  if(url.includes('calendar-listview-2026'))return new Response(census2026);
  if(url.includes('calendar-listview-2027'))return new Response('<html>No calendar entries</html>');
  if(url.includes('calendar-listview.html'))return new Response(census2027);
  throw Error('UNEXPECTED_URL '+url);
 };
 return {calls,fetchImpl};
};

test('R23 preserves R22 Fed three-column panels, all days, and exclusions',()=>{
 const rows=parseFedMonthlyCalendar(fedMonth('October','2026',{includeMinutes:true}),'2026-10');
 assert.equal(rows.length,7);
 assert.ok(rows.every(r=>r.source==='fed_calendar'));
 assert.ok(rows.some(r=>r.id==='fed-calendar-fomc-minutes'&&r.date==='2026-10-07'));
 assert.ok(rows.some(r=>r.id==='fed-calendar-beige-book'&&r.date==='2026-10-14'));
 assert.equal(rows.filter(r=>r.id.startsWith('fed-calendar-h-4-1')).length,3);
 assert.ok(rows.some(r=>r.title.includes('발표일 잠정')));
 assert.ok(!rows.some(r=>r.id.includes('industrial-production')||r.id==='fed-calendar-fomc-meeting'));
 assert.equal(new Set(rows.map(r=>r.id+':'+r.date)).size,rows.length);
});

test('R23 preserves R22 Fed invalid source and date guards',()=>{
 assert.throws(()=>parseFedMonthlyCalendar(fedMonth('October','2026'),'2027-10'),/HEADING_MISSING/);
 assert.throws(()=>parseFedMonthlyCalendar(fedMonth('October','2026'),'2026-11'),/HEADING_MISSING/);
 assert.throws(()=>parseFedMonthlyCalendar('<html><title>Federal Reserve</title></html>','2026-10'),/HEADING_MISSING/);
 const impossible=fedMonth('October','2026').replace(/<p>7<\/p>/g,'<p>32</p>').replace(/<p>14<\/p>/g,'<p>0</p>')
  .replace(/<p>1, 8, 15<\/p>/g,'<p>99</p>').replace(/<p>30<\/p>/g,'<p>34</p>');
 assert.throws(()=>parseFedMonthlyCalendar(impossible,'2026-10'),/EVENTS_EMPTY/);
});

test('R23 PC collector adds EIA beside existing Fed, Census, BLS, BEA and G.17',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T12:00:00Z'),{calls,fetchImpl}=makeFetch({});
  const result=await collectReleaseCalendar(db,{now,fetchImpl});
  assert.equal(result.status,'READY');
  assert.equal(result.providerRequests,12);
  const output=(await store.readOutput('release-calendar')).body;
  assert.deepEqual(output.sources.fed_calendar.coveredMonths,['2026-10','2026-11','2026-12']);
  assert.ok(output.events.some(e=>e.id==='fed-calendar-g-19-consumer-credit'));
  assert.equal(output.events.filter(e=>e.source==='fed_calendar').length,21);
  assert.equal(output.events.filter(e=>e.source==='fed'&&e.id==='industrial-production').length,1);
  assert.equal(output.events.filter(e=>e.source==='bls'&&e.id==='employment').length,1);
  assert.equal(output.events.filter(e=>e.source==='bea'&&e.id==='pce').length,1);
  assert.deepEqual(output.sources.census.coveredYears,[2026,2027]);
  assert.equal(output.events.filter(e=>e.source==='census'&&e.id==='retail').length,2);
  assert.equal(output.sources.eia.status,'READY');
  assert.deepEqual(output.sources.eia.coveredParts,['wpsr-json','wngsr-schedule','steo-schedule']);
  assert.deepEqual(output.events.filter(e=>e.id==='eia-wpsr').map(e=>e.date),['2026-10-28','2026-11-12']);
  assert.deepEqual(output.events.filter(e=>e.id==='eia-wngsr').map(e=>e.date),['2026-11-13']);
  assert.deepEqual(output.events.filter(e=>e.id==='eia-steo').map(e=>e.date),['2026-11-10','2027-01-12']);
  assert.ok(output.events.every(e=>Object.keys(e).sort().join(',')==='date,id,source,sourceUrl,title'));
  const eiaInput=(await store.readInput('release-calendar:eia:wpsr-json')).body;
  assert.equal(eiaInput.text,wpsrJson);
  assert.equal(eiaInput.sourceUrl,EIA_SOURCE_URLS['wpsr-json']);
  assert.equal(parseEiaWpsrCalendarJson(eiaInput.text).length,2);
  assert.equal((await store.readInput('release-calendar:fed_calendar:2026-11')).body.sourceUrl,
   RELEASE_SOURCES.fed_calendar.url.replace('{year}','2026').replace('{month}','november'));
  assert.equal((await collectReleaseCalendar(db,{now:now+2000,fetchImpl})).status,'CACHED');
  assert.equal(calls.length,12);
 }finally{db.close();}
});

test('R23 preserves R22 partial Fed month fallback',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T12:00:00Z');
  const prior={id:'fed-calendar-g-19-consumer-credit',date:'2026-11-06',title:'prior',source:'fed_calendar',sourceUrl:'https://www.federalreserve.gov/newsevents/calendar.htm'};
  await store.writeOutput('release-calendar',{sources:{fed_calendar:{status:'READY',checkedAt:new Date(now-1e7).toISOString()}},events:[prior]},now-1e7);
  const brokenUrl=RELEASE_SOURCES.fed_calendar.url.replace('{year}','2026').replace('{month}','november');
  const {fetchImpl}=makeFetch({[brokenUrl]:null});
  const result=await collectReleaseCalendar(db,{now,fetchImpl});
  assert.equal(result.status,'READY');
  const saved=(await store.readOutput('release-calendar')).body;
  assert.deepEqual(saved.sources.fed_calendar.missingMonths,['2026-11']);
  assert.ok(saved.events.some(e=>e.date==='2026-11-06'&&e.title==='prior'));
  assert.ok(saved.events.some(e=>e.date==='2026-12-14'&&e.id==='fed-calendar-beige-book'));
 }finally{db.close();}
});

test('R23 retains past official Fed rows when the month horizon advances',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-11-28T12:00:00Z');
  const prior={id:'fed-calendar-fomc-minutes',date:'2026-10-07',title:'FOMC Minutes',
   source:'fed_calendar',sourceUrl:'https://www.federalreserve.gov/newsevents/2026-october.htm?view=calendar'};
  await store.writeOutput('release-calendar',{sources:{fed_calendar:{status:'READY',checkedAt:new Date(now-1e7).toISOString()}},events:[prior]},now-1e7);
  const result=await collectReleaseCalendar(db,{now,fetchImpl:makeFetch({}).fetchImpl});
  assert.equal(result.status,'READY'); // Current month is valid; future January is optional.
  const saved=(await store.readOutput('release-calendar')).body;
  assert.ok(saved.events.some(e=>e.source==='fed_calendar'&&e.id===prior.id&&e.date===prior.date));
  assert.ok(saved.events.some(e=>e.source==='fed_calendar'&&e.date==='2026-11-14'));
  assert.deepEqual(saved.sources.fed_calendar.coveredMonths,['2026-11','2026-12']);
  assert.deepEqual(saved.sources.fed_calendar.missingMonths,['2027-01']);
 }finally{db.close();}
});

test('R23 preserves R22 full Fed failure behavior',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T12:00:00Z');
  const previous={id:'fed-calendar-beige-book',date:'2026-11-25',title:'old',source:'fed_calendar',sourceUrl:'https://www.federalreserve.gov/newsevents/calendar.htm'};
  await store.writeOutput('release-calendar',{sources:{fed_calendar:{status:'READY',checkedAt:new Date(now-1e7).toISOString()}},events:[previous]},now-1e7);
  const fail=Object.fromEntries(['october','november','december'].map(x=>[
   RELEASE_SOURCES.fed_calendar.url.replace('{year}','2026').replace('{month}',x),null]));
  const result=await collectReleaseCalendar(db,{now,fetchImpl:makeFetch(fail).fetchImpl});
  assert.equal(result.status,'PARTIAL');
  const saved=(await store.readOutput('release-calendar')).body;
  assert.equal(saved.sources.fed_calendar.status,'SOURCE_FAILED');
  assert.deepEqual(saved.events.filter(e=>e.source==='fed_calendar'),[previous]);
  assert.equal(saved.sources.bls.status,'READY');
  assert.equal(saved.sources.census.status,'READY');
 }finally{db.close();}
});

test('R23 keeps the Core lease gate and never fetches while another cycle owns it',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T12:00:00Z');
  await marketOperationalStore(db).claim('release-calendar',now);
  assert.deepEqual(await collectReleaseCalendar(db,{now,fetchImpl:()=>{throw Error('FETCH_MUST_NOT_RUN');}}),
   {status:'RUNNING',providerRequests:0});
 }finally{db.close();}
});

test('R23 partial EIA failure preserves previous WPSR future events and other sources',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T12:00:00Z');
  const prior={id:'eia-wpsr',date:'2027-01-06',title:'prior official WPSR',source:'eia',sourceUrl:EIA_SOURCE_URLS['wpsr-json']};
  await store.writeOutput('release-calendar',{sources:{eia:{status:'READY',checkedAt:new Date(now-1e7).toISOString()}},events:[prior]},now-1e7);
  const fail=makeFetch({[EIA_SOURCE_URLS['wpsr-json']]:null});
  const result=await collectReleaseCalendar(db,{now,fetchImpl:fail.fetchImpl});
  assert.equal(result.status,'PARTIAL');
  const saved=(await store.readOutput('release-calendar')).body;
  assert.equal(saved.sources.eia.status,'PARTIAL');
  assert.deepEqual(saved.sources.eia.missingParts,['wpsr-json']);
  assert.ok(saved.events.some(e=>e.id===prior.id&&e.date===prior.date&&e.title===prior.title));
  assert.ok(saved.events.some(e=>e.id==='eia-wpsr'&&e.date==='2026-11-12'));
  assert.equal(saved.sources.bls.status,'READY');
  assert.equal(saved.sources.bea.status,'READY');
  assert.ok(fail.calls.includes(EIA_SOURCE_URLS['wpsr-schedule']));
 }finally{db.close();}
});

test('R23 full EIA source failure cannot erase earlier EIA rows',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T12:00:00Z');
  const prior={id:'eia-steo',date:'2027-02-09',title:'prior official STEO',source:'eia',sourceUrl:EIA_SOURCE_URLS['steo-schedule']};
  await store.writeOutput('release-calendar',{sources:{eia:{status:'READY',checkedAt:new Date(now-1e7).toISOString()}},events:[prior]},now-1e7);
  const failures=Object.fromEntries(Object.values(EIA_SOURCE_URLS).map(url=>[url,null]));
  const result=await collectReleaseCalendar(db,{now,fetchImpl:makeFetch(failures).fetchImpl});
  assert.equal(result.status,'PARTIAL');
  const saved=(await store.readOutput('release-calendar')).body;
  assert.equal(saved.sources.eia.status,'SOURCE_FAILED');
  assert.deepEqual(saved.events.filter(e=>e.source==='eia'),[prior]);
  assert.equal(saved.sources.census.status,'READY');
 }finally{db.close();}
});
