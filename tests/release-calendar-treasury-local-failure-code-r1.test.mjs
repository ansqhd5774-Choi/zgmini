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

async function simulate(treasuryReply,{nextTreasuryReply=null,stalePrivateDiagnostic=false}={}){
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);
  await store.initialize();
  await store.writeOutput('release-calendar',
   {events:[priorEvent],sources:{treasury:{status:'READY',checkedAt:'2026-11-08T00:00:00Z'}}},
   now-7*3600000);
  let treasuryCalls=0,reply=treasuryReply;
  const fetchImpl=async url=>{
   if(url===TREASURY_CUSIP_XML_URL){treasuryCalls++;return reply();}
   return new Response('Unavailable',{status:503});
  };
  const result=await collectReleaseCalendar(db,{now,fetchImpl});
  const published=(await store.readOutput('release-calendar')).body;
  if(stalePrivateDiagnostic)await store.writeInput('release-calendar:treasury:failure-code-r1',
   {version:1,code:'TREASURY_HTTP_429'},now-1000);
  const cached=await collectReleaseCalendar(db,{now:now+60000,fetchImpl});
  let recovered=null,recoveredCached=null;
  if(nextTreasuryReply){
   reply=nextTreasuryReply;
   recovered=await collectReleaseCalendar(db,{now:now+7*3600000,fetchImpl});
   recoveredCached=await collectReleaseCalendar(db,{now:now+7*3600000+60000,fetchImpl});
  }
  return {result,published,cached,treasuryCalls,recovered,recoveredCached};
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
 assert.equal(cached.treasuryFailureCode,'TREASURY_HTTP_429');
 assert.equal(cached.sources.treasury,'SOURCE_FAILED');
 assert.equal(cached.providerRequests,0);
 assert.equal(treasuryCalls,1);
});

test('Treasury malformed XML reports a known parser code without leaking raw XML',async()=>{
 const {result,published,cached}=await simulate(()=>
  new Response('<html>unexpected markup</html>'));
 assert.equal(result.treasuryFailureCode,'TREASURY_OFFICIAL_XML_INVALID');
 assert.equal(cached.treasuryFailureCode,'TREASURY_OFFICIAL_XML_INVALID');
 assert.equal(published.sources.treasury.status,'SOURCE_FAILED');
 assert.equal(JSON.stringify(result).includes('unexpected markup'),false);
});

test('Treasury unexpected exceptions never disclose raw messages or secrets',async()=>{
 const {result,cached}=await simulate(()=>{throw Error('private provider credentials must not appear');});
 assert.equal(result.treasuryFailureCode,'TREASURY_COLLECTION_FAILED');
 assert.equal(cached.treasuryFailureCode,'TREASURY_COLLECTION_FAILED');
 assert.equal(JSON.stringify(result).includes('private provider credentials'),false);
 assert.equal(JSON.stringify(cached).includes('private provider credentials'),false);
});

test('Treasury success creates exactly two observed events and no diagnostic',async()=>{
 const {result,published,cached}=await simulate(()=>new Response(validXml));
 // The mocked caller only returns weekly XML; new annual history GET is 503.
 assert.equal(published.sources.treasury.status,'PARTIAL');
 assert.equal(published.sources.treasury.coveredCusips,1);
 assert.equal(published.events.filter(e=>e.source==='treasury').length,3);
 assert.equal(Object.hasOwn(result,'treasuryFailureCode'),false);
 assert.equal(Object.hasOwn(cached,'treasuryFailureCode'),false);
 assert.equal(cached.providerRequests,0);
});

test('Treasury next successful official attempt cannot reuse an earlier failure code',async()=>{
 const {result,cached,recovered,recoveredCached,treasuryCalls}=await simulate(
  ()=>new Response('Rate limited',{status:429}),
  {nextTreasuryReply:()=>new Response(validXml)});
 assert.equal(result.treasuryFailureCode,'TREASURY_HTTP_429');
 assert.equal(cached.treasuryFailureCode,'TREASURY_HTTP_429');
 assert.equal(recovered.sources.treasury,'PARTIAL');
 assert.equal(Object.hasOwn(recovered,'treasuryFailureCode'),false);
 assert.equal(Object.hasOwn(recoveredCached,'treasuryFailureCode'),false);
 assert.equal(recoveredCached.providerRequests,0);
 assert.equal(treasuryCalls,2);
});

test('Treasury cache rejects private diagnostic from a different attempt timestamp',async()=>{
 const {result,cached}=await simulate(()=>new Response('Rate limited',{status:429}),
  {stalePrivateDiagnostic:true});
 assert.equal(result.treasuryFailureCode,'TREASURY_HTTP_429');
 assert.equal(cached.status,'CACHED');
 assert.equal(Object.hasOwn(cached,'treasuryFailureCode'),false);
});
