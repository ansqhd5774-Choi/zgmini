import test from 'node:test';
import assert from 'node:assert/strict';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {collectReleaseCalendar} from '../scripts/pc-writer/release-calendar.mjs';
import {TREASURY_CUSIP_XML_URL} from '../lib/treasury-calendar.mjs';
import {TREASURY_AUCTION_HISTORY_URL} from '../lib/treasury-auction-history-source.mjs';
import {TREASURY_DIRECT_HISTORY_URL} from '../lib/treasury-auction-history-taws.mjs';
import {RELEASE_SOURCES} from '../lib/release-calendar.mjs';
import {marketOperationalStore} from '../worker/market-operational-store.mjs';

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
const awarded=(n,fields={})=>({
 cusip:'9'+n.toString(36).toUpperCase().padStart(8,'0'),
 competitiveAuctionCloseDate:'2026-10-22T00:00:00',
 announcementDate:'2026-10-19T00:00:00',issueDate:'2026-10-27T00:00:00',
 type:'Bill',securityTerm:'4-Week',originalSecurityTerm:'4-Week',
 reopening:'No',inflationProtected:'No',floatingRate:'No',bidToCoverRatio:'2.46',
 ...fields
});
const taWsRows=[...Array.from({length:436},(_,n)=>awarded(n)),
 ...Array.from({length:4},(_,n)=>awarded(436+n,{
  competitiveAuctionCloseDate:'2026-11-09T00:00:00',
  announcementDate:'2026-11-05T00:00:00',issueDate:'2026-11-12T00:00:00',
  bidToCoverRatio:''})),
 ...Array.from({length:5},(_,n)=>awarded(440+n,{
  competitiveAuctionCloseDate:'2026-11-12T00:00:00',
  announcementDate:'2026-11-09T00:00:00',issueDate:'2026-11-17T00:00:00'}))];
const taWsBody=JSON.stringify(taWsRows);

async function simulate({historyAvailable=true,tawsAvailable=true,tawsPayload=taWsBody,
 previousTreasury=[],weeklyStatus=200,weeklyPayload=weeklyXml}={}){
 const db=localDatabase(':memory:');
 const store=publicFeedStore(db),privateStore=marketOperationalStore(db);
 await store.initialize();
 if(previousTreasury.length)await store.writeOutput('release-calendar',
  {events:previousTreasury,sources:{treasury:{status:'READY'}}},now-8*3600000);
 let weeklyCalls=0,historyCalls=0,historyUrl=null,tawsCalls=0,tawsUrl=null;
 const fetchImpl=async url=>{
  if(url===TREASURY_CUSIP_XML_URL){
   weeklyCalls++;
   return new Response(weeklyStatus===200?weeklyPayload:'Weekly source unavailable',
    {status:weeklyStatus});
  }
  if(url.startsWith(TREASURY_DIRECT_HISTORY_URL)){
   tawsCalls++;tawsUrl=url;
   return tawsAvailable?new Response(tawsPayload,{headers:{'content-type':'application/json'}}):
    new Response('Unavailable',{status:503});
  }
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
  const officialStored=await privateStore.readInput('release-calendar:treasury:taws');
  const diagnostic=await store.readInput('release-calendar:treasury:history:failure-code-r1');
  const weeklyDiagnostic=await store.readInput('release-calendar:treasury:failure-code-r1');
  return {collected,output,cached,persisted,officialStored,diagnostic,weeklyDiagnostic,
   weeklyCalls,historyCalls,historyUrl,tawsCalls,tawsUrl};
 }finally{db.close();}
}

