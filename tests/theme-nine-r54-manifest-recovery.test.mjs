import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyNineR54RawManifest}
 from '../scripts/pc-writer/theme-nine-r54-public-connect.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=obj=>Buffer.from(JSON.stringify(obj,null,2)+'\n');

function sample(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-r54-manifest-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,'themes','legacy-nine-r23');
 fs.mkdirSync(path.join(home,'raw'),{recursive:true});
 const rows=Array.from({length:65},(_,i)=>{
  const symbol=`T${String(i).padStart(2,'0')}`;
  const data=Buffer.from(`{"symbol":"${symbol}","close":100}\n`);
  const hash=sha(data);
  fs.writeFileSync(path.join(home,'raw',`${symbol}_${hash}.jsonl`),data);
  return {path:`raw/${symbol}_${hash}.jsonl`,symbol,sha256:hash,
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'};
 });
 const make=files=>({version:1,project:'legacy-nine-r23',
  rosterSha256:'a'.repeat(64),source:'https://example.invalid',
  licenseStatus:'PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED',files});
 const old=bytes(make(rows.slice(0,64)));
 const current=bytes(make(rows));
 fs.writeFileSync(path.join(home,'raw-manifest.json'),current);
 return {root,home,oldHash:sha(old),currentHash:sha(current),rows};
}

test('R54 verifies a historical immutable manifest prefix without trusting current manifest SHA',t=>{
 const input=sample(t);
 const proof=verifyNineR54RawManifest({dataRoot:input.root,
  source:{baselineManifestSha256:input.oldHash}});
 assert.equal(proof.sourceManifestVerified,true);
 assert.equal(proof.rawFilesShaVerified,64);
 const archive=path.join(input.home,'manifest-history',
  `raw-manifest-${input.oldHash}.json`);
 assert.equal(sha(fs.readFileSync(archive)),input.oldHash);
 assert.equal(sha(fs.readFileSync(path.join(input.home,'raw-manifest.json'))),
  input.currentHash);
});

test('R54 still rejects unprovable manifest hashes and changed raw source bytes',t=>{
 const input=sample(t);
 assert.throws(()=>verifyNineR54RawManifest({dataRoot:input.root,
  source:{baselineManifestSha256:'b'.repeat(64)}}),
  /SOURCE_MANIFEST_SHA_DRIFT/);
 const entry=input.rows[0];
 fs.writeFileSync(path.join(input.home,entry.path),'changed raw');
 assert.throws(()=>verifyNineR54RawManifest({dataRoot:input.root,
  source:{baselineManifestSha256:input.oldHash}}),
  /SOURCE_RAW_PAGE_SHA_DRIFT/);
});
