import test from 'node:test';
import assert from 'node:assert/strict';
import {kstNewsDay,kstDayWindow,readIranNewsSnapshot,buildIranNewsSnapshot,IRAN_NEWS_DISPLAY_VERSION} from '../lib/iran-progress/news-display-r1.mjs';
import {EMPTY_IRAN_NEWS_CACHE,RIGHTS_SOURCE,RIGHTS_POLICY_URL,toDisplayNewsItem,previewIranNewsRetention,previewIranNewsPublic} from '../scripts/iran-progress/news-display-r1.mjs';
import {mkdtempSync,rmSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {maintainIranDisplayCache,DISPLAY_CACHE_BASENAME} from '../scripts/iran-progress/news-display-io-r1.mjs';

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