test('one regular Core attempt stores and rereads a whole official year without refetch in calculation',async()=>{
 const state=await simulate();
 assert.equal(state.output.sources.treasury.status,'READY');
 assert.equal(state.weeklyCalls,1);
 assert.equal(state.tawsCalls,1);
 assert.equal(state.historyCalls,0);
 const uri=new URL(state.tawsUrl);
 assert.equal(uri.searchParams.get('startDate'),'2025-11-10');
 assert.equal(uri.searchParams.get('endDate'),'2026-12-09');
 assert.equal(state.persisted,null);
 assert.equal(state.officialStored.body.sourceUrl,TREASURY_DIRECT_HISTORY_URL);
 assert.equal(state.officialStored.body.fromDate,'2025-11-10');
 assert.equal(state.officialStored.body.toDate,'2026-11-09');
 assert.equal(state.officialStored.body.text,taWsBody);
 assert.equal(JSON.parse(state.officialStored.body.text).length,445);
 assert.equal(state.diagnostic,null);
 assert.equal(Object.hasOwn(state.collected,'treasuryHistoryFailureCode'),false);
 const treasury=state.output.events.filter(event=>event.source==='treasury');
 const historic=treasury.filter(event=>event.date<='2026-11-09');
 assert.equal(historic.length,872); // 436 awarded auctions + 436 announcements.
 assert.equal(treasury.length,874); // Two current weekly observations.
 assert.equal(new Set(treasury.map(e=>e.id+':'+e.date)).size,874);
 assert.equal(state.cached.status,'CACHED');
 assert.equal(state.cached.providerRequests,0);
 assert.equal(state.weeklyCalls+state.tawsCalls+state.historyCalls,2);
});

test('weekly HTTP failure does not block annual awarded history and preserves earlier future dates',async()=>{
 const previous={id:'treasury-auction-912797old',source:'treasury',
  date:'2026-11-18',title:'이전 주간 공식 국채 입찰',
  sourceUrl:'https://www.treasurydirect.gov/auctions/auction-announcements/'};
 const state=await simulate({weeklyStatus:503,previousTreasury:[previous]});
 assert.equal(state.weeklyCalls,1);
 assert.equal(state.tawsCalls,1);
 assert.equal(state.historyCalls,0);
 assert.equal(state.output.sources.treasury.status,'PARTIAL');
 assert.equal(state.collected.treasuryFailureCode,'TREASURY_HTTP_503');
 assert.equal(state.cached.treasuryFailureCode,'TREASURY_HTTP_503');
 assert.equal(state.weeklyDiagnostic.body.code,'TREASURY_HTTP_503');
 assert.equal(state.officialStored.body.awardedCount,436);
 assert.equal(state.output.events.filter(e=>e.source==='treasury'&&e.date<='2026-11-09').length,872);
 assert.ok(state.output.events.some(e=>e.id===previous.id&&e.date===previous.date));
 assert.equal(Object.hasOwn(state.output,'treasuryFailureCode'),false);
 assert.equal(Object.hasOwn(state.output.sources.treasury,'treasuryFailureCode'),false);
 assert.equal(Object.hasOwn(state.collected,'treasuryHistoryFailureCode'),false);
});

test('malformed weekly XML leaves official annual collection working without exposing raw HTML',async()=>{
 const state=await simulate({weeklyPayload:'<html>not official xml</html>'});
 assert.equal(state.output.sources.treasury.status,'PARTIAL');
 assert.equal(state.collected.treasuryFailureCode,'TREASURY_OFFICIAL_XML_INVALID');
 assert.equal(state.cached.treasuryFailureCode,'TREASURY_OFFICIAL_XML_INVALID');
 assert.equal(state.tawsCalls,1);
 assert.equal(state.officialStored.body.awardedCount,436);
 assert.equal(state.output.events.filter(e=>e.source==='treasury').length,872);
 assert.equal(JSON.stringify(state.collected).includes('not official xml'),false);
});

test('both weekly and annual sources failing preserves previous dates and both private errors',async()=>{
 const previous={id:'treasury-auction-912797old',source:'treasury',
  date:'2026-08-10',title:'이전 유효 국채 입찰',
  sourceUrl:'https://www.treasurydirect.gov/auctions/auction-announcements/'};
 const state=await simulate({weeklyStatus:503,tawsAvailable:false,
  historyAvailable:false,previousTreasury:[previous]});
 assert.equal(state.output.sources.treasury.status,'SOURCE_FAILED');
 assert.equal(state.weeklyCalls,1);
 assert.equal(state.tawsCalls,1);
 assert.equal(state.historyCalls,1);
 assert.equal(state.collected.treasuryFailureCode,'TREASURY_HTTP_503');
 assert.equal(state.collected.treasuryHistoryFailureCode,'TREASURY_TAWS_HTTP_503');
 assert.equal(state.cached.treasuryFailureCode,'TREASURY_HTTP_503');
 assert.equal(state.cached.treasuryHistoryFailureCode,'TREASURY_TAWS_HTTP_503');
 assert.ok(state.output.events.some(e=>e.id===previous.id&&e.date===previous.date));
 assert.equal(Object.hasOwn(state.output,'treasuryHistoryFailureCode'),false);
 assert.equal(Object.hasOwn(state.output,'treasuryFailureCode'),false);
});

