import test from 'node:test';
import assert from 'node:assert/strict';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {collectReleaseCalendar} from '../scripts/pc-writer/release-calendar.mjs';
import {TREASURY_CUSIP_XML_URL} from '../lib/treasury-calendar.mjs';
import {TREASURY_AUCTION_HISTORY_URL} from '../lib/treasury-auction-history-source.mjs';
import {RELEASE_SOURCES} from '../lib/release-calendar.mjs';

const now=Date.parse('2026-11-09T12:00:00Z');
const weeklyXml='<Data><TreasuryCUSIPRelease><OfferingDescription>'+
 '<CUSIP>912797ZZ9</CUSIP><SecurityDescription>4-Week Bill</SecurityDescription>'+
 '<SecurityType>Bill</SecurityType><Reopening>N</Reopening></OfferingDescription><Dates>'+
 '<AnnouncementDate>2026-11-10</AnnouncementDate>'+
 '<CompetitiveAuctionCloseDate>2026-11-12</CompetitiveAuctionCloseDate>'+
 '<IssueDate>2026-11-17</IssueDate></Dates></TreasuryCUSIPRelease></Data>';
const sampleRows=Array.from({length:415},(_,index)=>({
 cusip:`912797${index.toString(36).toUpperCase().padStart(3,'0')}`,
 auction_date:index<6?'2025-11-10':'2026-10-22',
 announcemt_date:index<6?'2025-11-07':'2026-10-19',
 security_type:'Bill',security_term:'4-Week',original_security_term:'4-Week',
 reopening:index>200?'Yes':'No',inflation_index_security:'No',floating_rate:'No'
}));
const historyBody=JSON.stringify({data:sampleRows,
 meta:{count:415,'total-count':415,'total-pages':1}});

async function simulate({historyAvailable=true,previousTreasury=[]}={}){
 const db=localDatabase(':memory:');
 const store=publicFeedStore(db);await store.initialize();
 if(previousTreasury.length)await store.writeOutput('release-calendar',
  {events:previousTreasury,sources:{treasury:{status:'READY'}}},now-8*3600000);
 let weeklyCalls=0,historyCalls=0,historyUrl=null;
 const fetchImpl=async url=>{
  if(url===TREASURY_CUSIP_XML_URL){weeklyCalls++;return new Response(weeklyXml);}
  if(url.startsWith(TREASURY_AUCTION_HISTORY_URL)){
   historyCalls++;historyUrl=url;
   return historyAvailable?new Response(historyBody,{headers:{'content-type':'application/json'}}):
    new Response('Unavailable',{status:503});
  }
  return new Response('Unavailable',{status:503});
 };
 try{
  const collected=await collectReleaseCalendar(db,{now,fetchImpl});
  const output=(await store.readOutput('release-calendar')).body;
  const cached=await collectReleaseCalendar(db,{now:now+60000,fetchImpl});
  const persisted=await store.readInput('release-calendar:treasury:history:page:1');
  const diagnostic=await store.readInput('release-calendar:treasury:history:failure-code-r1');
  return {collected,output,cached,persisted,diagnostic,weeklyCalls,historyCalls,historyUrl};
 }finally{db.close();}
}

test('one regular Core attempt stores and rereads a whole official year without refetch in calculation',async()=>{
 const state=await simulate();
 assert.equal(state.output.sources.treasury.status,'READY');
 assert.equal(state.weeklyCalls,1);
 assert.equal(state.historyCalls,1);
 const uri=new URL(state.historyUrl);
 assert.equal(uri.searchParams.get('filter'),
  'auction_date:gte:2025-11-10,auction_date:lte:2026-11-09');
 assert.equal(uri.searchParams.get('page[size]'),'500');
 assert.equal(state.persisted.body.sourceUrl,TREASURY_AUCTION_HISTORY_URL);
 assert.equal(state.persisted.body.fromDate,'2025-11-10');
 assert.equal(state.persisted.body.toDate,'2026-11-09');
 assert.equal(JSON.parse(state.persisted.body.text).data.length,415);
 assert.equal(state.diagnostic,null);
 assert.equal(Object.hasOwn(state.collected,'treasuryHistoryFailureCode'),false);
 const treasury=state.output.events.filter(event=>event.source==='treasury');
 const historic=treasury.filter(event=>event.date<='2026-11-09');
 assert.equal(historic.length,824); // 415 auctions + 409 announcements.
 assert.equal(treasury.length,826); // Two current weekly observations.
 assert.equal(new Set(treasury.map(e=>e.id+':'+e.date)).size,826);
 assert.equal(state.cached.status,'CACHED');
 assert.equal(state.cached.providerRequests,0);
 assert.equal(state.weeklyCalls+state.historyCalls,2);
});

test('failed annual request preserves weekly and prior history while honestly remaining partial',async()=>{
 const old={id:'treasury-auction-912797old',source:'treasury',
  sourceUrl:'https://www.treasurydirect.gov/auctions/auction-announcements/',
  date:'2026-05-12',title:'기존 공식 국채 입찰'};
 const state=await simulate({historyAvailable:false,previousTreasury:[old]});
 assert.equal(state.output.sources.treasury.status,'PARTIAL');
 assert.equal(state.weeklyCalls,1);
 assert.equal(state.historyCalls,1);
 assert.equal(state.persisted,null);
 assert.equal(state.collected.treasuryHistoryFailureCode,'TREASURY_HISTORY_HTTP_503');
 assert.equal(state.cached.treasuryHistoryFailureCode,'TREASURY_HISTORY_HTTP_503');
 assert.equal(state.cached.sources.treasury,'PARTIAL');
 assert.equal(state.diagnostic.body.code,'TREASURY_HISTORY_HTTP_503');
 assert.equal(Object.hasOwn(state.output,'treasuryHistoryFailureCode'),false);
 assert.equal(Object.hasOwn(state.output.sources.treasury,'treasuryHistoryFailureCode'),false);
 assert.ok(state.output.events.some(e=>e.id===old.id&&e.date===old.date));
 assert.ok(state.output.events.some(e=>e.id==='treasury-announcement-912797zz9'));
 assert.ok(state.output.events.some(e=>e.id==='treasury-auction-912797zz9'));
 assert.equal(state.cached.status,'CACHED');
 assert.equal(state.weeklyCalls+state.historyCalls,2);
});

test('previous weekly-only cache is invalidated once to collect newly required annual history',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const earlier=now-3600000;
  const sources=Object.fromEntries(Object.keys(RELEASE_SOURCES).map(source=>
   [source,{status:'READY',...(source==='bls'?{annualCollectorVersion:1}:{})}]));
  await store.writeAttempt('release-calendar',earlier);
  await store.writeOutput('release-calendar',{events:[],sources},earlier);
  let weekly=0,history=0;
  const fetchImpl=async url=>{
   if(url===TREASURY_CUSIP_XML_URL){weekly++;return new Response(weeklyXml);}
   if(url.startsWith(TREASURY_AUCTION_HISTORY_URL)){
    history++;return new Response(historyBody,{headers:{'content-type':'application/json'}});
   }
   return new Response('Unavailable',{status:503});
  };
  const result=await collectReleaseCalendar(db,{now,fetchImpl});
  assert.notEqual(result.status,'CACHED');
  assert.equal(weekly,1);
  assert.equal(history,1);
  assert.equal((await store.readOutput('release-calendar')).body.sources.treasury.status,'READY');
 }finally{db.close();}
});
