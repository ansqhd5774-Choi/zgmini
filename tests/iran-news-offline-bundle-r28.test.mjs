import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyIranOfflineBundleR28,R28_APPROVED_MODULE_SHA256}
 from '../scripts/iran-progress/news-display-offline-bundle-r28.mjs';
import {withHistoricalR28Package} from './helpers/iran-r28-bundle.fixture.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('R28 portable package checks all seven reviewed local source modules',()=>{
 assert.equal(Object.keys(R28_APPROVED_MODULE_SHA256).length,7);
 withHistoricalR28Package(root,directory=>{
  const result=verifyIranOfflineBundleR28({directory});
  assert.equal(result.bundleStatus,'PASS_R28_OFFLINE_MODULE_INTEGRITY');
  assert.equal(result.verifiedModules,7);
 });
});

test('R28 refuses even one altered module before collecting any news',()=>{
 withHistoricalR28Package(root,directory=>{
  assert.equal(verifyIranOfflineBundleR28({directory}).verifiedModules,7);
  appendFileSync(path.join(directory,'scripts','iran-progress',
   'news-display-collection-r26.mjs'),'\n// altered');
  assert.throws(()=>verifyIranOfflineBundleR28({directory}),/R28_PACKAGE_MODULE_HASH_MISMATCH/);
 });
});

test('R28 Windows CMD is ASCII/CRLF, runs packaged code and never downloads scripts',()=>{
 const bytes=readFileSync(path.join(root,'IRAN_NEWS_R28_OFFLINE_APPLY.cmd'));
 const content=bytes.toString('ascii');
 assert.ok(bytes.every(byte=>byte<128));
 assert.equal(content.replace(/\r\n/g,'').includes('\n'),false);
 assert.match(content,/news-display-offline-bundle-r28\.mjs/);
 assert.match(content,/node "%ZG_R28_RUNNER%" --check/);
 assert.match(content,/node "%ZG_R28_RUNNER%" --collect/);
 assert.match(content,/IRAN_NEWS_R28_OFFLINE_APPLY_RESULT\.txt/);
 assert.doesNotMatch(content,/\bcurl\b|Invoke-WebRequest|PowerShell|schtasks|wrangler/i);
 assert.match(content,/ZGMINI_IRAN_NEWS_R28_APPROVED=YES/);
});
