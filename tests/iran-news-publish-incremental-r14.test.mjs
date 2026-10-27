import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {publishIncrementalIranNewsR14} from '../scripts/iran-progress/news-display-publish-incremental-r14.mjs';
import {toDisplayNewsItem,RIGHTS_SOURCE,RIGHTS_POLICY_URL,IRAN_NEWS_CACHE_VERSION} from '../scripts/iran-progress/news-display-r1.mjs';
import {DISPLAY_CACHE_BASENAME} from '../scripts/iran-progress/news-display-io-r1.mjs';
import {buildIranNewsSnapshot} from '../lib/iran-progress/news-display-r1.mjs';
import {IRAN_GOVUK_NEWS_FEEDS} from '../scripts/iran-progress/news-display-discover-r1.mjs';

const now=Date.parse('2026-10-27T08:00:00.000Z');
const originalUrl='https://www.gov.uk/government/news/iran-conference';
const freshUrl='https://www.gov.uk/government/news/yemen-negotiations';
const approved=toDisplayNewsItem({source:'GOV.UK',sourceUrl:originalUrl,
 publishedAt:'2026-10-25T13:00:00.000Z',title:'검토 후 게시된 기존 한글 제목',
 summary:'기존 검증된 원문의 정확한 내용입니다.',impact:'neutral',
 rightsVerified:true,rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL},{now});

async function inDir(fn){
 const dir=mkdtempSync(path.join(tmpdir(),'iran-r14-once-'));
 try{
  writeFileSync(path.join(dir,'iran.sqlite'),'do not touch this score ledger');
  writeFileSync(path.join(dir,DISPLAY_CACHE_BASENAME),JSON.stringify({version:IRAN_NEWS_CACHE_VERSION,items:[approved]}));
  return await fn(dir);
 }finally{rmSync(dir,{recursive:true,force:true});}
}
function govFetcher({partial=false}={}){
 const page='<html><footer>All content is available under the Open Government Licence v3.0 except where otherwise stated</footer></html>';
 const metadata=url=>({base_path:new URL(url).pathname,
  title:url===originalUrl?'Iran conference':'Yemen negotiations',
  first_published_at:url===originalUrl?'2026-10-25T13:00:00.000Z':'2026-10-26T18:00:00.000Z',
  document_type:'press_release',details:{body:url===originalUrl?'<p>Iran</p>':'<p>Yemen</p>'},
  links:{organisations:[{base_path:'/government/organisations/foreign-commonwealth-development-office'}]}});
 return async url=>{
  if(IRAN_GOVUK_NEWS_FEEDS.includes(url)){
   if(partial&&url===IRAN_GOVUK_NEWS_FEEDS[0])return new Response('',{status:503});
   return new Response('<feed>'+[originalUrl,freshUrl].map(item=>
    `<entry><title>Official</title><updated>2026-10-27T02:00:00Z</updated><link href="${item}"/></entry>`).join('')+'</feed>');
  }
  if(url.startsWith('https://www.gov.uk/api/content/')){
   const article=url.endsWith(new URL(originalUrl).pathname)?originalUrl:freshUrl;
   return new Response(JSON.stringify(metadata(article)));
  }
  if([originalUrl,freshUrl].includes(url))return new Response(page);
  throw Error('Unexpected source '+url);
 };
}
function mockedD1({writeFails=false,drift=false}={}){
 const snapshot=buildIranNewsSnapshot([approved],{now:now-60000});
 let row={body:JSON.stringify(snapshot),stored_at:snapshot.publishedAt};
 let queries=0,writes=0;
 return {remote:{query:async(_db,sql,args)=>{
   assert.match(sql,/^SELECT body,stored_at FROM market_public_snapshots_v1/);
   assert.deepEqual(args,['public:iran-progress:news:iran:r1']);
   queries++;
   if(drift&&queries===3)return {results:[{...row,stored_at:row.stored_at+1}]};
   return {results:[row]};
  },request:async(_db,batch)=>{
   writes++;
   assert.equal(batch.length,1);
   assert.equal(batch[0].params[0],'public:iran-progress:news:iran:r1');
   if(writeFails)throw Error('Simulated D1 transport failure');
   row={body:batch[0].params[1],stored_at:batch[0].params[2]};
  }},get:()=>({row,queries,writes})};
}

test('R14 publishes only new source articles while retaining manually reviewed titles and score ledger',async()=>{
 await inDir(async dataDirectory=>{
  const d=mockedD1();
  const result=await publishIncrementalIranNewsR14({dataDirectory,remote:d.remote,db:'core',
   now,fetcher:govFetcher()});
  assert.equal(result.status,'PASS_R14_NEWS_ONLY_INCREMENTAL_PUBLISHED');
  assert.equal(result.newArticles,1);
  assert.equal(result.duplicatesPreserved,1);
  assert.equal(result.d1Publication,'VERIFIED');
  assert.equal(result.publicItemCount,2);
  assert.equal(d.get().writes,1);
  const saved=JSON.parse(readFileSync(path.join(dataDirectory,DISPLAY_CACHE_BASENAME),'utf8'));
  assert.deepEqual(saved.items.find(x=>x.id===approved.id),approved);
  const published=JSON.parse(d.get().row.body);
  assert.equal(published.itemCount,2);
  assert.equal(published.items.find(x=>x.id===approved.id).title,approved.title);
  assert.equal(readFileSync(path.join(dataDirectory,'iran.sqlite'),'utf8'),'do not touch this score ledger');
 });
});

test('R14 incomplete feed cannot change the PC cache or D1 news row',async()=>{
 await inDir(async dataDirectory=>{
  const original=readFileSync(path.join(dataDirectory,DISPLAY_CACHE_BASENAME),'utf8');
  const d=mockedD1();
  await assert.rejects(publishIncrementalIranNewsR14({dataDirectory,remote:d.remote,db:'core',now,
   fetcher:govFetcher({partial:true})}),/R13_DISCOVERY_INCOMPLETE/);
  assert.equal(readFileSync(path.join(dataDirectory,DISPLAY_CACHE_BASENAME),'utf8'),original);
  assert.equal(d.get().writes,0);
 });
});

test('R14 conflicting D1 change before any write stops without mutating either store',async()=>{
 await inDir(async dataDirectory=>{
  const before=readFileSync(path.join(dataDirectory,DISPLAY_CACHE_BASENAME),'utf8');
  const d=mockedD1({drift:true});
  await assert.rejects(publishIncrementalIranNewsR14({dataDirectory,remote:d.remote,db:'core',now,
   fetcher:govFetcher()}),/R14_D1_CHANGED_BEFORE_WRITE/);
  assert.equal(readFileSync(path.join(dataDirectory,DISPLAY_CACHE_BASENAME),'utf8'),before);
  assert.equal(d.get().writes,0);
 });
});

test('R14 transport failure preserves the independently written cache; never reports publication success',async()=>{
 await inDir(async dataDirectory=>{
  const d=mockedD1({writeFails:true});
  await assert.rejects(publishIncrementalIranNewsR14({dataDirectory,remote:d.remote,db:'core',now,
   fetcher:govFetcher()}),/NEWS_PUBLISH_OUTCOME_UNKNOWN/);
  assert.equal(d.get().writes,1);
  assert.equal(JSON.parse(readFileSync(path.join(dataDirectory,DISPLAY_CACHE_BASENAME),'utf8')).items.length,2);
  assert.equal(readFileSync(path.join(dataDirectory,'iran.sqlite'),'utf8'),'do not touch this score ledger');
 });
});
