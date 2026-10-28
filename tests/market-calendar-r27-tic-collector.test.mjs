import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {TIC_RELEASE_DATES_URL} from '../staging/market-calendar/r27-tic/lib/tic-calendar.mjs';
import {mockTicHtml} from './fixtures/market-calendar-r27-tic-html.mjs';

const deps={
 '../../lib/release-calendar.mjs':'../staging/market-calendar/r27-tic/lib/release-calendar.mjs',
 '../../lib/eia-calendar.mjs':'../staging/market-calendar/r23-eia/lib/eia-calendar.mjs',
 '../../lib/usda-calendar.mjs':'../staging/market-calendar/r24-usda/lib/usda-calendar.mjs',
 '../../lib/cftc-calendar.mjs':'../staging/market-calendar/r25-cftc/lib/cftc-calendar.mjs',
 '../../lib/treasury-calendar.mjs':'../staging/market-calendar/r26-treasury/lib/treasury-calendar.mjs',
 '../../lib/tic-calendar.mjs':'../staging/market-calendar/r27-tic/lib/tic-calendar.mjs',
 '../../worker/public-feed-store.mjs':'../worker/public-feed-store.mjs',
 '../../worker/market-operational-store.mjs':'../worker/market-operational-store.mjs',
};
let source=fs.readFileSync(new URL('../staging/market-calendar/r27-tic/scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
for(const [relative,target] of Object.entries(deps))
 source=source.replaceAll(`from '${relative}'`,`from '${new URL(target,import.meta.url).href}'`);
const {collectReleaseCalendar}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const mockFetch=(html,handler=()=>{})=>async(url,options)=>{
 if(url!==TIC_RELEASE_DATES_URL)throw Error('OTHER_SOURCE_UNAVAILABLE');
 handler(url,options);
 return html===null?new Response('unavailable',{status:503}):
  new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}});
};

test('R27 saves official HTML before parsing and preserves five-field records',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const html=mockTicHtml();let calls=0;
  const result=await collectReleaseCalendar(db,{now:Date.parse('2026-10-28T06:00:00Z'),
   fetchImpl:mockFetch(html,(_,options)=>{calls++;assert.equal(options.redirect,'error');})});
  assert.equal(result.sources.tic,'READY');assert.equal(calls,1);
  assert.equal((await store.readInput('release-calendar:tic')).body.text,html);
  const output=(await store.readOutput('release-calendar')).body,events=output.events.filter(e=>e.source==='tic');
  assert.equal(events.length,49);
  assert.deepEqual(output.sources.tic.coveredYears,['2026','2027']);
  assert.ok(events.every(e=>Object.keys(e).sort().join(',')==='date,id,source,sourceUrl,title'));
 }finally{db.close();}
});

test('R27 source errors preserve previously observed TIC events without false READY',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T06:00:00Z');
  const old={id:'tic-monthly-2026-11',date:'2026-11-18',title:'Prior release',source:'tic',sourceUrl:TIC_RELEASE_DATES_URL};
  const checkedAt=new Date(now-1e7).toISOString();
  await store.writeOutput('release-calendar',{events:[old],sources:{tic:{status:'READY',checkedAt}}},now-1e7);
  const result=await collectReleaseCalendar(db,{now,fetchImpl:mockFetch(null)});
  assert.equal(result.sources.tic,'SOURCE_FAILED');
  const output=(await store.readOutput('release-calendar')).body;
  assert.deepEqual(output.events.filter(e=>e.source==='tic'),[old]);
  assert.equal(output.sources.tic.checkedAt,checkedAt);
 }finally{db.close();}
});

test('R27 a revised future date supersedes old future, preserves prior history and uncovered years',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-28T06:00:00Z');
  const mk=(id,date)=>({id,date,title:'Prior observed',source:'tic',sourceUrl:TIC_RELEASE_DATES_URL});
  await store.writeOutput('release-calendar',{events:[
   mk('tic-monthly-2026-11','2026-11-17'),mk('tic-monthly-2026-10','2026-10-16'),
   mk('tic-monthly-2025-12','2025-12-15')],sources:{}},now-1e7);
  await collectReleaseCalendar(db,{now,fetchImpl:mockFetch(mockTicHtml())});
  const events=(await store.readOutput('release-calendar')).body.events.filter(e=>e.source==='tic');
  assert.ok(events.some(e=>e.id==='tic-monthly-2026-11'&&e.date==='2026-11-18'));
  assert.ok(!events.some(e=>e.id==='tic-monthly-2026-11'&&e.date==='2026-11-17'));
  assert.ok(events.some(e=>e.id==='tic-monthly-2026-10'&&e.date==='2026-10-16'));
  assert.ok(events.some(e=>e.id==='tic-monthly-2025-12'&&e.date==='2025-12-15'));
 }finally{db.close();}
});
