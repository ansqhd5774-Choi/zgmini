import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {marketOperationalStore} from '../worker/market-operational-store.mjs';
import {parseReleaseCalendar,RELEASE_SOURCES} from '../staging/market-calendar/r20-census/lib/release-calendar.mjs';

const candidate=new URL('../staging/market-calendar/r21-census-year/scripts/pc-writer/release-calendar.mjs',import.meta.url);
const sources={
 '../../lib/release-calendar.mjs':new URL('../staging/market-calendar/r20-census/lib/release-calendar.mjs',import.meta.url).href,
 '../../worker/public-feed-store.mjs':new URL('../worker/public-feed-store.mjs',import.meta.url).href,
 '../../worker/market-operational-store.mjs':new URL('../worker/market-operational-store.mjs',import.meta.url).href,
};
let code=fs.readFileSync(candidate,'utf8');
for(const [relative,full] of Object.entries(sources))code=code.replaceAll(`from '${relative}'`,`from '${full}'`);
const {collectReleaseCalendar}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

const row=(title,date,period,code)=>`<tr height="20"><td height="20"><a href="/retail">${title}</a></td><td sorttable_customkey="${code}">${date}</td><td>8:30 AM</td><td>${period}</td><td class="hiden">A${code}</td><td class="hiden">A202609</td></tr>`;
const census2026='<table>'+row('Advance Monthly Sales for Retail and Food Services','October 15, 2026','September 2026','202610150830')+
 row('New Residential Construction (Building Permits, Housing Starts, and Housing Completions)','October 20, 2026','September 2026','202610200830')+'</table>';
const census2027='<table>'+row('Construction Spending (Construction Put in Place)','January 4, 2027','November 2026','202701041000')+
 row('Advance Monthly Sales for Retail and Food Services','January 15, 2027','December 2026','202701150830')+'</table>';
const noCalendar='<html><title>U.S. Census Bureau Economic Indicators</title><p>Economic Indicators</p></html>';
const ics=(summary,date)=>`BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:${date}T123000Z\nSUMMARY:${summary}\nEND:VEVENT\nEND:VCALENDAR`;

const makeFetch=census=>{
 const calls=[];
 const fetchImpl=async url=>{
  calls.push(url);
  if(url.includes('bls.gov'))return new Response(ics('Employment Situation','20261106'));
  if(url.includes('bea.gov'))return new Response(ics('Personal Income and Outlays','20261029'));
  if(url.includes('federalreserve'))return new Response('<p><strong>2026:</strong>November 17</p>');
  return new Response(census[url]??noCalendar);
 };
 return {calls,fetchImpl};
};

test('R21 keeps 2026 Census and fetches valid 2027 from official generic fallback',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-27T12:00:00Z');
  const {calls,fetchImpl}=makeFetch({
   [RELEASE_SOURCES.census.url.replace('{year}','2026')]:census2026,
   [RELEASE_SOURCES.census.url.replace('{year}','2027')]:noCalendar,
   [RELEASE_SOURCES.census.page]:census2027,
  });
  const result=await collectReleaseCalendar(db,{now,fetchImpl});
  assert.equal(result.status,'READY');assert.equal(result.providerRequests,6);
  assert.equal(calls.length,6);
  const saved=(await store.readOutput('release-calendar')).body;
  assert.deepEqual(saved.sources.census.coveredYears,[2026,2027]);
  const census=saved.events.filter(e=>e.source==='census');
  assert.equal(census.length,4);
  assert.equal(census.filter(e=>e.id==='retail').length,2);
  assert.ok(census.some(e=>e.date==='2027-01-04'&&e.id.startsWith('census-construction-spending')));
  assert.equal((await store.readInput('release-calendar:census')).body.sourceUrl,RELEASE_SOURCES.census.url.replace('{year}','2026'));
  assert.equal((await store.readInput('release-calendar:census:2027')).body.sourceUrl,RELEASE_SOURCES.census.page);
  assert.equal((await collectReleaseCalendar(db,{now:now+60000,fetchImpl})).status,'CACHED');
  assert.equal(calls.length,6);
  assert.deepEqual(saved.events.filter(e=>e.source==='bls'),parseReleaseCalendar(ics('Employment Situation','20261106'),'bls'));
  assert.deepEqual(saved.events.filter(e=>e.source==='bea'),parseReleaseCalendar(ics('Personal Income and Outlays','20261029'),'bea'));
  assert.deepEqual(saved.events.filter(e=>e.source==='fed'),parseReleaseCalendar('<p><strong>2026:</strong>November 17</p>','fed'));
 }finally{db.close();}
});

test('R21 2027 rollover accepts generic 2027 but never relabels it as 2028',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2027-01-02T12:00:00Z');
  const {calls,fetchImpl}=makeFetch({
   [RELEASE_SOURCES.census.url.replace('{year}','2027')]:noCalendar,
   [RELEASE_SOURCES.census.url.replace('{year}','2028')]:noCalendar,
   [RELEASE_SOURCES.census.page]:census2027,
  });
  const result=await collectReleaseCalendar(db,{now,fetchImpl});
  assert.equal(result.status,'READY');assert.equal(result.providerRequests,7);assert.equal(calls.length,7);
  const saved=(await store.readOutput('release-calendar')).body;
  assert.deepEqual(saved.sources.census.coveredYears,[2027]);
  assert.deepEqual(saved.events.filter(e=>e.source==='census').map(e=>e.date),['2027-01-04','2027-01-15']);
  assert.equal(await store.readInput('release-calendar:census:2028'),null);
 }finally{db.close();}
});

test('R21 preserves previously published Census rows on total current-year failure',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-27T12:00:00Z');
  await store.writeOutput('release-calendar',{events:[{id:'retail',source:'census',title:'prior',date:'2026-11-17'}],
   sources:{census:{status:'READY',checkedAt:new Date(now-3600000).toISOString()}}},now-3600000);
  await store.writeInput('release-calendar:census',{text:census2026,sourceUrl:'old'},now-3600000);
  const {calls,fetchImpl}=makeFetch({});
  const result=await collectReleaseCalendar(db,{now,fetchImpl});
  assert.equal(result.status,'PARTIAL');assert.equal(result.providerRequests,5);assert.equal(calls.length,5);
  const saved=(await store.readOutput('release-calendar')).body;
  assert.equal(saved.sources.census.status,'SOURCE_FAILED');
  assert.deepEqual(saved.events.filter(e=>e.source==='census'),[{id:'retail',source:'census',title:'prior',date:'2026-11-17'}]);
  assert.equal((await store.readInput('release-calendar:census')).body.sourceUrl,'old');
 }finally{db.close();}
});

test('R21 preserves the existing lease gate and does not fetch while running',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-27T12:00:00Z');
  const locks=marketOperationalStore(db);
  await locks.claim('release-calendar',now);
  const got=await collectReleaseCalendar(db,{now,fetchImpl:()=>{throw Error('FETCH_SHOULD_NOT_RUN');}});
  assert.deepEqual(got,{status:'RUNNING',providerRequests:0});
 }finally{db.close();}
});
