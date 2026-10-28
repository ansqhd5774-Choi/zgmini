import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectIranArticleR25} from '../scripts/iran-progress/news-display-article-audit-r25.mjs';
import {verifyR33SavedIaeaHtml,r33BundleRoot}
 from '../scripts/iran-progress/news-display-manual-iaea-r33.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const now=Date.parse('2026-10-28T08:00:00Z');
const urls={
 news:'https://www.iaea.org/newscenter/news/restoring-iaea-inspections-in-iran-would-create-promising-ground-for-wider-progress-says-director-general-grossi',
 statement:'https://www.iaea.org/newscenter/statements/iaea-director-general-grossis-statement-to-unsc-on-situation-in-iran-22-june-2025',
};
const body=('The IAEA and Iran discussed nuclear inspections and regional safety. ').repeat(6);
function page(kind,{canonical=urls[kind],date=kind==='news'?'2025-09-08':'2025-06-22',
 title='Iran nuclear verification',bodyText=body}={}){
 const classname=kind==='news'?'news-story-body':'statement-body';
 return `<!doctype html><html><head><link rel="canonical" href="${canonical}">`+
  `<meta property="og:title" content="${title}">`+
  `<meta name="dcterms.date" content="${date}T11:45:00Z"></head><body>`+
  `<time datetime="${date}">${date}</time><div class="${classname}">`+
  `<p>${bodyText}</p></div></body></html>`;
}
async function fixture(fn){
 const directory=mkdtempSync(path.join(tmpdir(),'iran-r33-'));
 try{return await fn(directory);}
 finally{rmSync(directory,{recursive:true,force:true});}
}
function save(directory,kind,options){
 writeFileSync(path.join(directory,kind==='news'?'IAEA_NEWS.html':'IAEA_STATEMENT.html'),
  page(kind,options));
}

test('R33 verifies two browser-saved historical pages without collecting or publishing',async()=>{
 await fixture(directory=>{
  save(directory,'news');save(directory,'statement');
  writeFileSync(path.join(directory,'iran.sqlite'),'protected score ledger');
  const result=verifyR33SavedIaeaHtml({directory,inspector:inspectIranArticleR25,now});
  assert.equal(result.status,'PASS_R33_TWO_MANUAL_HISTORICAL_HTML_REVIEWED');
  assert.equal(result.verified,2);
  assert.deepEqual(result.results.map(item=>item.sourceId),['iaea-news','iaea-statements']);
  assert.ok(result.results.every(item=>item.manualHistoricalVerified===true&&
   item.articleBodyAccessible===true&&item.bodyCharacterCount>=200&&
   item.within30DayWindow===false&&item.autoCollected===false&&
   /^[a-f0-9]{64}$/.test(item.sha256)));
  assert.equal(result.automaticArticleCollectionVerified,false);
  assert.equal(result.pcCacheWritten,false);
  assert.equal(result.d1Written,false);
  assert.equal(readFileSync(path.join(directory,'iran.sqlite'),'utf8'),'protected score ledger');
  assert.equal(existsSync(path.join(directory,'news-display-candidates-r26.json')),false);
  assert.equal(JSON.stringify(result).includes(body),false);
 });
});

test('R33 rejects missing, mismatched and redirected user-saved pages',async()=>{
 await fixture(directory=>{
  save(directory,'news',{canonical:'https://example.org/forged'});
  const missing=verifyR33SavedIaeaHtml({directory,inspector:inspectIranArticleR25,now});
  assert.equal(missing.status,'PARTIAL_R33_MANUAL_HISTORICAL_HTML_REVIEW');
  assert.equal(missing.verified,0);
  assert.deepEqual(missing.results.map(item=>item.status),
   ['R33_CANONICAL_UNVERIFIED','R33_SAVED_HTML_MISSING']);

  save(directory,'news',{date:'2025-09-09'});
  save(directory,'statement',{bodyText:'A short teaser.'});
  const invalid=verifyR33SavedIaeaHtml({directory,inspector:inspectIranArticleR25,now});
  assert.equal(invalid.verified,0);
  assert.deepEqual(invalid.results.map(item=>item.status),
   ['R33_EXPECTED_PUBLICATION_DAY_MISMATCH','ARTICLE_BODY_UNVERIFIED']);
 });
});

test('R33 never trusts a symlink as a saved HTML input',async()=>{
 await fixture(directory=>{
  save(directory,'news');
  symlinkSync(path.join(directory,'IAEA_NEWS.html'),
   path.join(directory,'IAEA_STATEMENT.html'));
  const result=verifyR33SavedIaeaHtml({directory,inspector:inspectIranArticleR25,now});
  assert.equal(result.verified,1);
  assert.equal(result.results[1].status,'R33_INPUT_FILE_UNSAFE');
 });
});

test('R33 Windows launcher is read-only, ASCII/CRLF and has no task or network command',()=>{
 const bytes=readFileSync(path.join(root,'IRAN_NEWS_R33_MANUAL_IAEA_VERIFY.cmd'));
 const cmd=bytes.toString('ascii');
 assert.ok(bytes.every(byte=>byte<128));
 assert.equal(cmd.replace(/\r\n/g,'').includes('\n'),false);
 assert.match(cmd,/IAEA_NEWS\.html and IAEA_STATEMENT\.html/);
 assert.match(cmd,/--verify/);
 assert.match(cmd,/STOP_R33_HTML_INPUTS_MISSING/);
 assert.match(cmd,/IRAN_NEWS_R33_MANUAL_IAEA_RESULT\.txt/);
 assert.match(cmd,/\bpause\b/);
 assert.doesNotMatch(cmd,/PowerShell|curl|schtasks|wrangler|Invoke-WebRequest|\/Run|\/Create|\/Change/i);
 assert.equal(r33BundleRoot(),root);
});
