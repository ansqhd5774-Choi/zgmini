import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {matchesPreservedR29Dependency,R29_PRESERVED_PC_NEWS_LIB_SHA}
 from '../scripts/iran-progress/news-display-install-hook-r29.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const libPath='lib/iran-progress/news-display-r1.mjs';

test('R30 permits only the exact pre-translation R15 PC display library',()=>{
 const current=readFileSync(path.join(root,libPath));
 const text=current.toString('utf8');
 const begin=text.indexOf(' const englishFields=item.titleEn!==undefined');
 const end=text.indexOf(" return typeof item.id==='string'",begin);
 assert.ok(begin>0&&end>begin,'expected only translation validation block');
 const legacy=Buffer.from(text.slice(0,begin)+text.slice(end));
 assert.equal(sha(legacy),R29_PRESERVED_PC_NEWS_LIB_SHA);
 assert.equal(matchesPreservedR29Dependency(libPath,legacy,current),true);
 assert.equal(matchesPreservedR29Dependency(libPath,current,current),true);
 assert.equal(matchesPreservedR29Dependency(libPath,Buffer.from(legacy.toString().replace(
  "item.source==='GOV.UK'","item.source==='UNVERIFIED'")),current),false);
 assert.equal(matchesPreservedR29Dependency(libPath,Buffer.from(legacy.toString().replace(/\n/g,'\r\n')),current),false);
 assert.equal(matchesPreservedR29Dependency('scripts/iran-progress/news-display-discover-r1.mjs',legacy,current),false);
});

test('R30 preserves exact existing dependencies and bounded sources CRLF tolerance',()=>{
 const current=Buffer.from('one\ntwo\n');
 assert.equal(matchesPreservedR29Dependency('scripts/iran-progress/sources.mjs',Buffer.from('one\r\ntwo\r\n'),current),true);
 assert.equal(matchesPreservedR29Dependency('scripts/iran-progress/sources.mjs',Buffer.from('one\r\nEVIL\r\n'),current),false);
 assert.equal(matchesPreservedR29Dependency('scripts/iran-progress/news-display-discover-r1.mjs',current,current),true);
 assert.equal(matchesPreservedR29Dependency('scripts/iran-progress/news-display-discover-r1.mjs',Buffer.from('different'),current),false);
});

test('R30 installer CMD is offline, ASCII CRLF, and checks preflight before install',()=>{
 const file=readFileSync(path.join(root,'IRAN_NEWS_R30_COMPAT_INSTALL.cmd'));
 assert.ok(file.every(byte=>byte<128));
 const content=file.toString('ascii');
 assert.equal(content.replace(/\r\n/g,'').includes('\n'),false);
 assert.ok(content.indexOf('--preflight')<content.indexOf('--install'));
 assert.match(content,/IRAN_NEWS_R30_COMPAT_INSTALL_RESULT\.txt/);
 assert.match(content,/ZGMINI_IRAN_NEWS_R29_INSTALL_APPROVED=YES/);
 assert.doesNotMatch(content,/\bcurl\b|raw\.githubusercontent\.com|PowerShell|Invoke-WebRequest|\/Create|\/Change|wrangler/i);
});
