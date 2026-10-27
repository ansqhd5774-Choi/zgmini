import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {preflightIncrementalIranNewsR13,buildIncrementalIranNewsPlan} from '../scripts/iran-progress/news-display-incremental-preflight-r13.mjs';
import {toDisplayNewsItem,RIGHTS_SOURCE,RIGHTS_POLICY_URL,IRAN_NEWS_CACHE_VERSION} from '../scripts/iran-progress/news-display-r1.mjs';
import {DISPLAY_CACHE_BASENAME} from '../scripts/iran-progress/news-display-io-r1.mjs';
import {IRAN_GOVUK_NEWS_FEEDS} from '../scripts/iran-progress/news-display-discover-r1.mjs';
import {buildIranNewsSnapshot} from '../lib/iran-progress/news-display-r1.mjs';

const now=Date.parse('2026-10-27T06:00:00.000Z');
const oldUrl='https://www.gov.uk/government/news/saudi-forum';
const newUrl='https://www.gov.uk/government/news/iran-meeting';
const rights={rightsVerified:true,rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL};
const oldItem=toDisplayNewsItem({source:'GOV.UK',sourceUrl:oldUrl,
 publishedAt:'2026-10-24T08:00:00.000Z',title:'직접 검토한 사우디 회의',
 summary:'수동으로 확인한 발표의 상세한 문장입니다.',impact:'neutral',...rights},{now});
const remoteSnapshot=buildIranNewsSnapshot([oldItem],{now:now-120000});
const content=(url,title,body)=>({base_path:new URL(url).pathname,title,
 first_published_at:url===oldUrl?'2026-10-24T08:00:00.000Z':'2026-10-26T10:00:00.000Z',
 description:'Official release',document_type:'press_release',details:{body},
 links:{organisations:[{base_path:'/government/organisations/foreign-commonwealth-development-office'}]}});
const rightsPage='<html><footer>All content is available under the Open Government Licence v3.0 except where otherwise stated</footer></html>';

function mockFetcher({oneFeedFails=false,thirdParty=false,longExcerpt=false}={}){
 return async url=>{
  if(IRAN_GOVUK_NEWS_FEEDS.includes(url)){
   if(oneFeedFails&&url===IRAN_GOVUK_NEWS_FEEDS[2])return new Response('',{status:503});
   return new Response('<feed>'+
    `<entry><title>Saudi forum</title><updated>2026-10-27T02:00:00Z</updated><link href="${oldUrl}"/></entry>`+
    `<entry><title>Iran meeting</title><updated>2026-10-27T01:00:00Z</updated><link href="${newUrl}"/></entry>`+
    '</feed>');
  }
  if(url==='https://www.gov.uk/api/content'+new URL(oldUrl).pathname)
   return new Response(JSON.stringify(content(oldUrl,'Saudi forum','<p>Saudi Arabia consultation</p>')));
  if(url==='https://www.gov.uk/api/content'+new URL(newUrl).pathname)
   return new Response(JSON.stringify(content(newUrl,'Iran meeting',thirdParty?'<p>Iran statement © third-party agency</p>':longExcerpt?'<p>Ministers discussed diplomatic negotiations with Iran and regional security priorities.</p>':'<p>Iran diplomatic talks</p>')));
  if(url===oldUrl||url===newUrl)return new Response(rightsPage);
  throw Error('Unexpected URL: '+url);
 };
}

async function withCache(cb){
 const dir=mkdtempSync(path.join(tmpdir(),'iran-news-r13-test-'));
 try{
  writeFileSync(path.join(dir,'iran.sqlite'),'test sentinel');
  writeFileSync(path.join(dir,DISPLAY_CACHE_BASENAME),JSON.stringify({version:IRAN_NEWS_CACHE_VERSION,items:[oldItem]}));
  return await cb(dir);
 }finally{rmSync(dir,{recursive:true,force:true});}
}
function remoteWithRow({different=false}={}){
 const snapshot=different?buildIranNewsSnapshot([],{now:now-120000}):remoteSnapshot;
 let writes=0;
 return {remote:{query:async (db,sql,args)=>{
  assert.equal(db,'core');assert.match(sql,/^SELECT body,stored_at/);
  assert.equal(args[0],'public:iran-progress:news:iran:r1');
  return {results:[{body:JSON.stringify(snapshot),stored_at:snapshot.publishedAt}]};
 },request:async()=>{writes++;}},written:()=>writes};
}

