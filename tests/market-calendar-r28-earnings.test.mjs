import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {EARNINGS_SOURCES,parseIssuerEarnings,validateEarningsSource} from '../staging/market-calendar/r28-earnings/lib/earnings-calendar.mjs';

const source={
 url:'https://investor.example.com/earnings.ics',page:'https://investor.example.com/events',
 format:'ics',ticker:'EXMP',cik:'12345',company:'Example Corporation',timeZone:'America/Los_Angeles',
 rights:{automatedFetch:true,storage:true,commercialUse:true,redistribution:true,
  evidenceUrl:'https://investor.example.com/license',reviewedAt:'2026-10-28',
  evidenceNote:'TEST FIXTURE ONLY, NOT A LIVE RIGHTS VERIFICATION'},
};
const fixture=(date='20261102',status='CONFIRMED')=>`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Example Corporation FY2026 Q4 Earnings Call\nDTSTART;TZID=America/Los_Angeles:${date}T140000\nSTATUS:${status}\nURL:https://investor.example.com/events/q4\nEND:VEVENT\nEND:VCALENDAR`;
const deps={
 '../../lib/release-calendar.mjs':'../staging/market-calendar/r28-earnings/lib/release-calendar.mjs',
 '../../lib/eia-calendar.mjs':'../staging/market-calendar/r23-eia/lib/eia-calendar.mjs',
 '../../lib/usda-calendar.mjs':'../staging/market-calendar/r24-usda/lib/usda-calendar.mjs',
 '../../lib/cftc-calendar.mjs':'../staging/market-calendar/r25-cftc/lib/cftc-calendar.mjs',
 '../../lib/treasury-calendar.mjs':'../staging/market-calendar/r26-treasury/lib/treasury-calendar.mjs',
 '../../lib/tic-calendar.mjs':'../staging/market-calendar/r27-tic/lib/tic-calendar.mjs',
 '../../lib/earnings-calendar.mjs':'../staging/market-calendar/r28-earnings/lib/earnings-calendar.mjs',
 '../../worker/public-feed-store.mjs':'../worker/public-feed-store.mjs',
 '../../worker/market-operational-store.mjs':'../worker/market-operational-store.mjs',
};
let collectorSource=fs.readFileSync(new URL('../staging/market-calendar/r28-earnings/scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
for(const [relative,target] of Object.entries(deps))
 collectorSource=collectorSource.replaceAll(`from '${relative}'`,`from '${new URL(target,import.meta.url).href}'`);
const {collectReleaseCalendar}=await import('data:text/javascript;base64,'+Buffer.from(collectorSource).toString('base64'));
const today=Date.parse('2026-10-28T06:00:00Z');
const fetchFixture=(responseBody)=>async(url)=>{
 if(url!==source.url)throw Error('OTHER_SOURCE_UNAVAILABLE');
 if(responseBody===null)return new Response('temporary outage',{status:503});
 return new Response(responseBody,{headers:{'content-type':'text/calendar'}});
};

test('R28 no issuer enabled: zero live earnings provider calls and no manual fixtures',()=>{
 assert.deepEqual(EARNINGS_SOURCES,[]);
});

test('R28 requires explicitly documented all-four rights and safe HTTPS issuer URLs',()=>{
 assert.equal(validateEarningsSource(source),source);
 for(const field of ['automatedFetch','storage','commercialUse','redistribution'])
  assert.throws(()=>validateEarningsSource({...source,rights:{...source.rights,[field]:false}}),/NOT_APPROVED/);
 assert.throws(()=>validateEarningsSource({...source,url:'http://investor.example.com/events'}),/NOT_APPROVED/);
 assert.throws(()=>validateEarningsSource({...source,url:'https://127.0.0.1/earnings'}),/NOT_APPROVED/);
 assert.throws(()=>validateEarningsSource({...source,rights:{...source.rights,evidenceNote:''}}),/NOT_APPROVED/);
});

test('R28 official issuer ICS yields only confirmed dated earnings with stable five fields',()=>{
 const parsed=parseIssuerEarnings(fixture(),source);
 assert.equal(parsed.events.length,1);
 assert.deepEqual(parsed.cancelledIds,[]);
 assert.deepEqual(parsed.events[0],{
  id:'earnings-call-cik0000012345-2026-q4',date:'2026-11-02',
  title:'Example Corporation · FY2026 Q4 실적 설명회',source:'earnings',
  sourceUrl:'https://investor.example.com/events/q4',
 });
 assert.deepEqual(parseIssuerEarnings(fixture('20261102','TENTATIVE'),source).events,[]);
 const cancelled=parseIssuerEarnings(fixture('20261102','CANCELLED'),source);
 assert.deepEqual(cancelled.events,[]);
 assert.deepEqual(cancelled.cancelledIds,['earnings-call-cik0000012345-2026-q4']);
});

test('R28 UTC calendar time becomes official issuer-local date, without fabricated hour',()=>{
 const ics=fixture().replace('TZID=America/Los_Angeles:20261102T140000',':20261103T010000Z');
 const parsed=parseIssuerEarnings(ics,source);
 assert.equal(parsed.events[0].date,'2026-11-02');
 assert.deepEqual(Object.keys(parsed.events[0]).sort(),['date','id','source','sourceUrl','title']);
 assert.throws(()=>parseIssuerEarnings(fixture().replace('America/Los_Angeles','America/New_York'),source),/TIMEZONE_CHANGED/);
});

test('R28 excludes unproven/estimated events, malformed periods and non-issuer URLs',()=>{
 const withoutQuarter=fixture().replace('FY2026 Q4','results');
 assert.deepEqual(parseIssuerEarnings(withoutQuarter,source).events,[]);
 assert.throws(()=>parseIssuerEarnings(fixture('20260230'),source),/DATE_INVALID/);
 assert.throws(()=>parseIssuerEarnings(fixture().replace('https://investor.example.com/events/q4','https://random.example.net/event'),source),/OUTSIDE_ISSUER/);
 assert.throws(()=>parseIssuerEarnings('BEGIN:VCALENDAR',source),/ICS_INVALID/);
});

test('R28 explicit issuer JSON does not treat public notice date or estimate as confirmed date',()=>{
 const jsonSpec={...source,format:'json'};
 const events=[
  {kind:'earnings_release',date:'2026-11-05',fiscalYear:2026,quarter:4,
   title:'Results',status:'confirmed',sourceUrl:source.page,publishedAt:'2026-10-01'},
  {kind:'earnings_call',date:'2026-11-06',fiscalYear:2026,quarter:4,title:'Estimated',status:'estimated'},
 ];
 const parsed=parseIssuerEarnings(JSON.stringify({events}),jsonSpec);
 assert.deepEqual(parsed.events.map(x=>[x.id,x.date]),[['earnings-release-cik0000012345-2026-q4','2026-11-05']]);
});

test('R28 PC cycle stores source input before output, revisions replace same quarter date',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const first=await collectReleaseCalendar(db,{now:today,earningsSources:[source],fetchImpl:fetchFixture(fixture())});
  assert.equal(first.sources.earnings,'READY');
  assert.equal((await store.readInput('release-calendar:earnings:cik0000012345')).body.text,fixture());
  const original=(await store.readOutput('release-calendar')).body.events.filter(e=>e.source==='earnings');
  assert.equal(original.length,1);
  assert.equal(original[0].date,'2026-11-02');
  let cachedCalls=0;
  const cached=await collectReleaseCalendar(db,{now:today+3600000,earningsSources:[source],fetchImpl:async()=>{
   cachedCalls++;throw Error('RETRY_NOT_ALLOWED');
  }});
  assert.equal(cached.status,'CACHED');
  assert.equal(cachedCalls,0);
  const next=await collectReleaseCalendar(db,{now:today+7*3600000,earningsSources:[source],
   fetchImpl:fetchFixture(fixture('20261104'))});
  assert.equal(next.sources.earnings,'READY');
  const updated=(await store.readOutput('release-calendar')).body.events.filter(e=>e.source==='earnings');
  assert.equal(updated.length,1);
  assert.equal(updated[0].date,'2026-11-04');
 }finally{db.close();}
});

