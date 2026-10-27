import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {exactR15RunnerExtension,R15_HOOK,R15_INSTALLED_PATHS} from '../scripts/iran-progress/news-display-install-auto-r15.mjs';
import {readExistingD1Token,checkLocalR15Installation,runScheduledIranNewsR15,R15_STATUS_FILE} from '../scripts/iran-progress/news-display-auto-run-r15.mjs';
import {toDisplayNewsItem,RIGHTS_SOURCE,RIGHTS_POLICY_URL,IRAN_NEWS_CACHE_VERSION} from '../scripts/iran-progress/news-display-r1.mjs';
import {buildIranNewsSnapshot} from '../lib/iran-progress/news-display-r1.mjs';
import {IRAN_GOVUK_NEWS_FEEDS} from '../scripts/iran-progress/news-display-discover-r1.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const now=Date.parse('2026-10-27T09:00:00.000Z');
const url='https://www.gov.uk/government/news/iran-r15';
const old=toDisplayNewsItem({source:'GOV.UK',sourceUrl:url,title:'검증된 기존 이란 보도',
 publishedAt:'2026-10-25T13:00:00.000Z',summary:'검증된 공식 이란 소식입니다.',
 impact:'neutral',rightsVerified:true,rightsSource:RIGHTS_SOURCE,
 rightsPolicyUrl:RIGHTS_POLICY_URL},{now});

test('R15 task runner is an EXACT appended news-only block over the R7 runner',()=>{
 const after=readFileSync(path.join(here,'../scripts/iran-progress/run-reference-flow-r3.mjs'),'utf8');
 const before=after.replace(R15_HOOK,'');
 assert.notEqual(before,after);
 assert.equal(exactR15RunnerExtension(before,after),true);
 assert.equal(exactR15RunnerExtension(before.replace('--apply','--dry-run'),after),false);
 assert.equal(exactR15RunnerExtension(before,after.replace('--scheduled','--collect-publish')),false);
 assert.equal(R15_INSTALLED_PATHS.length,12);
});

test('R15 consumes only existing token without refresh or credential logging',()=>{
 assert.equal(readExistingD1Token({now,env:{CLOUDFLARE_API_TOKEN:'configured-token'},
  readFile:()=>{throw Error('MUST_NOT_READ_FILE');}}),'configured-token');
 const config='oauth_token = "already-known"\nexpiration_time = "2026-10-27T10:00:00.000Z"';
 assert.equal(readExistingD1Token({now,env:{},userHome:'/not-used',readFile:()=>config}),'already-known');
 assert.throws(()=>readExistingD1Token({now,env:{},userHome:'/not-used',
  readFile:()=>config.replace('10:00:00','09:01:00')}),/NEWS_AUTO_CONFIGURED_D1_TOKEN_EXPIRED/);
});

async function withFixture(fn){
 const dir=mkdtempSync(path.join(tmpdir(),'iran-news-r15-'));
 try{
  writeFileSync(path.join(dir,'iran.sqlite'),'test score ledger unchanged');
  writeFileSync(path.join(dir,'news-display-r1.json'),JSON.stringify({version:IRAN_NEWS_CACHE_VERSION,items:[old]}));
  return await fn(dir);
 }finally{rmSync(dir,{recursive:true,force:true});}
}

test('R15 local install check inspects display-only files without touching them',async()=>{
 await withFixture(async dir=>{
  const original=readFileSync(path.join(dir,'news-display-r1.json'),'utf8');
  const r=checkLocalR15Installation(dir,{now});
  assert.equal(r.status,'PASS_R15_LOCAL_INSTALLATION_READ_ONLY');
  assert.equal(r.displayItems,1);
  assert.equal(readFileSync(path.join(dir,'news-display-r1.json'),'utf8'),original);
  assert.equal(existsSync(path.join(dir,R15_STATUS_FILE)),false);
 });
});

test('R15 scheduled runner uses one D1 news-only key, verifies output and records a one-file status',async()=>{
 await withFixture(async dir=>{
  const previous=buildIranNewsSnapshot([old],{now:now-20000});
  let row={body:JSON.stringify(previous),stored_at:previous.publishedAt};let writes=0;
  const remote={query:async(_db,sql,params)=>{
   assert.match(sql,/^SELECT body,stored_at/);
   assert.deepEqual(params,['public:iran-progress:news:iran:r1']);
   return {results:[row]};
  },request:async(_db,batch)=>{
   writes++;assert.equal(batch[0].params[0],'public:iran-progress:news:iran:r1');
   row={body:batch[0].params[1],stored_at:batch[0].params[2]};
  }};
  const fetcher=async request=>{
   if(IRAN_GOVUK_NEWS_FEEDS.includes(request))
    return new Response(`<feed><entry><title>Iran news</title><updated>2026-10-27T05:00:00Z</updated><link href="${url}"/></entry></feed>`);
   if(request==='https://www.gov.uk/api/content/government/news/iran-r15')
    return new Response(JSON.stringify({base_path:'/government/news/iran-r15',title:'Iran news',
     first_published_at:'2026-10-25T13:00:00.000Z',document_type:'press_release',
     details:{body:'<p>Iran statement</p>'},links:{organisations:[{base_path:'/government/organisations/foreign-commonwealth-development-office'}]}}));
   if(request===url)return new Response('<footer>Open Government Licence v3.0</footer>');
   throw Error('Unexpected source');
  };
  let observedToken=null;
  const result=await runScheduledIranNewsR15({dataDirectory:dir,now,
   config:{account:'a'.repeat(32),core:'core'},token:'memory-only-token',
   d1Client:(_config,token)=>{observedToken=token;return remote;},fetcher});
  assert.equal(observedToken,'memory-only-token');
  assert.equal(result.status,'PUBLISHED_D1_VERIFIED');
  assert.equal(result.publicItemCount,1);
  assert.equal(result.newArticles,0);
  assert.equal(writes,1);
  const status=JSON.parse(readFileSync(path.join(dir,R15_STATUS_FILE),'utf8'));
  assert.deepEqual(status,result);
  assert.equal(JSON.stringify(status).includes('memory-only-token'),false);
  assert.equal(readFileSync(path.join(dir,'iran.sqlite'),'utf8'),'test score ledger unchanged');
 });
});
