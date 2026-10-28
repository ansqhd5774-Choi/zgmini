import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {withHistoricalR28Package,withHistoricalR32Package,withHistoricalR34Package}
 from './helpers/iran-r28-bundle.fixture.mjs';
import {r34SafeInstallationTime,planIranR34Upgrade,applyIranR34Upgrade}
 from '../scripts/iran-progress/news-display-upgrade-r34.mjs';
import {probeRecentIaeaR34,R34_RECENT_STATEMENTS}
 from '../scripts/iran-progress/news-display-recent-iaea-r34.mjs';
import {auditIranMultisourceCollectionR24}
 from '../scripts/iran-progress/news-display-multisource-audit-r24.mjs';
import {auditIranArticleDetailsR25}
 from '../scripts/iran-progress/news-display-article-audit-r25.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const now=Date.parse('2026-10-28T07:00:00Z');
const beforeR32='scripts/iran-progress/news-display-multisource-audit-r24.mjs';
const beforeR25='scripts/iran-progress/news-display-article-audit-r25.mjs';
const body=('Iran safeguards inspectors need full access as negotiations progress on nuclear material. ').repeat(10);
const page=(url,day)=>`<!doctype html><html><head><link rel="canonical" href="${url}">
 <meta property="og:title" content="Director General Iran nuclear verification">
 <meta name="dcterms.date" content="${day}T12:30:00Z"></head><body>
 <time datetime="${day}">${day}</time><div class="statement-body"><p>${body}</p></div></body></html>`;

test('R34 installs only SHA-pinned R24 over existing R32 and keeps recoverable copy',()=>{
 withHistoricalR34Package(root,r34=>withHistoricalR32Package(root,r32=>withHistoricalR28Package(root,pc=>{
  for(const relative of [beforeR32,beforeR25]){
   copyFileSync(path.join(r32,relative),path.join(pc,relative));
  }
  const plan=planIranR34Upgrade({bundleRoot:r34,projectRoot:pc,now});
  assert.equal(plan.status,'R34_PATCH_READY');
  const prior=process.env.ZGMINI_IRAN_NEWS_R34_INSTALL_APPROVED;
  delete process.env.ZGMINI_IRAN_NEWS_R34_INSTALL_APPROVED;
  try{
   assert.throws(()=>applyIranR34Upgrade(plan,{now}),/R34_EXPLICIT_APPROVAL_REQUIRED/);
   process.env.ZGMINI_IRAN_NEWS_R34_INSTALL_APPROVED='YES';
   const result=applyIranR34Upgrade(plan,{now});
   assert.equal(result.status,'PASS_R34_ONE_PRIVATE_SOURCE_MODULE_INSTALLED');
   assert.deepEqual(readFileSync(plan.backup),readFileSync(path.join(r32,beforeR32)));
   assert.deepEqual(readFileSync(plan.destination),readFileSync(plan.source));
   assert.deepEqual(readFileSync(path.join(pc,beforeR25)),readFileSync(path.join(r32,beforeR25)));
   assert.equal(planIranR34Upgrade({bundleRoot:r34,projectRoot:pc,now}).status,
    'R34_ALREADY_INSTALLED');
  }finally{
   if(prior===undefined)delete process.env.ZGMINI_IRAN_NEWS_R34_INSTALL_APPROVED;
   else process.env.ZGMINI_IRAN_NEWS_R34_INSTALL_APPROVED=prior;
  }
 })));
});

test('R34 rejects drift and scheduled-work windows before replacing any file',()=>{
 assert.equal(r34SafeInstallationTime(Date.parse('2026-10-28T09:00:00Z')),false);
 assert.equal(r34SafeInstallationTime(now),true);
 withHistoricalR34Package(root,r34=>withHistoricalR32Package(root,r32=>withHistoricalR28Package(root,pc=>{
  for(const relative of [beforeR32,beforeR25])
   copyFileSync(path.join(r32,relative),path.join(pc,relative));
  const near=planIranR34Upgrade({bundleRoot:r34,projectRoot:pc,
   now:Date.parse('2026-10-28T09:00:00Z')});
  assert.equal(near.status,'R34_NEAR_SCHEDULE_WINDOW_WAIT');
  assert.equal(existsSync(near.backup),false);
  writeFileSync(path.join(pc,beforeR32),'unapproved changed source');
  assert.throws(()=>planIranR34Upgrade({bundleRoot:r34,projectRoot:pc,now}),
   /R34_PC_MODULE_DRIFT/);
 })));
});