test('R28 confirmed cancellation removes only the matching issuer and fiscal event',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const jsonSpec={...source,format:'json'};
  const feed=events=>JSON.stringify({events});
  const release={kind:'earnings_release',date:'2026-11-02',fiscalYear:2026,quarter:4,
   title:'Quarterly Results',status:'confirmed'};
  const call={kind:'earnings_call',date:'2026-11-02',fiscalYear:2026,quarter:4,
   title:'Quarterly Call',status:'confirmed'};
  const fetchJson=body=>async url=>url===source.url?new Response(body,{headers:{'content-type':'application/json'}}):
   new Response('not available',{status:503});
  await collectReleaseCalendar(db,{now:today,earningsSources:[jsonSpec],fetchImpl:fetchJson(feed([release,call]))});
  const before=(await store.readOutput('release-calendar')).body.events.filter(x=>x.source==='earnings');
  assert.equal(before.length,2);
  await collectReleaseCalendar(db,{now:today+7*3600000,earningsSources:[jsonSpec],
   fetchImpl:fetchJson(feed([{...call,status:'cancelled'}]))});
  const after=(await store.readOutput('release-calendar')).body.events.filter(x=>x.source==='earnings');
  assert.equal(after.length,1);
  assert.equal(after[0].id,'earnings-release-cik0000012345-2026-q4');
 }finally{db.close();}
});

test('R28 source failure keeps last accepted earnings and marks issuer failed',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  await collectReleaseCalendar(db,{now:today,earningsSources:[source],fetchImpl:fetchFixture(fixture())});
  const result=await collectReleaseCalendar(db,{now:today+7*3600000,earningsSources:[source],fetchImpl:fetchFixture(null)});
  assert.equal(result.sources.earnings,'SOURCE_FAILED');
  const data=(await store.readOutput('release-calendar')).body;
  assert.equal(data.events.filter(e=>e.source==='earnings').length,1);
  assert.equal(data.sources.earnings.issuers.cik0000012345.status,'SOURCE_FAILED');
 }finally{db.close();}
});

test('R28 invalid permission blocks issuer fetch, does not publish historical earnings',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  await collectReleaseCalendar(db,{now:today,earningsSources:[source],fetchImpl:fetchFixture(fixture())});
  let calls=0;
  const blocked={...source,rights:{...source.rights,redistribution:false}};
  const result=await collectReleaseCalendar(db,{now:today+7*3600000,earningsSources:[blocked],fetchImpl:async(url)=>{
   if(url===source.url)calls++;
   throw Error('NO_OTHER_SOURCE');
  }});
  assert.equal(calls,0);
  assert.equal(result.sources.earnings,'SOURCE_FAILED');
  assert.equal((await store.readOutput('release-calendar')).body.events.filter(x=>x.source==='earnings').length,0);
 }finally{db.close();}
});

test('R28 existing calendar UI routes earnings to the existing filter with date-only and blank financials',()=>{
 const ui=fs.readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
 assert.match(ui,/kind:earningsEvent\?'earnings':'economic'/);
 assert.match(ui,/earningsEvent\?1:releaseImportance/);
 assert.match(ui,/at:eventAt/);
 assert.match(ui,/actual:null,forecast:null,previous:null/);
});
