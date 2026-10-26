import test from 'node:test';
import assert from 'node:assert/strict';
import {kstNewsDay,kstDayWindow,readIranNewsSnapshot,buildIranNewsSnapshot,IRAN_NEWS_DISPLAY_VERSION} from '../lib/iran-progress/news-display-r1.mjs';
import {EMPTY_IRAN_NEWS_CACHE,RIGHTS_SOURCE,RIGHTS_POLICY_URL,toDisplayNewsItem,previewIranNewsRetention,previewIranNewsPublic} from '../scripts/iran-progress/news-display-r1.mjs';
import {mkdtempSync,rmSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {maintainIranDisplayCache,DISPLAY_CACHE_BASENAME} from '../scripts/iran-progress/news-display-io-r1.mjs';
import {publishIranNewsDisplay} from '../scripts/iran-progress/news-display-publication-r1.mjs';
import {storedIranNewsResponse} from '../worker/iran-news-display-public-r1.mjs';
import {IRAN_NEWS_DISPLAY_KEY} from '../lib/iran-progress/news-display-r1.mjs';
import {parseGovUkNewsCandidates,discoverGovUkNewsCandidates,govUkContentCandidate,IRAN_GOVUK_NEWS_FEED} from '../scripts/iran-progress/news-display-discover-r1.mjs';
import {runIranNewsDisplayMaintenance} from '../scripts/iran-progress/news-display-maintenance-r1.mjs';

const now=Date.parse('2026-10-26T15:00:00.000Z'); // KST 10/27 00:00
const item=(date,extra={})=>({source:'GOV.UK',title:'Government statement on Iran talks',summary:'The government issued a statement.',
 sourceUrl:'https://www.gov.uk/government/news/iran-talks-'+date.slice(0,10),publishedAt:date,impact:'neutral',
 rightsVerified:true,rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL,...extra});

test('KST calendar boundaries are inclusive for 14-day and 30-day windows',()=>{
 assert.equal(kstNewsDay(now),'2026-10-27');
 assert.deepEqual(kstDayWindow(now,14),{start:'2026-10-14',end:'2026-10-27'});
 assert.deepEqual(kstDayWindow(now,30),{start:'2026-09-28',end:'2026-10-27'});
});
test('rights receipt and source URL are required; no invented news fields',()=>{
 assert.equal(toDisplayNewsItem(item('2026-10-27T01:00:00Z'),{now}),null); // future
 assert.equal(toDisplayNewsItem(item('2026-10-26T01:00:00Z',{rightsVerified:false}),{now}),null);
 assert.equal(toDisplayNewsItem(item('2026-10-26T01:00:00Z',{sourceUrl:'https://www.bbc.co.uk/news/test'}),{now}),null);
 assert.equal(toDisplayNewsItem(item('2026-10-26T01:00:00Z',{publishedAt:'2026-10-26'}),{now}),null);
 assert.ok(toDisplayNewsItem(item('2026-10-26T01:00:00Z'),{now}));
});
test('30-day cache expiry, dedupe, publisher-only rights and original data isolation',()=>{
 const old=toDisplayNewsItem(item('2026-09-27T14:59:59Z',{sourceUrl:'https://www.gov.uk/government/news/iran-talks-old'}),{now});
 const inside=toDisplayNewsItem(item('2026-09-27T15:00:00Z',{sourceUrl:'https://www.gov.uk/government/news/iran-talks-new'}),{now}); // 9/28 KST
 const raw={version:EMPTY_IRAN_NEWS_CACHE.version,items:[old,inside]};
 const result=previewIranNewsRetention(raw,[item('2026-10-26T01:00:00Z'),item('2026-10-26T01:00:00Z')],{now});
 assert.equal(result.report.expired,1);
 assert.equal(result.report.after,2);
 assert.equal(result.report.accepted,2);
 assert.equal(raw.items.length,2); // preview does not mutate input
 assert.equal(result.cache.items.some(x=>x.id===old.id),false);
 assert.equal(result.cache.items.some(x=>x.id===inside.id),true);
});
test('published current snapshot filters at read time when PC has stopped',()=>{
 const earlier=toDisplayNewsItem(item('2026-10-13T14:59:59Z'),{now}); // 10/13 KST
 const newer=toDisplayNewsItem(item('2026-10-13T15:00:00Z'),{now}); // 10/14 KST
 const snapshot=buildIranNewsSnapshot([earlier,newer],{now});
 assert.equal(snapshot.version,IRAN_NEWS_DISPLAY_VERSION);
 assert.equal(snapshot.items.length,1);
 assert.equal(readIranNewsSnapshot(snapshot,{now}).items.length,1);
 const later=now+2*86400000;
 assert.equal(readIranNewsSnapshot(snapshot,{now:later}).items.length,0);
 assert.equal(readIranNewsSnapshot(snapshot,{now:later}).status,'UPDATE_DELAYED');
});
test('unverified incoming items are not displayed and cannot affect score ledger',()=>{
 const before=JSON.stringify(EMPTY_IRAN_NEWS_CACHE);
 const result=previewIranNewsRetention(EMPTY_IRAN_NEWS_CACHE,[item('2026-10-26T01:00:00Z',{rightsSource:'UNKNOWN'})],{now});
 assert.equal(result.report.rejected,1);
 assert.deepEqual(previewIranNewsPublic(result.cache,{now}).items,[]);
 assert.equal(JSON.stringify(EMPTY_IRAN_NEWS_CACHE),before);
});
test('PC display cache dry-run, 30-day automatic prune and read-back never touch ledger',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'iran-news-r1-test-'));
 try{
  const file=path.join(root,DISPLAY_CACHE_BASENAME);
  const expired=toDisplayNewsItem(item('2026-09-20T01:00:00Z'),{now});
  writeFileSync(file,JSON.stringify({version:EMPTY_IRAN_NEWS_CACHE.version,items:[expired]}));
  const dry=maintainIranDisplayCache(root,[item('2026-10-26T01:00:00Z')],{now});
  assert.equal(dry.dryRun,true);assert.equal(dry.expired,1);assert.equal(dry.written,false);
  assert.equal(JSON.parse(readFileSync(file,'utf8')).items.length,1);
  const run=maintainIranDisplayCache(root,[item('2026-10-26T01:00:00Z')],{now,dryRun:false});
  assert.equal(run.written,true);assert.equal(run.expired,1);
  assert.equal(JSON.parse(readFileSync(file,'utf8')).items.length,1);
  assert.equal(existsSync(file+'.next'),false);
  assert.equal(maintainIranDisplayCache(root,[item('2026-10-26T01:00:00Z')],{now,dryRun:false}).after,1);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('D1 news-only publication requires read-back of its distinct key',async()=>{
 const snapshot=buildIranNewsSnapshot([toDisplayNewsItem(item('2026-10-26T01:00:00Z'),{now})],{now});
 let stored=null;
 const remote={query:async()=>({results:stored?[stored]:[]}),request:async(db,statements)=>{
  assert.equal(statements[0].params[0],IRAN_NEWS_DISPLAY_KEY);
  stored={body:statements[0].params[1],stored_at:statements[0].params[2]};
 }};
 assert.equal((await publishIranNewsDisplay(remote,'core',snapshot,{now})).status,'VERIFIED');
 assert.equal((await publishIranNewsDisplay(remote,'core',snapshot,{now})).status,'UNCHANGED');
 const error=await assert.rejects(publishIranNewsDisplay({query:remote.query,request:async()=>{throw Error('TIMEOUT');}},'core',
  {...snapshot,publishedAt:now+1000},{now:now+1000}),/NEWS_PUBLISH_OUTCOME_UNKNOWN/);
 void error;
});
test('read-only API serves only saved 14-day news and fails closed on invalid snapshot',async()=>{
 const item0=toDisplayNewsItem(item('2026-10-26T01:00:00Z'),{now});
 const snapshot=buildIranNewsSnapshot([item0],{now});
 const row={body:JSON.stringify(snapshot),stored_at:now};
 const db={prepare:()=>({bind:()=>({first:async()=>row})})};
 const response=await storedIranNewsResponse(new Request('https://zgmini.kr/api/outbreak-news/iran'),{db,now});
 assert.equal(response.status,200);
 assert.equal((await response.json()).itemCount,1);
 assert.equal(response.headers.get('x-data-snapshot-at'),new Date(now).toISOString());
 row.body='{}';
 const invalid=await storedIranNewsResponse(new Request('https://zgmini.kr/api/outbreak-news/iran'),{db,now});
 assert.equal(invalid.status,503);
});
test('GOV.UK Atom updated-only feed uses Content API first_published_at and never approves rights',async()=>{
 const xml=`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
 <entry><title>Iran peace talks &amp; dialogue</title><updated>2026-10-27T01:00:00Z</updated><link rel="alternate" href="https://www.gov.uk/government/news/iran-talks"/></entry>
 <entry><title>Iran peace talks &amp; dialogue</title><updated>2026-10-26T01:00:00Z</updated><link href="https://www.gov.uk/government/news/iran-talks"/></entry>
 <entry><title>Iran from an unlicensed publisher</title><updated>2026-10-26T02:00:00Z</updated><link href="https://example.com/article"/></entry>
 <entry><title>Iran official news</title><updated>2026-10-26T02:00:00Z</updated><link href="https://www.gov.uk/government/news/missing-first-published"/></entry>
 <entry><title>Iran future notice</title><updated>2026-10-26T02:00:00Z</updated><link href="https://www.gov.uk/government/news/future"/></entry>
 </feed>`;
 const parsed=parseGovUkNewsCandidates(xml);
 assert.equal(parsed.length,3);
 assert.equal(parsed[0].feedUpdatedAt,'2026-10-27T01:00:00.000Z');
 assert.equal(parsed[0].publishedAt,undefined);
 const official=(base_path,first_published_at)=>({base_path,title:'Iran peace talks & dialogue',description:'Official statement about Iran.',
  first_published_at,public_updated_at:'2026-10-27T01:00:00Z',details:{body:'Iran was discussed.'}});
 const response=await discoverGovUkNewsCandidates({now,fetcher:async(url)=>{
  if(url===IRAN_GOVUK_NEWS_FEED)return new Response(xml,{status:200,headers:{'content-type':'application/atom+xml'}});
  const pathname=new URL(url).pathname.replace('/api/content','');
  const published=pathname.endsWith('/iran-talks')?'2026-10-26T01:00:00Z':pathname.endsWith('/future')?'2026-10-28T02:00:00Z':null;
  return new Response(JSON.stringify(official(pathname,published)),{status:200});
 }});
 assert.equal(response.status,'REVIEW_REQUIRED');
 assert.equal(response.count,1);
 assert.equal(response.counts.feedEntries,3);
 assert.equal(response.counts.apiChecked,3);
 assert.equal(response.candidates[0].publishedAt,'2026-10-26T01:00:00.000Z');
 assert.equal(response.candidates[0].rightsVerified,false);
 assert.equal(toDisplayNewsItem(response.candidates[0],{now}),null);
});
test('discovery fails closed on unsafe XML and transport errors',async()=>{
 assert.throws(()=>parseGovUkNewsCandidates('<!DOCTYPE feed><feed></feed>',{now}),/NEWS_DISCOVERY_FEED_INVALID/);
 await assert.rejects(discoverGovUkNewsCandidates({now,fetcher:async()=>new Response('offline',{status:503})}),/NEWS_DISCOVERY_SOURCE_FAILED/);
});
test('Content API can verify first publication for Iran mentioned in article body alone',()=>{
 const feedItem={sourceUrl:'https://www.gov.uk/government/news/joint-ministerial-meeting'};
 const body={base_path:'/government/news/joint-ministerial-meeting',title:'Joint ministerial meeting',
  description:'Government issued a statement',first_published_at:'2026-10-24T07:41:00Z',
  public_updated_at:'2026-10-26T07:41:00Z',details:{body:'The ministers discussed the US/Israel-Iran conflict.'}};
 const assessed=govUkContentCandidate(feedItem,body,{now});
 assert.equal(assessed.status,'REVIEW_REQUIRED');
 assert.equal(assessed.item.publishedAt,'2026-10-24T07:41:00.000Z');
 assert.equal(govUkContentCandidate(feedItem,{...body,first_published_at:null},{now}).status,'FIRST_PUBLICATION_UNVERIFIED');
 assert.equal(govUkContentCandidate(feedItem,{...body,first_published_at:'2026-09-01T07:41:00Z'},{now}).status,'OUTSIDE_30_DAY_WINDOW');
});
test('PC maintenance mode gates actual cache rewrite and D1 publication separately',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'iran-news-cycle-test-'));
 const file=path.join(root,DISPLAY_CACHE_BASENAME);
 try{
  const incoming=[item('2026-10-26T01:00:00Z')];
  const dry=await runIranNewsDisplayMaintenance({dataDirectory:root,incoming,now});
  assert.equal(dry.publication,'SKIPPED_DRY_RUN');
  assert.equal(existsSync(file),false);
  await assert.rejects(runIranNewsDisplayMaintenance({dataDirectory:root,incoming,now,mode:'publish'}),/NEWS_PUBLICATION_CONFIG_REQUIRED/);
  assert.equal(existsSync(file),false);
  const applied=await runIranNewsDisplayMaintenance({dataDirectory:root,incoming,now,mode:'apply'});
  assert.equal(applied.written,true);
  assert.equal(applied.visibleCount,1);
  assert.equal(applied.publication,'SKIPPED_NOT_REQUESTED');
  let row=null;
  const remote={query:async()=>({results:row?[row]:[]}),request:async(_db,statements)=>{
   row={body:statements[0].params[1],stored_at:statements[0].params[2]};
  }};
  const published=await runIranNewsDisplayMaintenance({dataDirectory:root,now,mode:'publish',remote,db:'core'});
  assert.equal(published.visibleCount,1);
  assert.equal(published.publication,'VERIFIED');
  assert.equal(JSON.parse(row.body).itemCount,1);
 }finally{rmSync(root,{recursive:true,force:true});}
});
