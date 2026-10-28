import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {CFTC_COT_URL} from '../staging/market-calendar/r25-cftc/lib/cftc-calendar.mjs';
import {mockCftcHtml} from './fixtures/market-calendar-r25-cftc-html.mjs';

const dependencies={
 '../../lib/release-calendar.mjs':new URL('../staging/market-calendar/r25-cftc/lib/release-calendar.mjs',import.meta.url).href,
 '../../lib/eia-calendar.mjs':new URL('../staging/market-calendar/r23-eia/lib/eia-calendar.mjs',import.meta.url).href,
 '../../lib/usda-calendar.mjs':new URL('../staging/market-calendar/r24-usda/lib/usda-calendar.mjs',import.meta.url).href,
 '../../lib/cftc-calendar.mjs':new URL('../staging/market-calendar/r25-cftc/lib/cftc-calendar.mjs',import.meta.url).href,
 '../../worker/public-feed-store.mjs':new URL('../worker/public-feed-store.mjs',import.meta.url).href,
 '../../worker/market-operational-store.mjs':new URL('../worker/market-operational-store.mjs',import.meta.url).href,
};
let source=fs.readFileSync(new URL('../staging/market-calendar/r25-cftc/scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
for(const [relative,absolute] of Object.entries(dependencies))source=source.replaceAll(`from '${relative}'`,`from '${absolute}'`);
const {collectReleaseCalendar}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

const fetchMock=html=>async url=>{
 if(url===CFTC_COT_URL)return html===null?new Response('unavailable',{status:503}):new Response(html);
 throw Error('UNAVAILABLE_TEST_SOURCE');
};
const existing=date=>({id:'cftc-cot',date,title:'Previously verified CFTC date',source:'cftc',sourceUrl:CFTC_COT_URL});

test('R25 collector saves official raw HTML, re-parses persisted input, and publishes five fields',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const html=mockCftcHtml();let cftcCalls=0;
  const result=await collectReleaseCalendar(db,{now:Date.parse('2026-10-28T12:00:00Z'),fetchImpl:async url=>{
   if(url===CFTC_COT_URL)cftcCalls++;
   return fetchMock(html)(url);
  }});
  assert.equal(result.sources.cftc,'READY');assert.equal(cftcCalls,1);
  assert.equal((await store.readInput('release-calendar:cftc')).body.text,html);
  const output=(await store.readOutput('release-calendar')).body;
  assert.equal(output.sources.cftc.status,'READY');
  assert.deepEqual(output.sources.cftc.coveredYears,['2026']);
  const events=output.events.filter(e=>e.source==='cftc');
  assert.equal(events.length,52);
  assert.ok(events.every(e=>Object.keys(e).sort().join(',')==='date,id,source,sourceUrl,title'));
 }finally{db.close();}
});

test('R25 unavailable official page preserves previously verified dates',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T12:00:00Z'),before=new Date(now-1e7).toISOString(),prior=existing('2026-12-28');
  await store.writeOutput('release-calendar',{sources:{cftc:{status:'READY',checkedAt:before}},events:[prior]},now-1e7);
  const result=await collectReleaseCalendar(db,{now,fetchImpl:fetchMock(null)});
  assert.equal(result.sources.cftc,'SOURCE_FAILED');
  const output=(await store.readOutput('release-calendar')).body;
  assert.deepEqual(output.events.filter(e=>e.source==='cftc'),[prior]);
  assert.equal(output.sources.cftc.checkedAt,before);
 }finally{db.close();}
});

test('R25 keeps older official CFTC years after they drop off the live page',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2027-03-01T12:00:00Z'),prior=existing('2026-10-30');
  await store.writeOutput('release-calendar',{sources:{cftc:{status:'READY'}},events:[prior]},now-1e7);
  const result=await collectReleaseCalendar(db,{now,fetchImpl:fetchMock(mockCftcHtml({year:2027}))});
  assert.equal(result.sources.cftc,'READY');
  const events=(await store.readOutput('release-calendar')).body.events.filter(e=>e.source==='cftc');
  assert.equal(events.length,53);
  assert.ok(events.some(e=>e.date===prior.date&&e.title===prior.title));
  assert.ok(events.some(e=>e.date==='2027-12-28'));
 }finally{db.close();}
});
