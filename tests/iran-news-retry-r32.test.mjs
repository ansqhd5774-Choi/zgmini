import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {planIranR32Upgrade,applyIranR32Upgrade}
 from '../scripts/iran-progress/news-display-upgrade-r32.mjs';
import {probeR32Historical,R32_HISTORICAL_SAMPLES}
 from '../scripts/iran-progress/news-display-historical-retry-r32.mjs';
import {withHistoricalR28Package,withHistoricalR32Package}
 from './helpers/iran-r28-bundle.fixture.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('R32 changes exactly two old, SHA-verified modules, keeping recoverable originals',()=>{
 withHistoricalR32Package(root,bundleRoot=>withHistoricalR28Package(root,projectRoot=>{
  const original=R32_HISTORICAL_SAMPLES.length;
  assert.equal(original,3);
  const plan=planIranR32Upgrade({bundleRoot,projectRoot});
  assert.equal(plan.status,'R32_PATCH_READY');
  assert.equal(plan.moduleCount,2);
  assert.ok(plan.checks.every(item=>item.state==='BEFORE'));
  const prior=process.env.ZGMINI_IRAN_NEWS_R32_INSTALL_APPROVED;
  delete process.env.ZGMINI_IRAN_NEWS_R32_INSTALL_APPROVED;
  try{
   assert.throws(()=>applyIranR32Upgrade(plan),/R32_EXPLICIT_APPROVAL_REQUIRED/);
   process.env.ZGMINI_IRAN_NEWS_R32_INSTALL_APPROVED='YES';
   const result=applyIranR32Upgrade(plan);
   assert.equal(result.status,'PASS_R32_TWO_PRIVATE_MODULES_INSTALLED');
   for(const item of plan.checks){
    assert.equal(existsSync(item.backup),true);
    assert.equal(readFileSync(item.backup).equals(readFileSync(item.source)),false);
    assert.deepEqual(readFileSync(item.destination),readFileSync(item.source));
   }
   assert.equal(planIranR32Upgrade({bundleRoot,projectRoot}).status,
    'R32_ALREADY_INSTALLED');
  }finally{
   if(prior===undefined)delete process.env.ZGMINI_IRAN_NEWS_R32_INSTALL_APPROVED;
   else process.env.ZGMINI_IRAN_NEWS_R32_INSTALL_APPROVED=prior;
  }
 }));
});

test('R32 refuses unapproved PC module drift before writing backups',()=>{
 withHistoricalR32Package(root,bundleRoot=>withHistoricalR28Package(root,projectRoot=>{
  const target=path.join(projectRoot,'scripts','iran-progress',
   'news-display-article-audit-r25.mjs');
  writeFileSync(target,'unapproved modified implementation');
  assert.throws(()=>planIranR32Upgrade({bundleRoot,projectRoot}),
   /R32_PC_MODULE_DRIFT/);
  assert.equal(existsSync(target+'.before-iran-news-r32'),false);
 }));
});

test('R32 direct historical probe proves three accessible publisher bodies without caching',async()=>{
 const result=await probeR32Historical({now:Date.parse('2026-10-28T05:00:00Z'),
  fetcher:async url=>new Response('<!doctype html><html><body>publisher content</body></html>'),
  inspector:({sourceId,sourceUrl})=>({sourceId,sourceUrl,
   status:sourceId==='aljazeera'?'ARTICLE_METADATA_REVIEWED':'OUTSIDE_30_DAY_WINDOW',
   articleBodyAccessible:true,scopeVerifiedFromArticle:true,
   publisherDeclaredPublishedAt:'2025-09-08T11:45:00.000Z',
   withinRetentionWindow:sourceId==='aljazeera'}),
 });
 assert.equal(result.status,'PASS_R32_THREE_HISTORICAL_ARTICLES_READONLY');
 assert.equal(result.verified,3);
 assert.deepEqual(result.results.map(item=>item.sourceId),
  ['aljazeera','iaea-news','iaea-statements']);
 assert.equal(result.pcCacheWritten,false);
 assert.equal(result.d1Written,false);
 assert.equal(result.schedulerModified,false);
});

test('R32 Windows CMD writes a result log and does not run Windows tasks',()=>{
 const bytes=readFileSync(path.join(root,'IRAN_NEWS_R32_RETRY_INSTALL.cmd'));
 const cmd=bytes.toString('ascii');
 assert.ok(bytes.every(byte=>byte<128));
 assert.equal(cmd.replace(/\r\n/g,'').includes('\n'),false);
 assert.match(cmd,/IRAN_NEWS_R32_RETRY_INSTALL_RESULT\.txt/);
 assert.ok(cmd.indexOf('--preflight')<cmd.indexOf('--install'));
 assert.ok(cmd.indexOf('--install')<cmd.indexOf('--probe'));
 assert.match(cmd,/\bpause\b/);
 assert.doesNotMatch(cmd,/PowerShell|\bschtasks\b|\/Run|\/Create|\/Change|\bwrangler\b/i);
});
