import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,copyFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {withHistoricalR28Package,withHistoricalR32Package,withHistoricalR34Package}
 from './helpers/iran-r28-bundle.fixture.mjs';
import {r35SafeInstallationTime,planIranR35Upgrade,applyIranR35Upgrade}
 from '../scripts/iran-progress/news-display-upgrade-r35.mjs';
import {probeReplacementSourcesR35,R35_RECENT_ARTICLES}
 from '../scripts/iran-progress/news-display-replacements-r35.mjs';
import {IRAN_DISPLAY_FEEDS_R26}
 from '../scripts/iran-progress/news-display-source-registry-r26.mjs';
import {auditIranMultisourceCollectionR24}
 from '../scripts/iran-progress/news-display-multisource-audit-r24.mjs';
import {auditIranArticleDetailsR25}
 from '../scripts/iran-progress/news-display-article-audit-r25.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const now=Date.parse('2026-10-28T07:00:00Z');
const r24='scripts/iran-progress/news-display-multisource-audit-r24.mjs';
const r26='scripts/iran-progress/news-display-source-registry-r26.mjs';
const r25='scripts/iran-progress/news-display-article-audit-r25.mjs';

test('R35 replaces exactly the pinned R34 and R26 display modules, keeping recoverable backups',()=>{
 withHistoricalR34Package(root,r34=>withHistoricalR32Package(root,r32=>
  withHistoricalR28Package(root,pc=>{
   copyFileSync(path.join(r34,r24),path.join(pc,r24));
   copyFileSync(path.join(r32,r25),path.join(pc,r25));
   const beforeR25=readFileSync(path.join(pc,r25));
   const plan=planIranR35Upgrade({bundleRoot:root,projectRoot:pc,now});
   assert.equal(plan.status,'R35_PATCH_READY');
   assert.deepEqual(plan.checks.map(x=>x.relative),[r24,r26]);
   const previous=process.env.ZGMINI_IRAN_NEWS_R35_INSTALL_APPROVED;
   delete process.env.ZGMINI_IRAN_NEWS_R35_INSTALL_APPROVED;
   try{
    assert.throws(()=>applyIranR35Upgrade(plan,{now}),/R35_EXPLICIT_APPROVAL_REQUIRED/);
    process.env.ZGMINI_IRAN_NEWS_R35_INSTALL_APPROVED='YES';
    const result=applyIranR35Upgrade(plan,{now});
    assert.equal(result.status,'PASS_R35_TWO_PRIVATE_DISPLAY_MODULES_INSTALLED');
    for(const check of plan.checks){
     assert.deepEqual(readFileSync(check.destination),readFileSync(check.source));
     assert.equal(existsSync(check.backup),true);
    }
    assert.deepEqual(readFileSync(path.join(pc,r25)),beforeR25);
    assert.equal(planIranR35Upgrade({bundleRoot:root,projectRoot:pc,now}).status,
     'R35_ALREADY_INSTALLED');
   }finally{
    if(previous===undefined)delete process.env.ZGMINI_IRAN_NEWS_R35_INSTALL_APPROVED;
    else process.env.ZGMINI_IRAN_NEWS_R35_INSTALL_APPROVED=previous;
   }
  })));
});

test('R35 refuses near-scheduler install and pre-existing or partial source drift',()=>{
 assert.equal(r35SafeInstallationTime(Date.parse('2026-10-28T09:00:00Z')),false);
 assert.equal(r35SafeInstallationTime(now),true);
 withHistoricalR34Package(root,r34=>withHistoricalR32Package(root,r32=>
  withHistoricalR28Package(root,pc=>{
   copyFileSync(path.join(r34,r24),path.join(pc,r24));
   copyFileSync(path.join(r32,r25),path.join(pc,r25));
   assert.equal(planIranR35Upgrade({bundleRoot:root,projectRoot:pc,
    now:Date.parse('2026-10-28T09:00:00Z')}).status,
    'R35_NEAR_SCHEDULE_WINDOW_WAIT');
   assert.equal(existsSync(path.join(pc,r24)+'.before-iran-news-r35'),false);
   copyFileSync(path.join(root,r24),path.join(pc,r24));
   assert.throws(()=>planIranR35Upgrade({bundleRoot:root,projectRoot:pc,now}),
    /R35_PARTIAL_INSTALL_REQUIRES_REVIEW/);
   writeFileSync(path.join(pc,r26),'unapproved tampered registry');
   assert.throws(()=>planIranR35Upgrade({bundleRoot:root,projectRoot:pc,now}),
    /R35_PC_MODULE_DRIFT/);
  })));
});

test('R35 one-shot probe requires both discoverable original 27 Oct articles, never IAEA',async()=>{
 const requested=[];
 const feedCollector=options=>{
  assert.deepEqual(options.feeds.map(x=>x.id),['guardian-iran','dw-world']);
  return auditIranMultisourceCollectionR24({...options,fetcher:async url=>{
   requested.push(url);
   const entry=IRAN_DISPLAY_FEEDS_R26.find(x=>x.url===url);
   assert.ok(entry);
   const article=R35_RECENT_ARTICLES.find(x=>x.sourceId===entry.id);
   return new Response(`<rss><channel><item><title>Iran peace efforts</title>`+
    `<link>${article.url}</link></item></channel></rss>`);
  }});
 };
 const articleAuditor=options=>auditIranArticleDetailsR25({...options,
  fetcher:async url=>{
   requested.push(url);
   const article=R35_RECENT_ARTICLES.find(x=>x.url===url);
   assert.ok(article);
   const body=('Iran and Saudi diplomats discussed regional ceasefire negotiations. ').repeat(9);
   return new Response(`<!doctype html><html><head><link rel="canonical" href="${url}">`+
    `<script type="application/ld+json">${JSON.stringify({'@type':'NewsArticle',
     headline:'Iran peace efforts',datePublished:article.day+'T09:30:00Z'})}</script>`+
    `</head><body><article><p>${body}</p></article></body></html>`);
  }});
 const result=await probeReplacementSourcesR35({now,feedCollector,articleAuditor});
 assert.equal(result.status,'PASS_R35_TWO_27OCT_ARTICLES_REVIEWED');
 assert.equal(result.results.length,2);
 assert.ok(result.results.every(x=>x.privatelyVerified&&x.articleBodyAccessible));
 assert.ok(requested.every(url=>!url.includes('iaea.org')));
 assert.equal(result.pcCacheWritten,false);
 assert.equal(result.d1Written,false);
});

test('R35 installer is ASCII CRLF, one-time, probes before any mutation',()=>{
 const bytes=readFileSync(path.join(root,'IRAN_NEWS_R35_REPLACEMENT_INSTALL.cmd'));
 const cmd=bytes.toString('ascii');
 assert.ok(bytes.every(byte=>byte<128));
 assert.equal(cmd.replace(/\r\n/g,'').includes('\n'),false);
 assert.ok(cmd.indexOf('--preflight')<cmd.indexOf('--probe'));
 assert.ok(cmd.indexOf('--probe')<cmd.indexOf('--install'));
 assert.ok(cmd.indexOf('--install')<cmd.indexOf('--collect-once'));
 assert.match(cmd,/if exist "%ZG_R35_LOG%" goto :existing/);
 assert.match(cmd,/DO_NOT_RERUN_SEND_RESULT_FOR_REVIEW/);
 assert.doesNotMatch(cmd,/PowerShell|\bschtasks\b|\bwrangler\b/i);
});
