import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const home=path.dirname(fileURLToPath(import.meta.url));
const dir=path.resolve(home,'../scripts/pc-writer');
const read=(name)=>fs.readFileSync(path.join(dir,name),'ascii');
const sha=(value)=>createHash('sha256').update(value).digest('hex');
const source=read('THEME_NINE_R49_ONE_CLICK_PRIVATE_AUTO_INSTALL.cmd');
const repair=read('THEME_NINE_R57_CLOSED_NY_FIX.cmd');
const expectedNew=fs.readFileSync(path.join(dir,'THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd'));

function extractSection(batch,name) {
  const start=`::${name}_BEGIN`,end=`::${name}_END`;
  const i=batch.lastIndexOf(start),j=batch.indexOf(end,i+start.length);
  assert.ok(i>=0&&j>i,`missing ${name}`);
  return Buffer.from(batch.slice(i+start.length,j).replace(/[^A-Za-z0-9+/=]/g,''),'base64');
}

test('R57 replaces exact approved R47 bytes, preserves a backup, and is idempotent',()=>{
  const old=extractSection(source,'R49_R47');
  assert.equal(sha(old),'2133e5d4e625762340e715ecd21e809f274713c030e904e3e3f314dc3b6a0729');
  const line=repair.match(/^"%R57_NODE%" -e "([^"]+)" >>/m);
  assert.ok(line,'R57 must embed a quote-safe Node command');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r57-pc-repair-test-'));
  try {
    const target=path.join(temp,'THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd');
    fs.writeFileSync(target,old);
    const env={R57_TARGET:target,R57_SELF:path.join(dir,'THEME_NINE_R57_CLOSED_NY_FIX.cmd')};
    const logs=[];
    const require=createRequire(import.meta.url);
    const script=new Function('require','process','console',line[1]);
    const run=()=>{
      logs.length=0;
      try {
        script(require,{env,exit:(code)=>{assert.equal(code,0);throw new Error('R57_TEST_EXIT');}},
          {log:(...values)=>logs.push(values.join(' '))});
      } catch(error) {
        if(error.message!=='R57_TEST_EXIT')throw error;
      }
      return logs.join('\n');
    };
    assert.match(run(),/R57_R47_PLANNER_UPGRADED_SHA_VERIFIED/);
    assert.deepEqual(fs.readFileSync(target),expectedNew);
    assert.deepEqual(fs.readFileSync(`${target}.R57_BACKUP`),old);
    assert.match(run(),/R57_ALREADY_INSTALLED_SHA_VERIFIED/);
  } finally {
    fs.rmSync(temp,{recursive:true,force:true});
  }
});
