import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const cmd=fs.readFileSync(path.join(root,
 'scripts/pc-writer/THEME_NINE_R54_PUBLIC_CONNECT.cmd'),'ascii');
const sha=b=>createHash('sha256').update(b).digest('hex');

test('R54 is a portable SHA-checked standalone one-file Windows CMD',()=>{
 assert.match(cmd,/^@echo off\r\n/);
 assert.doesNotMatch(cmd,/(?<!\r)\n|[^\x00-\x7f]/);
 assert.match(cmd,/EXISTING_R47_R48_TASKS_CHANGED=NO/);
 assert.match(cmd,/--accept-anonymous-license-risk/);
 assert.match(cmd,/Cloudflare|CLOUDFLARE/i);
 assert.match(cmd,/Type ACCEPT to publish/);
 assert.match(cmd,/ZGMINI-PC-Theme-Nine-R54-Public/);
 assert.doesNotMatch(cmd,/\/F\b|schtasks\s+\/Delete/i);
 const specs=[...cmd.matchAll(/'F\d{2}\|[^']+\|[a-f0-9]{64}'/g)]
  .map(m=>m[0].slice(1,-1).split('|'));
 assert.equal(specs.length,15);
 for(const [key,name,expected] of specs){
  const head=`::R54_${key}_BEGIN`,tail=`::R54_${key}_END`;
  const begin=cmd.lastIndexOf(head),end=cmd.indexOf(tail,begin+head.length);
  assert.ok(begin>=0&&end>begin,name);
  const bytes=Buffer.from(cmd.slice(begin+head.length,end)
   .replace(/[^A-Za-z0-9+/=]/g,''),'base64');
  assert.equal(sha(bytes),expected,name);
  // Git stores module/JSON sources with LF; Windows autocrlf checkouts may
  // contain CRLF. The embedded payload remains SHA-checked byte-for-byte.
  const source=fs.readFileSync(path.join(root,name));
  const canonical=name.endsWith('.cmd')?source:
   Buffer.from(source.toString('utf8').replace(/\r\n/g,'\n'));
  assert.deepEqual(bytes,canonical,name);
 }
});