test('failed weekly and TAWS but successful FiscalData remains partial, not complete or failed',async()=>{
 const state=await simulate({weeklyStatus:503,tawsAvailable:false});
 assert.equal(state.output.sources.treasury.status,'PARTIAL');
 assert.equal(state.collected.treasuryFailureCode,'TREASURY_HTTP_503');
 assert.equal(state.cached.treasuryFailureCode,'TREASURY_HTTP_503');
 assert.equal(state.collected.treasuryHistoryFailureCode,'TREASURY_TAWS_HTTP_503');
 assert.equal(state.cached.treasuryHistoryFailureCode,'TREASURY_TAWS_HTTP_503');
 assert.equal(state.output.events.filter(e=>e.source==='treasury').length,824);
});

test('failed annual request preserves weekly and prior history while honestly remaining partial',async()=>{
 const old={id:'treasury-auction-912797old',source:'treasury',
  sourceUrl:'https://www.treasurydirect.gov/auctions/auction-announcements/',
  date:'2026-05-12',title:'기존 공식 국채 입찰'};
 const state=await simulate({historyAvailable:false,tawsAvailable:false,previousTreasury:[old]});
 assert.equal(state.output.sources.treasury.status,'PARTIAL');
 assert.equal(state.weeklyCalls,1);
 assert.equal(state.historyCalls,1);
 assert.equal(state.tawsCalls,1);
 assert.equal(state.persisted,null);
 assert.equal(state.officialStored,null);
 assert.equal(state.collected.treasuryHistoryFailureCode,'TREASURY_TAWS_HTTP_503');
 assert.equal(state.cached.treasuryHistoryFailureCode,'TREASURY_TAWS_HTTP_503');
 assert.equal(state.cached.sources.treasury,'PARTIAL');
 assert.equal(state.diagnostic.body.code,'TREASURY_TAWS_HTTP_503');
 assert.equal(Object.hasOwn(state.output,'treasuryHistoryFailureCode'),false);
 assert.equal(Object.hasOwn(state.output.sources.treasury,'treasuryHistoryFailureCode'),false);
 assert.ok(state.output.events.some(e=>e.id===old.id&&e.date===old.date));
 assert.ok(state.output.events.some(e=>e.id==='treasury-announcement-912797zz9'));
 assert.ok(state.output.events.some(e=>e.id==='treasury-auction-912797zz9'));
 assert.equal(state.cached.status,'CACHED');
 assert.equal(state.weeklyCalls+state.tawsCalls+state.historyCalls,3);
});

test('official history failure may use lagged FiscalData, but never present it as fully ready',async()=>{
 const state=await simulate({tawsAvailable:false});
 assert.equal(state.output.sources.treasury.status,'PARTIAL');
 assert.equal(state.tawsCalls,1);
 assert.equal(state.historyCalls,1);
 assert.equal(JSON.parse(state.persisted.body.text).data.length,415);
 assert.equal(state.collected.treasuryHistoryFailureCode,'TREASURY_TAWS_HTTP_503');
 assert.equal(state.cached.treasuryHistoryFailureCode,'TREASURY_TAWS_HTTP_503');
 const historic=state.output.events.filter(e=>e.source==='treasury'&&e.date<='2026-11-09');
 assert.equal(historic.length,824);
});

