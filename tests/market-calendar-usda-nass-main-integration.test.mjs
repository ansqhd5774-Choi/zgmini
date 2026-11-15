import test from 'node:test';
import assert from 'node:assert/strict';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {collectReleaseCalendar} from '../scripts/pc-writer/release-calendar.mjs';
import {RELEASE_CALENDAR_KEY,RELEASE_SOURCES} from '../lib/release-calendar.mjs';
import {NASS_REPORT_SCHEDULE_URL,NASS_OFFICIAL_SOURCE_KEY}
 from '../lib/market-calendar-usda-nass.mjs';

// A deliberately synthetic source fixture. No live USDA request, D1 write,
// provider access, scheduled run, or PC installation in these tests.
const report=(name,year,dates)=>
 '<div class="nass-report-catalogue__report"><h3><a href="https://www.nass.usda.gov/">'+
 name+'</a></h3><details><summary>'+year+' release dates for '+name+
 '</summary><ul class="nass-report-catalogue__dates">'+dates.map(date=>
 '<li><time datetime="'+date+'">Official date</time></li>').join('')+
 '</ul></details></div>';
const html='<html><title>USDA-NASS National Agricultural Statistics Service</title><main>'+
 report('Crop Production',2026,['2026-01-12','2026-11-10','2026-12-10'])+
 report('Crop Progress',2026,['2026-04-06','2026-11-16','2026-11-23'])+
 report('Prospective Plantings',2026,['2026-03-31'])+'</main></html>';
const now=Date.parse('2026-11-15T12:00:00Z');
const forbidden=()=>new Response('source temporarily unavailable',{status:503});
const mock=(calls,{nassStatus=200}={})=>async url=>{
 if(url===NASS_REPORT_SCHEDULE_URL){
  calls.push(url);
  return nassStatus===200?new Response(html,{status:200,
   headers:{'content-type':'text/html; charset=utf-8'}}):forbidden();
 }
 return forbidden();
};

test('main Core collects USDA NASS in same approved source loop and persists official five-field events',async()=>{
 const db=localDatabase(':memory:');
 try{
  await publicFeedStore(db).initialize();
  const calls=[];
  const report=await collectReleaseCalendar(db,{now,fetchImpl:mock(calls)});
  assert.equal(report.providerRequests>0,true);
  assert.deepEqual(calls,[NASS_REPORT_SCHEDULE_URL]);
  assert.equal(report.sources.usda_nass,'READY');
  const stored=await publicFeedStore(db).readOutput(RELEASE_CALENDAR_KEY);
  assert.equal(stored.body.sources.usda_nass.status,'READY');
  assert.equal(stored.body.sources.usda_nass.sourceUrl,NASS_REPORT_SCHEDULE_URL);
  const nass=stored.body.events.filter(e=>e.source===NASS_OFFICIAL_SOURCE_KEY);
  assert.equal(nass.length,7);
  assert.equal(new Set(nass.map(e=>e.id+':'+e.date)).size,nass.length);
  assert.equal(nass.some(e=>e.date==='2026-11-16'&&e.id==='usda-nass-crop-progress'),true);
  for(const event of nass){
   assert.deepEqual(Object.keys(event).sort(),['id','date','title','source','sourceUrl'].sort());
   assert.equal(event.sourceUrl,NASS_REPORT_SCHEDULE_URL);
  }
  const cached=await collectReleaseCalendar(db,{now:now+60000,
   fetchImpl:mock(calls)});
  assert.equal(cached.status,'CACHED');
  assert.equal(calls.length,1);
 }finally{db.close();}
});

