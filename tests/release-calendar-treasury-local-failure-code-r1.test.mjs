import test from 'node:test';
import assert from 'node:assert/strict';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {collectReleaseCalendar} from '../scripts/pc-writer/release-calendar.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {TREASURY_CUSIP_XML_URL} from '../lib/treasury-calendar.mjs';

const now=Date.parse('2026-11-09T10:00:00Z');
const priorEvent={id:'treasury-auction-912797aa1',source:'treasury',
 date:'2026-11-04',title:'이전 검증된 국채 입찰',sourceUrl:'https://www.treasurydirect.gov/auctions/auction-announcements/'};

const validXml='<Data><TreasuryCUSIPRelease><OfferingDescription>'+
 '<SecurityDescription>13-Week Bill</SecurityDescription><SecurityType>Bill</SecurityType>'+
 '<Reopening>N</Reopening><CUSIP>912797XY1</CUSIP></OfferingDescription><Dates>'+
 '<AnnouncementDate>2026-11-10</AnnouncementDate>'+
 '<CompetitiveAuctionCloseDate>2026-11-12</CompetitiveAuctionCloseDate>'+
 '<IssueDate>2026-11-17</IssueDate></Dates></TreasuryCUSIPRelease></Data>';

async function simulate(treasuryReply){
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);
  await store.initialize();
  await store.writeOutput('release-calendar',
   {events:[priorEvent],sources:{treasury:{status:'READY',checkedAt:'2026-11-08T00:00:00Z'}}},
   now-7*3600000);
  let treasuryCalls=0;
  const fetchImpl=async url=>{
   if(url===TREASURY_CUSIP_XML_URL){treasuryCalls++;return treasuryReply();}
   return new Response('Unavailable',{status:503});
  };
  const result=await collectReleaseCalendar(db,{now,fetchImpl});
  const published=(await store.readOutput('release-calendar')).body;
  const cached=await collectReleaseCalendar(db,{now:now+60000,fetchImpl});
  return {result,published,cached,treasuryCalls};
 }finally{db.close();}
}

test('Treasury HTTP failure gives a bounded PC-local code without changing public source output',async()=>{
 const {result,published,cached,treasuryCalls}=await simulate(()=>
  new Response('Too many requests',{status:429}));
 assert.equal(result.status,'PARTIAL');
 assert.equal(result.treasuryFailureCode,'TREASURY_HTTP_429');
 assert.equal(published.sources.treasury.status,'SOURCE_FAILED');
 assert.equal(Object.hasOwn(published.sources.treasury,'treasuryFailureCode'),false);
 assert.equal(Object.hasOwn(published,'treasuryFailureCode'),false);
 assert.ok(published.events.some(e=>e.id===priorEvent.id&&e.date===priorEvent.date));
 assert.equal(cached.status,'CACHED');
 assert.equal(treasuryCalls,1);
});

test('Treasury malformed XML reports a known parser code without leaking raw XML',async()=>{
 const {result,published}=await simulate(()=>
  new Response('<html>unexpected markup</html>'));
 assert.equal(result.treasuryFailureCode,'TREASURY_OFFICIAL_XML_INVALID');
 assert.equal(published.sources.treasury.status,'SOURCE_FAILED');
 assert.equal(JSON.stringify(result).includes('unexpected markup'),false);
});

test('Treasury unexpected exceptions never disclose raw messages or secrets',async()=>{
 const {result}=await simulate(()=>{throw Error('private provider credentials must not appear');});
 assert.equal(result.treasuryFailureCode,'TREASURY_COLLECTION_FAILED');
 assert.equal(JSON.stringify(result).includes('private provider credentials'),false);
});

test('Treasury success creates exactly two observed events and no diagnostic',async()=>{
 const {result,published}=await simulate(()=>new Response(validXml));
 assert.equal(published.sources.treasury.status,'READY');
 assert.equal(published.sources.treasury.coveredCusips,1);
 assert.equal(published.events.filter(e=>e.source==='treasury').length,3);
 assert.equal(Object.hasOwn(result,'treasuryFailureCode'),false);
});
