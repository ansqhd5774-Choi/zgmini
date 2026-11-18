import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(root,'scripts','pc-writer','THEME_NINE_R49_ONE_CLICK_PRIVATE_AUTO_INSTALL.cmd');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
// R49 is immutable: these are the seven hashes inside its embedded installer,
// not hashes of separately evolving repository files (notably R47 and R52).
const originalR49BundleSha=Object.freeze({
  R47:'2133e5d4e625762340e715ecd21e809f274713c030e904e3e3f314dc3b6a0729',
  CYCLE:'7356da2ae151eceb2b3306b40c13de3394eef3476e15ca1528128006748ed0c4',
  BRIDGE:'9451bac02a76052a7798e847b9259408a28573041027420831feb0699b36a881',
  STAGE:'d3a5afad2adee9c9e14382384b7ba8c87f88e016a8880571d975b7d64010f2ea',
  SCHEDULE:'c09eba0293f204da45308a00f51c52c9b604ac97649cb186032185d47d179b92',
  ROSTER:'e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c',
  AUM:'2a8b3ec24a72e34de39e0b2c393275550ea03ea560922b8379db9bbafdfdfef9'
});
const sources=[
  ['R47','scripts/pc-writer/THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd'],
  ['CYCLE','scripts/pc-writer/THEME_NINE_R48_PRIVATE_CYCLE.cmd'],
  ['BRIDGE','scripts/pc-writer/theme-nine-r48-r47-bridge.mjs'],
  ['STAGE','scripts/pc-writer/theme-nine-r48-stage-current.mjs'],
  ['SCHEDULE','scripts/pc-writer/theme-nine-r48-private-schedule.mjs'],
  ['ROSTER','config/theme-nine-r20-approved-candidates.json'],
  ['AUM','config/theme-nine-r26-official-aum-evidence.json']
];

const load=()=>fs.readFileSync(script,'ascii');
const extractor=contents=>{
  const line=contents.split('\r\n').find(l=>l.startsWith('"%R49_NODE%" -e "'));
  assert.ok(line,'R49 Node extractor invocation missing');
  const prefix='"%R49_NODE%" -e "';
  const suffix='" >>"%R49_REPORT%" 2>&1';
  assert.ok(line.endsWith(suffix));
  return line.slice(prefix.length,-suffix.length);
};
const require=createRequire(import.meta.url);
const extractTo=(cmd,dest)=>{
  const messages=[];
  runInNewContext(extractor(cmd),{require,Buffer,
    process:{env:{R49_SELF:script,R49_INSTALL:dest}},
    console:{log:line=>messages.push(line)}});
  return messages.join('\n');
};

test('R49 is one-file CRLF ASCII with all seven byte-identical SHA sections',()=>{
  const bytes=fs.readFileSync(script),cmd=bytes.toString('ascii');
  assert.equal(Buffer.from(cmd,'ascii').equals(bytes),true);
  assert.equal(/(?<!\r)\n/.test(cmd),false);
  for(const [key,source] of sources){
    const begin=`::R49_${key}_BEGIN`,end=`::R49_${key}_END`;
    const start=cmd.lastIndexOf(begin),finish=cmd.indexOf(end,start+begin.length);
    assert.ok(start>=0&&finish>start,key);
    const payload=Buffer.from(cmd.slice(start+begin.length,finish)
      .replace(/[^A-Za-z0-9+/=]/g,''),'base64');
    assert.equal(sha(payload),originalR49BundleSha[key],source);
    assert.ok(cmd.includes(`|${originalR49BundleSha[key]}'`),
      `R49 embedded manifest digest drift: ${key}`);
  }
  assert.match(cmd,/FULL_PROVIDER_COLLECTION_DURING_INSTALL=NO/);
  assert.match(cmd,/D1_WRITES=0/);
  assert.match(cmd,/PUBLICATION_WRITES=0/);
  assert.match(cmd,/EXISTING_OPERATING_TASKS_CHANGED=0/);
  assert.doesNotMatch(cmd,/schtasks \/F/i);
});

test('R49 extractor installs exact files idempotently and rejects conflicts',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'theme-r49-test-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const cmd=load();
  const initial=extractTo(cmd,dir);
  assert.match(initial,/BUNDLE_SHA_VERIFIED=YES/);
  assert.match(initial,/FILES_INSTALLED_OR_VERIFIED=7\/7/);
  for(const [key,source] of sources){
    const target=path.join(dir,path.basename(source));
    assert.equal(sha(fs.readFileSync(target)),originalR49BundleSha[key],source);
  }
  const second=extractTo(cmd,dir);
  assert.match(second,/BUNDLE_SHA_VERIFIED=YES/);
  const conflict=path.join(dir,'theme-nine-r48-stage-current.mjs');
  fs.writeFileSync(conflict,'user-edited-file\n');
  assert.throws(()=>extractTo(cmd,dir),
    /EXISTING_FILE_CONFLICT_theme-nine-r48-stage-current.mjs/);
  assert.equal(fs.readFileSync(conflict,'utf8'),'user-edited-file\n');
});

// R49's frozen R47 payload is NOT the R47 CMD currently selected for the
// approved one-file W03 OLD->TARGET preimage review; never silently equate them.
test('R47 new CMD candidate remains SHA-pinned independently of frozen R49',()=>{
  const r47=path.join(root,'scripts','pc-writer',
    'THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd');
  const bytes=fs.readFileSync(r47);
  assert.equal(sha(bytes),
    'b75f7e2cb253b6abb327096e19c49d676c8c75b25bb816ca82756815aec91639');
  assert.notEqual(sha(bytes),originalR49BundleSha.R47);
  assert.equal(/(?<!\r)\n/.test(bytes.toString('ascii')),false);
});