test('R13 read-only plans nine-style additions, retaining the exact original reviewed article',async()=>{
 await withCache(async dataDirectory=>{
  const d=remoteWithRow();
  const plan=await preflightIncrementalIranNewsR13({dataDirectory,remote:d.remote,db:'core',now,
   fetcher:mockFetcher()});
  assert.equal(plan.report.status,'PASS_R13_INCREMENTAL_NEWS_PREFLIGHT_READ_ONLY');
  assert.equal(plan.report.rightsEligible,2);
  assert.equal(plan.report.newArticles,1);
  assert.equal(plan.report.duplicatesPreserved,1);
  assert.equal(plan.report.nextLocalCount,2);
  assert.equal(plan.report.nextPublicCount,2);
  assert.deepEqual(plan.cache.items.find(x=>x.id===oldItem.id),oldItem);
  // Short one-line bodies are not misrepresented as a complete English excerpt.
  assert.equal(plan.cache.items.find(x=>x.sourceUrl===newUrl).summaryEn,undefined);
  assert.equal(plan.report.pcCacheWritten,false);
  assert.equal(plan.report.d1Written,false);
  assert.equal(d.written(),0);
 });
});

test('R22 carries an actual GOV.UK English excerpt into the new public-news snapshot',async()=>{
 await withCache(async dataDirectory=>{
  const d=remoteWithRow();
  const plan=await preflightIncrementalIranNewsR13({dataDirectory,remote:d.remote,db:'core',now,
   fetcher:mockFetcher({longExcerpt:true})});
  const added=plan.publicSnapshot.items.find(x=>x.sourceUrl===newUrl);
  assert.equal(added.titleEn,'Iran meeting');
  assert.equal(added.summaryEn,'Ministers discussed diplomatic negotiations with Iran and regional security priorities.');
  assert.deepEqual(plan.publicSnapshot.items.find(x=>x.id===oldItem.id),oldItem);
  assert.equal(d.written(),0);
 });
});

test('R13 stops if one of four feeds fails; cached news is not discarded',async()=>{
 await withCache(async dataDirectory=>{
  const d=remoteWithRow();
  await assert.rejects(preflightIncrementalIranNewsR13({dataDirectory,remote:d.remote,db:'core',now,
   fetcher:mockFetcher({oneFeedFails:true})}),/R13_DISCOVERY_INCOMPLETE_PRESERVE_EXISTING_NEWS/);
  assert.equal(d.written(),0);
 });
});

test('R13 holds an individual third-party-content candidate without rejecting verified others',async()=>{
 await withCache(async dataDirectory=>{
  const d=remoteWithRow();
  const plan=await preflightIncrementalIranNewsR13({dataDirectory,remote:d.remote,db:'core',now,
   fetcher:mockFetcher({thirdParty:true})});
  assert.equal(plan.report.rightsEligible,1);
  assert.equal(plan.report.rightsHeld,1);
  assert.equal(plan.report.newArticles,0);
  assert.deepEqual(plan.cache.items,[oldItem]);
 });
});

test('R13 stops on pre-existing mismatch between isolated D1 news key and PC display cache',async()=>{
 await withCache(async dataDirectory=>{
  const d=remoteWithRow({different:true});
  await assert.rejects(preflightIncrementalIranNewsR13({dataDirectory,remote:d.remote,db:'core',now,
   fetcher:mockFetcher()}),/R13_CACHE_AND_REMOTE_NEWS_DIVERGED/);
  assert.equal(d.written(),0);
 });
});

test('R13 rejects any incomplete discovery counts even when there is one eligible article',()=>{
 assert.throws(()=>buildIncrementalIranNewsPlan({cache:{version:IRAN_NEWS_CACHE_VERSION,items:[oldItem]},
  remoteSnapshot,now,preview:{status:'R12_DISPLAY_PREVIEW_ONLY_NO_WRITES',
   inspected:1,discovered14d:1,discoveryCounts:{feedSucceeded:3,feedFailed:1,apiFailed:0},
   results:[{status:'ELIGIBLE_SAFE_TEXT_ONLY'}]}}),/R13_DISCOVERY_INCOMPLETE/);
});
