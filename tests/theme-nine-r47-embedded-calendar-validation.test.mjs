import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cmdPath=path.join(repo,'scripts','pc-writer',
  'THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=Object.freeze([
  {section:'SCORER',filename:'theme-nine-r47-private-score.mjs',
    sha256:'30ed98bbcb76039eb949b53b5492727ada90e1e68c8d9612831d668d1aa4399c'},
  {section:'R35',filename:'theme-nine-r35-delta-collect.mjs',
    sha256:'1a7b8a40e449713978b51e5d2b909eb19ad03d846dfe44dc19b0d9831bb5dabe'},
]);
function extract(cmd,section){
  const begin='::R47_'+section+'_BEGIN';
  const end='::R47_'+section+'_END';
  const start=cmd.lastIndexOf(begin),finish=cmd.indexOf(end,start+begin.length);
  assert.ok(start>=0&&finish>start,'single pinned embedded section required');
  assert.equal(cmd.indexOf(begin,0),start,'duplicate section marker');
  assert.equal(cmd.indexOf(end,finish+end.length),-1,'duplicate end marker');
  return Buffer.from(cmd.slice(start+begin.length,finish)
    .replace(/[^A-Za-z0-9+/=]/g,''),'base64');
}

test('R47 immutable CMD candidate embeds exact R35 and scorer source bytes',()=>{
  const cmd=fs.readFileSync(cmdPath,'ascii');
  for(const {section,filename,sha256} of expected){
    const bytes=extract(cmd,section);
    const source=fs.readFileSync(path.join(repo,'scripts','pc-writer',filename));
    assert.equal(sha(bytes),sha256,section+' embedded checksum');
    assert.equal(sha(source),sha256,section+' source checksum');
    assert.deepEqual(bytes,source,section+' embedded byte parity');
    assert.equal(cmd.split("'"+sha256+"'").length,2,
      section+' one exact runtime guard digest');
  }
});

test('R47 candidate rejects normalized calendar days without changing other bundles',()=>{
  const cmd=fs.readFileSync(cmdPath,'ascii');
  const sections=[...cmd.matchAll(/::R47_([A-Z0-9]+)_BEGIN/g)].map(x=>x[1]);
  assert.equal(sections.length,16);
  assert.equal(new Set(sections).size,16);
  assert.ok(cmd.includes('BUNDLE_SHA_MISMATCH_R35'));
  assert.ok(cmd.includes('BUNDLE_SHA_MISMATCH_SCORER'));
  for(const {section} of expected){
    const code=extract(cmd,section).toString('utf8');
    assert.ok(code.includes("toISOString().slice(0,19)"),section);
  }
});