test('R34 detects both October statements absent from stale RSS and verifies publisher body',async()=>{
 const homepage='<!doctype html><html><body>'+R34_RECENT_STATEMENTS.map(x=>
  `<a href="${new URL(x.url).pathname}">Latest</a>`).join('')+'</body></html>';
 const fetcher=async url=>{
  if(url==='https://www.iaea.org/feeds/dgstatements')
   return new Response('<rss><channel><item><title>General governance</title><link>http://www.iaea.org/newscenter/statements/old-governance</link></item></channel></rss>');
  if(url==='https://www.iaea.org/')return new Response(homepage);
  const target=R34_RECENT_STATEMENTS.find(item=>item.url===url);
  if(target)return new Response(page(url,target.day));
  throw Error('UNEXPECTED_REQUEST');
 };
 const report=await probeRecentIaeaR34({now,
  feedCollector:options=>auditIranMultisourceCollectionR24({...options,fetcher}),
  articleAuditor:options=>auditIranArticleDetailsR25({...options,fetcher})});
 assert.equal(report.status,'PASS_R34_27OCT_LIVE_ARTICLE_REVIEWED');
 assert.equal(report.publisherFeeds[0].feedUrlsRead,2);
 assert.equal(report.candidateCount,2);
 assert.equal(report.results.length,2);
 assert.ok(report.results.every(x=>x.privatelyVerified&&x.articleBodyAccessible&&
  x.withinRetentionWindow&&x.bodyCharacterCount>200));
 assert.equal(report.pcCacheWritten,false);
 assert.equal(report.d1Written,false);
 assert.equal(JSON.stringify(report).includes(body),false);
});

test('R34 refuses to count a publisher 403 as an automatic article collection',async()=>{
 const homepage='<html><a href="'+new URL(R34_RECENT_STATEMENTS[0].url).pathname+
  '">Statement</a></html>';
 const fetcher=async url=>url==='https://www.iaea.org/'?new Response(homepage):
  url===R34_RECENT_STATEMENTS[0].url?new Response('Forbidden',{status:403}):
   new Response('<rss><channel></channel></rss>');
 const report=await probeRecentIaeaR34({now,
  feedCollector:options=>auditIranMultisourceCollectionR24({...options,fetcher}),
  articleAuditor:options=>auditIranArticleDetailsR25({...options,fetcher})});
 assert.equal(report.status,'PARTIAL_R34_27OCT_NOT_AUTO_COLLECTED');
 assert.equal(report.results[0].status,'ARTICLE_FETCH_FAILED');
 assert.equal(report.results[0].httpStatus,403);
 assert.equal(report.results[0].privatelyVerified,false);
});

test('R34 CMD is one-time, ASCII CRLF, and cannot modify scheduled jobs or D1',()=>{
 const bytes=readFileSync(path.join(root,'IRAN_NEWS_R34_RECENT_IAEA_INSTALL.cmd'));
 const cmd=bytes.toString('ascii');
 assert.ok(bytes.every(byte=>byte<128));
 assert.equal(cmd.replace(/\r\n/g,'').includes('\n'),false);
 assert.ok(cmd.indexOf('--preflight')<cmd.indexOf('--install'));
 assert.ok(cmd.indexOf('--probe')<cmd.indexOf('--collect-once'));
 assert.match(cmd,/if exist "%ZG_R34_LOG%" goto :existing/);
 assert.match(cmd,/IRAN_NEWS_R34_INSTALL_AND_COLLECT_RESULT\.txt/);
 assert.doesNotMatch(cmd,/PowerShell|\bschtasks\b|\/Run|\/Create|\/Change|\bwrangler\b/i);
});
