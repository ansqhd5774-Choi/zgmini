import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {RELEASE_SOURCES} from '../staging/market-calendar/r24-usda/lib/release-calendar.mjs';
import {USDA_WASDE_URL,parseUsdaWasdeHtml} from '../staging/market-calendar/r24-usda/lib/usda-calendar.mjs';

const dependencies={
 '../../lib/release-calendar.mjs':new URL('../staging/market-calendar/r24-usda/lib/release-calendar.mjs',import.meta.url).href,
 '../../lib/eia-calendar.mjs':new URL('../staging/market-calendar/r23-eia/lib/eia-calendar.mjs',import.meta.url).href,
 '../../lib/usda-calendar.mjs':new URL('../staging/market-calendar/r24-usda/lib/usda-calendar.mjs',import.meta.url).href,
 '../../worker/public-feed-store.mjs':new URL('../worker/public-feed-store.mjs',import.meta.url).href,
 '../../worker/market-operational-store.mjs':new URL('../worker/market-operational-store.mjs',import.meta.url).href,
};
let collector=fs.readFileSync(new URL('../staging/market-calendar/r24-usda/scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
for(const [key,url] of Object.entries(dependencies))collector=collector.replaceAll(`from '${key}'`,`from '${url}'`);
const {collectReleaseCalendar}=await import('data:text/javascript;base64,'+Buffer.from(collector).toString('base64'));

const schedule='Jan. 12, Feb. 10, Mar. 10, Apr. 9, May 12, Jun. 11, Jul. 10, Aug. 12, Sep. 11, Oct. 9, Nov. 10, and Dec. 10.';
const html=({missing2026=false}={})=>'<html><head><title>WASDE Report | USDA</title></head><body><h1>WASDE Report</h1>'+
 (missing2026?'':`<h4>2026 WASDE Release Dates (12:00pm ET)</h4>In 2026 the WASDE report will be released on ${schedule}`)+
 `<h4>2027 WASDE Release Dates (12:00pm ET)</h4>In 2027 the WASDE report will be released on ${schedule}</body></html>`;
const makeFetch=(usda)=>async url=>{
 if(url===USDA_WASDE_URL)return usda===null?new Response('unavailable',{status:503}):new Response(usda);
 throw Error('UNAVAILABLE_TEST_SOURCE');
};
const prior=(date)=>({id:'usda-wasde',date,title:'Prior official WASDE',source:'usda',sourceUrl:USDA_WASDE_URL});

test('R24 collector writes exact official USDA raw HTML before parsing events',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T11:00:00Z');
  const calls=[];
  const actual=html();
  const result=await collectReleaseCalendar(db,{now,fetchImpl:async url=>{
   calls.push(url);return makeFetch(actual)(url);
  }});
  assert.equal(result.sources.usda,'READY');
  assert.equal(calls.filter(u=>u===USDA_WASDE_URL).length,1);
  const output=(await store.readOutput('release-calendar')).body;
  assert.equal(output.sources.usda.status,'READY');
  assert.deepEqual(output.sources.usda.coveredYears,['2026','2027']);
  const official=output.events.filter(e=>e.source==='usda');
  assert.equal(official.length,24);
  assert.deepEqual(official.filter(e=>e.date>='2026-10-28').map(e=>e.date).slice(0,3),['2026-11-10','2026-12-10','2027-01-12']);
  assert.ok(official.every(e=>Object.keys(e).sort().join(',')==='date,id,source,sourceUrl,title'));
  assert.equal((await store.readInput('release-calendar:usda')).body.text,actual);
  assert.equal(parseUsdaWasdeHtml(actual).length,24);
  assert.ok(RELEASE_SOURCES.eia.url.includes('eia.gov'));
 }finally{db.close();}
});

test('R24 source failure preserves prior official USDA dates and isolates other sources',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T11:00:00Z'),record=prior('2027-12-10');
  await store.writeOutput('release-calendar',{sources:{usda:{status:'READY',checkedAt:new Date(now-1e7).toISOString()}},events:[record]},now-1e7);
  const result=await collectReleaseCalendar(db,{now,fetchImpl:makeFetch(null)});
  assert.equal(result.sources.usda,'SOURCE_FAILED');
  const saved=(await store.readOutput('release-calendar')).body;
  assert.deepEqual(saved.events.filter(e=>e.source==='usda'),[record]);
  assert.equal(saved.sources.usda.checkedAt,new Date(now-1e7).toISOString());
 }finally{db.close();}
});

test('R24 keeps older USDA observations even if official site removes an expired year',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2027-01-15T11:00:00Z'),record=prior('2026-11-10');
  await store.writeOutput('release-calendar',{sources:{usda:{status:'READY'}},events:[record]},now-1e7);
  const result=await collectReleaseCalendar(db,{now,fetchImpl:makeFetch(html({missing2026:true}))});
  assert.equal(result.sources.usda,'READY');
  const events=(await store.readOutput('release-calendar')).body.events.filter(e=>e.source==='usda');
  assert.equal(events.length,13);
  assert.ok(events.some(e=>e.date===record.date&&e.title===record.title));
  assert.ok(events.some(e=>e.date==='2027-12-10'));
 }finally{db.close();}
});
