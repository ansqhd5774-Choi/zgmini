import test from 'node:test';
import assert from 'node:assert/strict';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {marketOperationalStore} from '../worker/market-operational-store.mjs';
import {collectReleaseCalendar} from '../scripts/pc-writer/release-calendar.mjs';
test('isolated calendar collection preserves failed-source history, bounds requests and skips repeated cycles',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-10-19T12:00:00Z');
  await store.writeOutput('release-calendar',{events:[{id:'employment',source:'bls',date:'2026-11-06'}],sources:{bls:{status:'READY',checkedAt:new Date(now-3600000).toISOString()}}},now-3600000);
  let calls=0;
  const fetchImpl=async url=>{calls++;
   if(url.includes('bls.gov'))return new Response('Forbidden',{status:403});
   if(url.includes('bea.gov'))return new Response('BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261029T123000Z\nSUMMARY:Personal Income and Outlays\nEND:VEVENT\nEND:VCALENDAR');
   if(url.includes('federalreserve'))return new Response('<p><strong>2026:</strong>November 17</p>');
   return new Response('<tr><td>Advance Monthly Sales for Retail and Food Services</td><td>November 17, 2026</td></tr>');
  };
  const result=await collectReleaseCalendar(db,{now,fetchImpl});assert.equal(result.status,'PARTIAL');assert.equal(calls,4);
  const stored=await store.readOutput('release-calendar');assert.equal(stored.body.sources.bls.status,'SOURCE_FAILED');assert.equal(stored.body.events.filter(e=>e.source==='bls').length,1);assert.equal(stored.body.sources.bea.status,'READY');
  assert.equal((await collectReleaseCalendar(db,{now:now+60000,fetchImpl})).status,'CACHED');assert.equal(calls,4);
  const locks=marketOperationalStore(db);await locks.claim('release-calendar',now+7*3600000);
  assert.equal((await collectReleaseCalendar(db,{now:now+7*3600000,fetchImpl})).status,'RUNNING');assert.equal(calls,4);
 }finally{db.close();}
});
