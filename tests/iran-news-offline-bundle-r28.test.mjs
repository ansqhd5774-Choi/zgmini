import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,copyFileSync,appendFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyIranOfflineBundleR28,R28_APPROVED_MODULE_SHA256}
 from '../scripts/iran-progress/news-display-offline-bundle-r28.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('R28 portable package checks all seven reviewed local source modules',()=>{
 assert.equal(Object.keys(R28_APPROVED_MODULE_SHA256).length,7);
 const result=verifyIranOfflineBundleR28({directory:root});
 assert.equal(result.bundleStatus,'PASS_R28_OFFLINE_MODULE_INTEGRITY');
 assert.equal(result.verifiedModules,7);
});

test('R28 refuses even one altered module before collecting any news',()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'iran-r28-bundle-'));
 try{
  for(const relative of Object.keys(R28_APPROVED_MODULE_SHA256)){
   const full=path.join(directory,...relative.split('/'));
   mkdirSync(path.dirname(full),{recursive:true});
   copyFileSync(path.join(root,...relative.split('/')),full);
  }
  assert.equal(verifyIranOfflineBundleR28({directory}).verifiedModules,7);
  appendFileSync(path.join(directory,'scripts','iran-progress',
   'news-display-collection-r26.mjs'),'\n// altered');
  assert.throws(()=>verifyIranOfflineBundleR28({directory}),/R28_PACKAGE_MODULE_HASH_MISMATCH/);
 }finally{rmSync(directory,{recursive:true,force:true});}
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
