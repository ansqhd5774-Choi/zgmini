import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cmd=fs.readFileSync(path.join(root,'scripts/pc-writer/THEME_NINE_EXISTING_PROVISIONAL_UPGRADE.cmd'));
const source=cmd.toString('ascii');
const digest=b=>createHash('sha256').update(b).digest('hex');
const files=[
 'scripts/pc-writer/theme-nine-r54-public-connect.mjs',
 'scripts/pc-writer/theme-nine-r51-stage-current.mjs',
 'scripts/pc-writer/theme-nine-r51-provisional-overlay.mjs',
 'worker/theme-nine-r37-public.mjs',
];

test('R61 is a single ASCII CRLF Windows CMD file, preserving the existing installed job',()=>{
 assert.match(source,/^@echo off\r\n/);
 assert.ok(!cmd.includes(Buffer.from([0xef,0xbb,0xbf])));
 assert.ok(!/(^|[^\r])\n/.test(source));
 assert.ok(!/[^\x00-\x7f]/.test(source));
 assert.match(source,/THEME_NINE_R54_PUBLIC_CYCLE\.cmd/);
 assert.match(source,/THEME_NINE_EXISTING_PROVISIONAL_UPGRADE_RESULT_/);
 assert.match(source,/RESULT=STOP_SOURCE_UPGRADE_SHA_OR_BACKUP_GATE/);
 assert.match(source,/RESULT=NOT_YET_PUBLIC_CHECK_R54_GATE_LOG/);
 assert.doesNotMatch(source,/schtasks\s+\/(create|delete|change)/i);
 assert.doesNotMatch(source,/wrangler\s+d1\s+execute/i);
});

test('R61 bundles exactly four source files with byte-for-byte hashes',()=>{
 const markers=[...source.matchAll(/^::R61_(F\d{2})_BEGIN\r$/gm)].map(x=>x[1]);
 assert.deepEqual(markers,['F01','F02','F03','F04']);
 for(let i=0;i<files.length;i++){
  const key=`F${String(i+1).padStart(2,'0')}`;
  const match=source.match(new RegExp(`::R61_${key}_BEGIN\\r\\n([\\s\\S]*?)::R61_${key}_END`));
  assert.ok(match,key);
  const bytes=Buffer.from(match[1].replace(/[^A-Za-z0-9+/=]/g,''),'base64');
  assert.equal(digest(bytes),digest(fs.readFileSync(path.join(root,files[i]))),files[i]);
 }
});
