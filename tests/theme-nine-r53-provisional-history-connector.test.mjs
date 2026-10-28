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
const name='THEME_NINE_R53_PROVISIONAL_HISTORY_CONNECT.cmd';
const installer=path.join(scripts,name);
const original=path.join(scripts,'THEME_NINE_R52_PROVISIONAL_CONNECT.cmd');
const sha=b=>createHash('sha256').update(b).digest('hex');
const require=createRequire(import.meta.url);
const section=(contents,key,tag)=>{
 const a=`::${tag}_${key}_BEGIN`,z=`::${tag}_${key}_END`;
 const i=contents.lastIndexOf(a),j=contents.indexOf(z,i+a.length);
 assert.ok(i>=0&&j>i,`${tag} ${key}`);
 return Buffer.from(contents.slice(i+a.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64');
};
const execute=(contents,dir)=>{
 const line=contents.split('\r\n').find(s=>s.startsWith('"%R53_NODE%" -e "'));
 assert.ok(line);
 const before='"%R53_NODE%" -e "',after='" >>"%R53_LOG%" 2>&1';
 assert.ok(line.endsWith(after));
 const printed=[];
 runInNewContext(line.slice(before.length,-after.length),{require,Buffer,
  process:{env:{R53_SELF:installer,R53_INSTALL:dir}},
  console:{log:v=>printed.push(v)}});
 return printed.join('\n');
};

test('R53 installer embeds the exact two R51 sidecars, no collector/formula/task',()=>{
 const bytes=fs.readFileSync(installer),text=bytes.toString('ascii');
 assert.equal(bytes.equals(Buffer.from(text,'ascii')),true);
 assert.equal(/(?<!\r)\n/.test(text),false);
 for(const [key,source] of [
  ['R51','theme-nine-r51-provisional-overlay.mjs'],
  ['R51STAGE','theme-nine-r51-stage-current.mjs']]){
  assert.equal(sha(section(text,key,'R53')),sha(fs.readFileSync(path.join(scripts,source))));
 }
 assert.match(text,/EXISTING_TASK_CHANGED=NO/);
 assert.match(text,/EXISTING_FORMULA_CHANGED=NO/);
 assert.match(text,/D1_WRITES=0/);
 assert.doesNotMatch(text,/schtasks \/(Change|Create|Delete)/i);
});

test('R53 upgrades only SHA-pinned R52 modules and preserves their exact backups',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'theme-r53-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const r52=fs.readFileSync(original,'ascii');
 const stage=section(r52,'STAGE','R52');
 fs.writeFileSync(path.join(temp,'theme-nine-r48-stage-current.mjs'),stage,{flag:'wx'});
 const filenames=[['R51','theme-nine-r51-provisional-overlay.mjs'],
  ['R51STAGE','theme-nine-r51-stage-current.mjs']];
 const earlier={};
 for(const [key,file] of filenames){
  const bytes=section(r52,key,'R52');earlier[file]=bytes;
  fs.writeFileSync(path.join(temp,file),bytes,{flag:'wx'});
 }
 const source=fs.readFileSync(installer,'ascii');
 assert.match(execute(source,temp),/R53_BUNDLE_SHA_VERIFIED=2\/2/);
 assert.equal(sha(fs.readFileSync(path.join(temp,'theme-nine-r48-stage-current.mjs'))),sha(stage));
 for(const [,file] of filenames){
  assert.equal(sha(fs.readFileSync(path.join(temp,file))),sha(fs.readFileSync(path.join(scripts,file))));
  assert.equal(sha(fs.readFileSync(path.join(temp,file+'.R52.BAK'))),sha(earlier[file]));
 }
 assert.match(execute(source,temp),/LATER_R48_HISTORICAL_SCORE_REUSE=YES/);
 assert.equal(fs.readdirSync(temp).length,5);
 fs.writeFileSync(path.join(temp,'theme-nine-r51-stage-current.mjs'),'custom user edit');
 assert.throws(()=>execute(source,temp),/R51_USER_CHANGED_STOP_R51STAGE/);
 assert.equal(sha(fs.readFileSync(path.join(temp,'theme-nine-r48-stage-current.mjs'))),sha(stage));
});
