import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {planIranR38Upgrade,applyIranR38Upgrade,r38SafeInstallationTime}
 from '../scripts/iran-progress/news-display-upgrade-r38.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const now=Date.parse('2026-10-28T07:00:00Z'); // 16:00 KST, outside R13 window.
const files=['news-display-discover-r1.mjs','news-display-article-audit-r25.mjs'];
function withInstalled(fn){
 const pc=fs.mkdtempSync(path.join(os.tmpdir(),'iran-r38-pc-'));
 try{
  const dir=path.join(pc,'scripts','iran-progress');
  fs.mkdirSync(dir,{recursive:true});
  for(const file of files)fs.copyFileSync(path.join(root,'scripts','iran-progress',file),path.join(dir,file));
  return fn(pc);
 }finally{fs.rmSync(pc,{force:true,recursive:true});}
}

test('R38 enforces only authorized replacement identities and the six-hour schedule safety window',()=>{
 assert.equal(r38SafeInstallationTime(now),true);
 assert.equal(r38SafeInstallationTime(Date.parse('2026-10-28T09:00:00Z')),false);
 withInstalled(pc=>{
  const plan=planIranR38Upgrade({bundleRoot:root,projectRoot:pc,now});
  assert.equal(plan.status,'R38_ALREADY_INSTALLED');
  assert.equal(plan.moduleCount,2);
  assert.equal(plan.d1Written,false);
  assert.equal(plan.schedulerModified,false);
  assert.throws(()=>applyIranR38Upgrade(plan,{now}),/R38_EXPLICIT_APPROVAL_REQUIRED/);
  const dest=path.join(pc,'scripts','iran-progress',files[0]);
  const bytes=fs.readFileSync(dest);
  fs.appendFileSync(dest,'\n// unexpected drift');
  assert.throws(()=>planIranR38Upgrade({bundleRoot:root,projectRoot:pc,now}),/R38_PC_MODULE_DRIFT/);
  fs.writeFileSync(dest,bytes);
  const staged=dest+'.iran-news-r38.next';
  fs.writeFileSync(staged,'interrupted install');
  assert.throws(()=>planIranR38Upgrade({bundleRoot:root,projectRoot:pc,now}),/R38_STAGING_REQUIRES_REVIEW/);
 });
});

test('R38 CMD is a one-time ASCII/CRLF installer that never writes public data or changes tasks',()=>{
 const bytes=fs.readFileSync(path.join(root,'IRAN_NEWS_R38_KEYWORD_INSTALL.cmd'));
 const cmd=bytes.toString('ascii');
 assert.ok(bytes.every(b=>b<128));
 assert.equal(cmd.replace(/\r\n/g,'').includes('\n'),false);
 assert.match(cmd,/--preflight/);
 assert.match(cmd,/--install/);
 assert.match(cmd,/--verify/);
 assert.match(cmd,/RESULT_ALREADY_EXISTS/);
 assert.match(cmd,/DO_NOT_RERUN_OR_REMOVE_BACKUPS/);
 assert.doesNotMatch(cmd,/\bschtasks\b|\bwrangler\b|\bPowerShell\b/i);
});
