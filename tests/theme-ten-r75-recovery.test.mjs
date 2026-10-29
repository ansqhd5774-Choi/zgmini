import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {summarizePublic,summarizeManifest} from '../scripts/pc-writer/theme-ten-r75-audit.mjs';
import {installR74} from '../scripts/pc-writer/theme-ten-r75-install-r74.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const SOURCE=path.resolve(HERE,'../scripts/pc-writer/THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd');
test('R75 returns 7+3 date split and does not invent missing scores',()=>{
  const publicData={status:'READY',modelRevision:null,confirmedObservationDate:'2026-10-27',
    themes:[{theme:'로봇·자동화',history:[{date:'2026-10-27',score:23}]},
      {theme:'우주·위성',history:[{date:'2026-10-23',score:44}]}],
    provisional:{points:[{date:'2026-10-26',scores:{'우주·위성':45}},
      {date:'2026-10-28',scores:{'로봇·자동화':24}}]}};
  const actual=summarizePublic(publicData);
  assert.equal(actual.modelRevision,null);
  assert.deepEqual(actual.themes.map(t=>t.confirmedHistoryLastDate),
    ['2026-10-27','2026-10-23']);
  assert.deepEqual(actual.themes.map(t=>t.provisionalDates),
    [['2026-10-28'],['2026-10-26']]);
});

test('R75 raw manifest inspection reports only date/count metadata',t=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r75-test-'));
  t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  const file=path.join(tmp,'raw-manifest.json');
  fs.writeFileSync(file,JSON.stringify({files:[
    {symbol:'SPY',lastVerifiedNYDay:'2026-10-27',close:777},
    {symbol:'IBB',observationThrough:'2026-10-26',close:666},
  ]}));
  const result=summarizeManifest(file);
  assert.equal(result.status,'READ_ONLY');
  assert.equal(result.symbols.find(t=>t.symbol==='SPY').latestSession,'2026-10-27');
  assert.equal(JSON.stringify(result).includes('777'),false);
  assert.equal(JSON.stringify(result).includes('666'),false);
});

test('R75 sha-pinned installer accepts already approved R74 without writes',t=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r75-test-'));
  t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  const target=path.join(tmp,'r47.cmd');
  fs.copyFileSync(SOURCE,target);
  const before=fs.readFileSync(target);
  process.env.R75_TEST_MODE='1';
  try{
    const result=installR74({source:SOURCE,target,lock:path.join(tmp,'no.lock'),
      now:new Date('2026-10-29T14:30:00Z')});
    assert.equal(result.status,'ALREADY_R74_SHA_VERIFIED');
    assert.deepEqual(fs.readFileSync(target),before);
    assert.equal(result.backupCreated,false);
  }finally{delete process.env.R75_TEST_MODE;}
});

test('R75 rejects unknown installed bytes and preserves original',t=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r75-test-'));
  t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  const target=path.join(tmp,'r47.cmd');
  fs.writeFileSync(target,'customer changes');
  process.env.R75_TEST_MODE='1';
  try{
    assert.throws(()=>installR74({source:SOURCE,target,
      lock:path.join(tmp,'no.lock'),now:new Date('2026-10-29T14:30:00Z')}),
      {code:'UNRECOGNIZED_PC_R47_SHA_STOP'});
    assert.equal(fs.readFileSync(target,'utf8'),'customer changes');
  }finally{delete process.env.R75_TEST_MODE;}
});