test('one failed NASS request retains earlier published official events and reports source failure',async()=>{
 const db=localDatabase(':memory:');
 try{
  await publicFeedStore(db).initialize();
  const calls=[];
  await collectReleaseCalendar(db,{now,fetchImpl:mock(calls)});
  const old=await publicFeedStore(db).readOutput(RELEASE_CALENDAR_KEY);
  const count=old.body.events.filter(e=>e.source===NASS_OFFICIAL_SOURCE_KEY).length;
  const failed=await collectReleaseCalendar(db,{now:now+7*3600000,
   fetchImpl:mock(calls,{nassStatus:503})});
  assert.notEqual(failed.status,'CACHED');
  assert.equal(failed.sources.usda_nass,'SOURCE_FAILED');
  assert.deepEqual(calls,[NASS_REPORT_SCHEDULE_URL,NASS_REPORT_SCHEDULE_URL]);
  const next=await publicFeedStore(db).readOutput(RELEASE_CALENDAR_KEY);
  assert.equal(next.body.sources.usda_nass.status,'SOURCE_FAILED');
  assert.equal(next.body.events.filter(e=>e.source===NASS_OFFICIAL_SOURCE_KEY).length,count);
  assert.equal(next.body.sources.usda_nass.checkedAt,old.body.sources.usda_nass.checkedAt);
 }finally{db.close();}
});

test('new NASS source bypasses the old 13-source six-hour cache exactly once, preserving prior source data',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);
  await store.initialize();
  const legacySources=Object.fromEntries(Object.keys(RELEASE_SOURCES)
   .filter(key=>key!=='usda_nass')
   .map(key=>[key,{status:'READY',checkedAt:new Date(now-3600000).toISOString(),
    ...(key==='bls'?{annualCollectorVersion:1}:{})}]));
  const oldEvent={id:'usda-wasde',date:'2026-11-11',title:'기존 WASDE',
   source:'usda',sourceUrl:'https://www.usda.gov/'};
  await store.writeAttempt(RELEASE_CALENDAR_KEY,now-3600000);
  await store.writeOutput(RELEASE_CALENDAR_KEY,{status:'READY',
   sources:legacySources,events:[oldEvent]},now-3600000);
  const calls=[];
  const report=await collectReleaseCalendar(db,{now,fetchImpl:mock(calls)});
  assert.notEqual(report.status,'CACHED');
  assert.equal(report.sources.usda_nass,'READY');
  assert.equal(calls.length,1);
  const latest=await store.readOutput(RELEASE_CALENDAR_KEY);
  assert.equal(latest.body.events.some(e=>e.id==='usda-wasde'&&e.source==='usda'),true);
  assert.equal(latest.body.events.filter(e=>e.source==='usda_nass').length,7);
  assert.equal((await collectReleaseCalendar(db,{now:now+60000,
   fetchImpl:mock(calls)})).status,'CACHED');
  assert.equal(calls.length,1);
 }finally{db.close();}
});

test('a changed official NASS source URL bypasses only the old six-hour cache then resumes normal caching',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);
  await store.initialize();
  const oldUrl='https://www.nass.usda.gov/Publications/Reports_by_Release_Day/index.php';
  const oldSources=Object.fromEntries(Object.keys(RELEASE_SOURCES).map(source=>[
   source,{status:source==='usda_nass'?'SOURCE_FAILED':'READY',
    checkedAt:source==='usda_nass'?null:new Date(now-3600000).toISOString(),
    sourceUrl:source==='usda_nass'?oldUrl:RELEASE_SOURCES[source].page,
    ...(source==='bls'?{annualCollectorVersion:1}:{})}
  ]));
  await store.writeAttempt(RELEASE_CALENDAR_KEY,now-3600000);
  await store.writeOutput(RELEASE_CALENDAR_KEY,{status:'PARTIAL',
   updatedAt:new Date(now-3600000).toISOString(),sources:oldSources,events:[]},now-3600000);
  const calls=[];
  const restored=await collectReleaseCalendar(db,{now,fetchImpl:mock(calls)});
  assert.notEqual(restored.status,'CACHED');
  assert.equal(restored.sources.usda_nass,'READY');
  assert.deepEqual(calls,[NASS_REPORT_SCHEDULE_URL]);
  const saved=await store.readOutput(RELEASE_CALENDAR_KEY);
  assert.equal(saved.body.sources.usda_nass.sourceUrl,NASS_REPORT_SCHEDULE_URL);
  assert.equal(saved.body.events.filter(e=>e.source==='usda_nass').length,7);
  const next=await collectReleaseCalendar(db,{now:now+60000,fetchImpl:mock(calls)});
  assert.equal(next.status,'CACHED');
  assert.equal(calls.length,1);
 }finally{db.close();}
});
