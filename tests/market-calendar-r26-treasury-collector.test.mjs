import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {TREASURY_CUSIP_XML_URL,TREASURY_AUCTIONS_PAGE} from '../staging/market-calendar/r26-treasury/lib/treasury-calendar.mjs';
import {mockTreasuryXml} from './fixtures/market-calendar-r26-treasury-xml.mjs';

const dependencies={
 '../../lib/release-calendar.mjs':new URL('../staging/market-calendar/r26-treasury/lib/release-calendar.mjs',import.meta.url).href,
 '../../lib/eia-calendar.mjs':new URL('../staging/market-calendar/r23-eia/lib/eia-calendar.mjs',import.meta.url).href,
 '../../lib/usda-calendar.mjs':new URL('../staging/market-calendar/r24-usda/lib/usda-calendar.mjs',import.meta.url).href,
 '../../lib/cftc-calendar.mjs':new URL('../staging/market-calendar/r25-cftc/lib/cftc-calendar.mjs',import.meta.url).href,
 '../../lib/treasury-calendar.mjs':new URL('../staging/market-calendar/r26-treasury/lib/treasury-calendar.mjs',import.meta.url).href,
 '../../worker/public-feed-store.mjs':new URL('../worker/public-feed-store.mjs',import.meta.url).href,
 '../../worker/market-operational-store.mjs':new URL('../worker/market-operational-store.mjs',import.meta.url).href,
};
let source=fs.readFileSync(new URL('../staging/market-calendar/r26-treasury/scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
for(const [relative,absolute] of Object.entries(dependencies))source=source.replaceAll(`from '${relative}'`,`from '${absolute}'`);
const {collectReleaseCalendar}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const fetchMock=xml=>async url=>{
 if(url===TREASURY_CUSIP_XML_URL)return xml===null?new Response('unavailable',{status:503}):new Response(xml);
 throw Error('OTHER_SOURCE_UNAVAILABLE');
};
const oldEvent=(cusip,date)=>({id:`treasury-auction-${cusip}`,date,title:'Prior official auction date',source:'treasury',sourceUrl:TREASURY_AUCTIONS_PAGE});

test('R26 saves official XML first and re-parses stored input, one request',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const xml=mockTreasuryXml();let calls=0;
  const r=await collectReleaseCalendar(db,{now:Date.parse('2026-10-28T06:00:00Z'),fetchImpl:async url=>{
   if(url===TREASURY_CUSIP_XML_URL)calls++;
   return fetchMock(xml)(url);
  }});
  assert.equal(r.sources.treasury,'READY');assert.equal(calls,1);
  assert.equal((await store.readInput('release-calendar:treasury')).body.text,xml);
  const output=(await store.readOutput('release-calendar')).body;
  const events=output.events.filter(e=>e.source==='treasury');
  assert.equal(events.length,2);assert.equal(output.sources.treasury.coveredCusips,1);
  assert.ok(events.every(e=>Object.keys(e).sort().join(',')==='date,id,source,sourceUrl,title'));
 }finally{db.close();}
});

test('R26 source failure retains previously observed Treasury events',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T06:00:00Z'),prior=oldEvent('912797wx1','2026-11-02');
  const checkedAt=new Date(now-1e7).toISOString();
  await store.writeOutput('release-calendar',{events:[prior],sources:{treasury:{status:'READY',checkedAt}}},now-1e7);
  const result=await collectReleaseCalendar(db,{now,fetchImpl:fetchMock(null)});
  assert.equal(result.sources.treasury,'SOURCE_FAILED');
  const output=(await store.readOutput('release-calendar')).body;
  assert.deepEqual(output.events.filter(e=>e.source==='treasury'),[prior]);
  assert.equal(output.sources.treasury.checkedAt,checkedAt);
 }finally{db.close();}
});

test('R26 rolling weekly feed preserves other future CUSIPs and supersedes revised future CUSIP date',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T06:00:00Z');
  const prior=[oldEvent('912797wx1','2026-11-01'),oldEvent('912797xy2','2026-11-03'),oldEvent('912797wx1','2026-10-20')];
  await store.writeOutput('release-calendar',{events:prior,sources:{}},now-1e7);
  await collectReleaseCalendar(db,{now,fetchImpl:fetchMock(mockTreasuryXml())});
  const events=(await store.readOutput('release-calendar')).body.events.filter(e=>e.source==='treasury');
  assert.ok(events.some(e=>e.id==='treasury-auction-912797wx1'&&e.date==='2026-11-02'));
  assert.ok(!events.some(e=>e.id==='treasury-auction-912797wx1'&&e.date==='2026-11-01'));
  assert.ok(events.some(e=>e.id==='treasury-auction-912797xy2'&&e.date==='2026-11-03'));
  assert.ok(events.some(e=>e.id==='treasury-auction-912797wx1'&&e.date==='2026-10-20'));
 }finally{db.close();}
});
