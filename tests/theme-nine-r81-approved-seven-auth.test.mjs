import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {approvedNineR54SevenToken} from '../scripts/pc-writer/theme-nine-r54-public-connect.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const approved=path.join(root,'scripts','pc-writer','theme-biotech-seven-auth-r8.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const fixture=()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r81-seven-'));
 const file=path.join(home,'themes','biotech','source-r8','scripts','pc-writer',
  'theme-biotech-seven-auth-r8.mjs');
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.copyFileSync(approved,file);
 return {home,file};
};

test('R54 exact approved R8 auth source reuses only a memory-only token',async t=>{
 const {home,file}=fixture();t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const called=[];
 const token=await approvedNineR54SevenToken({dataRoot:home,importer:async url=>{
  assert.equal(url,pathToFileURL(file).href);
  return {biotechApprovedSevenTokenR8:async args=>{
   called.push(args.dataRoot);
   return 'memory-only-approved-seven-token';
  }};
 }});
 assert.equal(token,'memory-only-approved-seven-token');
 assert.deepEqual(called,[home]);
});

test('R54 refuses drifted or missing approved R8 auth without trying to import',async t=>{
 const {home,file}=fixture();t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const importer=()=>{throw Error('MUST_NOT_IMPORT');};
 assert.equal(sha(fs.readFileSync(file)),
  '9b1f952f720abe0d6e631ad8fac908cfd51b00575690e9abea8cd09f1a6a4bd3');
 fs.appendFileSync(file,'\n// drift');
 await assert.rejects(approvedNineR54SevenToken({dataRoot:home,importer}),
  /SEVEN_AUTH_SOURCE_NOT_APPROVED/);
 fs.unlinkSync(file);
 await assert.rejects(approvedNineR54SevenToken({dataRoot:home,importer}));
});

test('R54 refuses missing approved seven token',async t=>{
 const {home}=fixture();t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 await assert.rejects(approvedNineR54SevenToken({dataRoot:home,importer:async()=>({
  biotechApprovedSevenTokenR8:async()=>''})}),/SEVEN_AUTH_TOKEN_UNAVAILABLE/);
});