test('compressed PC-private input stores more than the public 1.8MB raw limit exactly',async()=>{
 const enlarged=JSON.stringify(taWsRows.map((row,i)=>i===0?{
  ...row,nonPublicSourceField:'z'.repeat(2_000_000)}:row));
 assert.ok(Buffer.byteLength(enlarged)>1_800_000);
 const state=await simulate({tawsPayload:enlarged});
 assert.equal(state.output.sources.treasury.status,'READY');
 assert.equal(state.officialStored.body.text,enlarged);
 assert.equal(state.officialStored.body.awardedCount,436);
 assert.equal(state.historyCalls,0);
 assert.equal(state.tawsCalls,1);
});

test('new official awarded history corrects same-date older titles while preserving unrelated past events',async()=>{
 const obsolete={id:'treasury-auction-900000000',source:'treasury',
  date:'2026-10-22',title:'과거 공급처의 잘못된 제목',
  sourceUrl:'https://www.treasurydirect.gov/auctions/auction-announcements/'};
 const unrelated={id:'treasury-auction-912797abc',source:'treasury',
  date:'2025-05-10',title:'보존할 이전 국채 입찰',
  sourceUrl:'https://www.treasurydirect.gov/auctions/auction-announcements/'};
 const state=await simulate({previousTreasury:[obsolete,unrelated]});
 assert.equal(state.output.sources.treasury.status,'READY');
 const corrected=state.output.events.filter(e=>e.id===obsolete.id&&e.date===obsolete.date);
 assert.equal(corrected.length,1);
 assert.notEqual(corrected[0].title,obsolete.title);
 assert.ok(corrected[0].title.includes('4주물 단기국채'));
 assert.ok(state.output.events.some(e=>e.id===unrelated.id&&e.title===unrelated.title));
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
  let weekly=0,history=0,taws=0;
  const fetchImpl=async url=>{
   if(url===TREASURY_CUSIP_XML_URL){weekly++;return new Response(weeklyXml);}
   if(url.startsWith(TREASURY_DIRECT_HISTORY_URL)){
    taws++;return new Response(taWsBody,{headers:{'content-type':'application/json'}});
   }
   if(url.startsWith(TREASURY_AUCTION_HISTORY_URL)){
    history++;return new Response(historyBody,{headers:{'content-type':'application/json'}});
   }
   return new Response('Unavailable',{status:503});
  };
  const result=await collectReleaseCalendar(db,{now,fetchImpl});
  assert.notEqual(result.status,'CACHED');
  assert.equal(weekly,1);
  assert.equal(taws,1);
  assert.equal(history,0);
  assert.equal((await store.readOutput('release-calendar')).body.sources.treasury.status,'READY');
 }finally{db.close();}
});

test('legacy SOURCE_FAILED inside six hours is not proof an annual request was attempted',async()=>{
 const db=localDatabase(':memory:');
 try{
  const store=publicFeedStore(db);await store.initialize();
  const earlier=now-3600000;
  const sources=Object.fromEntries(Object.keys(RELEASE_SOURCES).map(source=>
   [source,{status:source==='treasury'?'SOURCE_FAILED':'READY',
    ...(source==='bls'?{annualCollectorVersion:1}:{})}]));
  await store.writeAttempt('release-calendar',earlier);
  await store.writeOutput('release-calendar',{events:[],sources},earlier);
  let weeklyCalls=0,tawsCalls=0;
  const fetchImpl=async url=>{
   if(url===TREASURY_CUSIP_XML_URL){
    weeklyCalls++;return new Response('Unavailable',{status:503});
   }
   if(url.startsWith(TREASURY_DIRECT_HISTORY_URL)){
    tawsCalls++;return new Response(taWsBody,{headers:{'content-type':'application/json'}});
   }
   return new Response('Unavailable',{status:503});
  };
  const result=await collectReleaseCalendar(db,{now,fetchImpl});
  assert.notEqual(result.status,'CACHED');
  assert.equal(weeklyCalls,1);
  assert.equal(tawsCalls,1);
  const published=(await store.readOutput('release-calendar')).body;
  assert.equal(published.sources.treasury.status,'PARTIAL');
  assert.equal(published.events.filter(e=>e.source==='treasury').length,872);
 }finally{db.close();}
});
