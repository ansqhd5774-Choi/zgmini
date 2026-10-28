import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scripts=path.join(root,'scripts','pc-writer');
const name='THEME_NINE_R52_PROVISIONAL_CONNECT.cmd';
const installer=path.join(scripts,name);
const oldInstaller=path.join(scripts,'THEME_NINE_R49_ONE_CLICK_PRIVATE_AUTO_INSTALL.cmd');
const sha=b=>createHash('sha256').update(b).digest('hex');
const require=createRequire(import.meta.url);
const section=(contents,key,tag)=>{
  const a=`::${tag}_${key}_BEGIN`,z=`::${tag}_${key}_END`;
  const i=contents.lastIndexOf(a),j=contents.indexOf(z,i+a.length);
  assert.ok(i>=0&&j>i,`${tag} ${key}`);
  return Buffer.from(contents.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64');
};
const execute=(contents,dir)=>{
  const line=contents.split('\r\n').find(x=>x.startsWith('"%R52_NODE%" -e "'));
  assert.ok(line);
  const before='"%R52_NODE%" -e "',after='" >>"%R52_LOG%" 2>&1';
  assert.ok(line.endsWith(after));
  const printed=[];
  runInNewContext(line.slice(before.length,-after.length),{require,Buffer,
    process:{env:{R52_SELF:installer,R52_INSTALL:dir}},
    console:{log:v=>printed.push(v)}});
  return printed.join('\n');
};

test('R52 embeds three verified modules without rewriting formula or scheduler',()=>{
  const bytes=fs.readFileSync(installer),text=bytes.toString('ascii');
  assert.equal(bytes.equals(Buffer.from(text,'ascii')),true);
  assert.equal(/(?<!\r)\n/.test(text),false);
  // R52 is already installed in the user's PC. Its historical payload is
  // immutable even when a later R53 upgrade changes the sidecar sources.
  for(const [key,approvedSha] of [
    ['STAGE','1305b1c3e84891b3cde287645eefc45a57f483905171a609ebb4721321faeaba'],
    ['R51','4a0bb3f61fcc6e106e283ba4469d4281d2931b5668a6e228b7a9db7ea7aab3c1'],
    ['R51STAGE','582c876d04f6ed91d7a935d5f70408ba5255036f00102a30a52622a9671eec73']]){
    assert.equal(sha(section(text,key,'R52')),approvedSha);
  }
  assert.match(text,/TASK_CHANGED=NO/);
  assert.match(text,/R47_FORMULA_CHANGED=NO/);
  assert.match(text,/PUBLICATION_WRITES=0/);
  assert.doesNotMatch(text,/schtasks \/(Change|Create|Delete)/i);
});

test('R52 preserves original R49 stage before scoped update and is idempotent',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'theme-r52-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const old=section(fs.readFileSync(oldInstaller,'ascii'),'STAGE','R49');
  assert.equal(sha(old),'d3a5afad2adee9c9e14382384b7ba8c87f88e016a8880571d975b7d64010f2ea');
  const stage=path.join(temp,'theme-nine-r48-stage-current.mjs');
  fs.writeFileSync(stage,old,{flag:'wx'});
  const source=fs.readFileSync(installer,'ascii');
  assert.match(execute(source,temp),/R51_PROVISIONAL_MODULES_INSTALLED=YES/);
  assert.equal(sha(fs.readFileSync(stage)),
    '1305b1c3e84891b3cde287645eefc45a57f483905171a609ebb4721321faeaba');
  assert.equal(sha(fs.readFileSync(stage+'.R49.BAK')),sha(old));
  assert.match(execute(source,temp),/R52_BUNDLE_SHA_VERIFIED=3\/3/);
  assert.equal(fs.readdirSync(temp).length,4);
  fs.writeFileSync(path.join(temp,'theme-nine-r51-provisional-overlay.mjs'),
    'user changed source');
  assert.throws(()=>execute(source,temp),/R51_EXISTING_FILE_CONFLICT/);
  assert.equal(sha(fs.readFileSync(stage+'.R49.BAK')),sha(old));
});
