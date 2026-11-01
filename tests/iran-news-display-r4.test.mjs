import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {toDisplayNewsItem,IRAN_NEWS_CACHE_VERSION,RIGHTS_SOURCE,RIGHTS_POLICY_URL} from '../scripts/iran-progress/news-display-r1.mjs';
import {DISPLAY_CACHE_BASENAME} from '../scripts/iran-progress/news-display-io-r1.mjs';
import {FIRST_NEWS_URL,firstIranNewsSnapshot,inspectNewsD1FirstPublish,publishNewsD1FirstOnly} from '../scripts/iran-progress/news-display-publish-once-r4.mjs';

const now=Date.parse('2026-10-27T01:00:00.000Z');
const fixture={source:'GOV.UK',sourceUrl:FIRST_NEWS_URL,publishedAt:'2026-10-23T13:30:50.000Z',
 title:'영국 주재 중동 국방 수뇌부 회의에서 미·이란 분쟁 논의',
 summary:'영국 국방참모총장이 런던에서 걸프·중동 지역 국방 수뇌부 회의를 주재했다. 영국 국방부 발표에 따르면 참석자들은 미·이란 분쟁과 사우디아라비아를 향한 후티 공격 확대 등 지역 안보 현안을 논의했다.',
 impact:'neutral',rightsVerified:true,rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL};

test('R4 preflight reads the exact approved PC cache; never writes remotely',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'iran-news-r4-preflight-'));
 try{
  const item=toDisplayNewsItem(fixture,{now});
  assert.ok(item);
  writeFileSync(path.join(dir,DISPLAY_CACHE_BASENAME),JSON.stringify({version:IRAN_NEWS_CACHE_VERSION,items:[item]}));
  let writes=0;
  const remote={query:async(_db,sql,args)=>{
   assert.match(sql,/^SELECT body,stored_at FROM market_public_snapshots_v1/);
   assert.equal(args[0],'public:iran-progress:news:iran:r1');
   return {results:[]};
  },request:async()=>{writes++;}};
  const snapshot=await inspectNewsD1FirstPublish(remote,'core',dir,{now});
  assert.equal(snapshot.itemCount,1);
  assert.equal(writes,0);
  assert.equal(firstIranNewsSnapshot(dir,{now}).items[0].sourceUrl,FIRST_NEWS_URL);
  const modified={...item,title:'Altered article'};
  writeFileSync(path.join(dir,DISPLAY_CACHE_BASENAME),JSON.stringify({version:IRAN_NEWS_CACHE_VERSION,items:[modified]}));
  await assert.rejects(inspectNewsD1FirstPublish(remote,'core',dir,{now}),/NEWS_R4_REVIEWED_ARTICLE_MISMATCH/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('R4 D1-only publish writes one isolated key and reads it back, then refuses republish',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'iran-news-r4-publish-'));
 try{
  const item=toDisplayNewsItem(fixture,{now});
  writeFileSync(path.join(dir,DISPLAY_CACHE_BASENAME),JSON.stringify({version:IRAN_NEWS_CACHE_VERSION,items:[item]}));
  let row=null,writes=0;
  const remote={query:async()=>({results:row?[row]:[]}),request:async(db,batch)=>{
   assert.equal(db,'core');assert.equal(batch.length,1);
   assert.equal(batch[0].params[0],'public:iran-progress:news:iran:r1');
   row={body:batch[0].params[1],stored_at:batch[0].params[2]};writes++;
  }};
  const published=await publishNewsD1FirstOnly(remote,'core',dir,{now});
  assert.equal(published.status,'PASS_D1_NEWS_ONLY_PUBLISHED');
  assert.equal(published.itemCount,1);assert.equal(writes,1);
  assert.equal(JSON.parse(row.body).items[0].title,fixture.title);
  await assert.rejects(publishNewsD1FirstOnly(remote,'core',dir,{now}),/NEWS_R4_TARGET_KEY_ALREADY_EXISTS/);
  assert.equal(writes,1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
