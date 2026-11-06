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
   if(url.includes('eia.gov'))return new Response('<h1>Electric Power Monthly</h1><p>Next Release Date: November 24, 2026</p>');
   if(url.includes('newyorkfed.org'))return new Response(url.includes('i-nov26')
    ?'<h2>November 2026</h2><td>05 <a>Global Supply Chain Pressure Index (GSCPI)</a></td><td>09 <a>Survey of Consumer Expectations</a></td>'
    :'<h2>October 2026</h2><td>22 <a>Global Supply Chain Pressure Index (GSCPI)</a></td><td>23 <a>Survey of Consumer Expectations</a></td>');
   return new Response('<tr><td>Advance Monthly Sales for Retail and Food Services</td><td>November 17, 2026</td></tr>');
  };
  const result=await collectReleaseCalendar(db,{now,fetchImpl});assert.equal(result.status,'PARTIAL');assert.equal(calls,7);
  const stored=await store.readOutput('release-calendar');assert.equal(stored.body.sources.bls.status,'SOURCE_FAILED');assert.equal(stored.body.events.filter(e=>e.source==='bls').length,1);assert.equal(stored.body.sources.bea.status,'READY');
  assert.equal(stored.body.sources.eia_epm.status,'READY');assert.equal(stored.body.sources.nyfed.status,'READY');
  assert.equal(stored.body.events.some(e=>e.id==='eia-epm'&&e.date==='2026-11-24'),true);
  assert.equal(stored.body.events.some(e=>e.id==='nyfed-sce'&&e.date==='2026-11-09'),true);
  assert.equal((await collectReleaseCalendar(db,{now:now+60000,fetchImpl})).status,'CACHED');assert.equal(calls,7);
  const locks=marketOperationalStore(db);await locks.claim('release-calendar',now+7*3600000);
  assert.equal((await collectReleaseCalendar(db,{now:now+7*3600000,fetchImpl})).status,'RUNNING');assert.equal(calls,7);
 }finally{db.close();}
});

test('NY Fed next-month fetch failure keeps current official events and prior verified next-month dates',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-11-05T11:00:00Z');
  const decemberUrl='https://www.newyorkfed.org/research/calendars/i-dec26.html';
  await store.writeOutput('release-calendar',{
   sources:{nyfed:{status:'READY',checkedAt:new Date(now-3600000).toISOString()}},
   events:[{id:'nyfed-gscpi',date:'2026-12-04',title:'Global Supply Chain Pressure Index',source:'nyfed',sourceUrl:decemberUrl}],
  },now-3600000);
  let calls=0;
  const fetchImpl=async url=>{
   calls++;
   if(url.includes('i-dec26.html'))return new Response('Unavailable',{status:503});
   if(url.includes('i-nov26.html'))return new Response('<h2>November 2026</h2><td>05 <a>Global Supply Chain Pressure Index (GSCPI)</a></td><td>09 <a>Survey of Consumer Expectations</a></td>');
   if(url.includes('eia.gov'))return new Response('<h1>Electric Power Monthly</h1><p>Next Release Date: November 24, 2026</p>');
   if(url.includes('bls.gov')||url.includes('bea.gov'))return new Response('BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261124T123000Z\nSUMMARY:Personal Income and Outlays\nEND:VEVENT\nEND:VCALENDAR');
   if(url.includes('federalreserve'))return new Response('<p><strong>2026:</strong>November 17</p>');
   return new Response('<tr><td>Advance Monthly Sales for Retail and Food Services</td><td>November 17, 2026</td></tr>');
  };
  const result=await collectReleaseCalendar(db,{now,fetchImpl});
  assert.equal(result.status,'PARTIAL');assert.equal(calls,7);
  const output=(await store.readOutput('release-calendar')).body;
  assert.equal(output.sources.nyfed.status,'SOURCE_FAILED');assert.equal(output.sources.nyfed.partial,true);
  assert.equal(output.sources.nyfed.checkedAt,new Date(now-3600000).toISOString());
  assert.equal(output.events.some(e=>e.source==='nyfed'&&e.id==='nyfed-gscpi'&&e.date==='2026-11-05'),true);
  assert.equal(output.events.some(e=>e.source==='nyfed'&&e.id==='nyfed-gscpi'&&e.date==='2026-12-04'),true);
  assert.equal(output.events.some(e=>e.source==='eia_epm'&&e.id==='eia-epm'),true);
 }finally{db.close();}
});

test('valid NYFed months without target releases remain READY instead of SOURCE_FAILED',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const now=Date.parse('2026-11-05T11:00:00Z');
  const fetchImpl=async url=>{
   if(url.includes('i-nov26.html'))return new Response('<h2>November 2026</h2><table><td>16 <a>SCE Credit Access Survey</a></td></table>');
   if(url.includes('i-dec26.html'))return new Response('<h2>December 2026</h2><table><td>15 <a>Regional Economic Data</a></td></table>');
   if(url.includes('eia.gov'))return new Response('<h1>Electric Power Monthly</h1><p>Next Release Date: November 24, 2026</p>');
   if(url.includes('bls.gov')||url.includes('bea.gov'))return new Response('BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261124T123000Z\nSUMMARY:Personal Income and Outlays\nEND:VEVENT\nEND:VCALENDAR');
   if(url.includes('federalreserve'))return new Response('<p><strong>2026:</strong>November 17</p>');
   return new Response('<tr><td>Advance Monthly Sales for Retail and Food Services</td><td>November 17, 2026</td></tr>');
  };
  await collectReleaseCalendar(db,{now,fetchImpl});
  const result=(await store.readOutput('release-calendar')).body;
  assert.equal(result.sources.nyfed.status,'READY');
  assert.deepEqual(result.events.filter(e=>e.source==='nyfed'),[]);
 }finally{db.close();}
});
