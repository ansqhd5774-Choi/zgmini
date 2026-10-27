import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditSpaceUniverse} from '../scripts/pc-writer/theme-space-satellite-r13-local-universe-audit.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const makeBar=(symbol,day,hour='19')=>({timestamp:`2026-10-${day}T${hour}:00:00Z`,
  symbol,close:Number(day)+5,is_gap:false});
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r13-fixture-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const home=path.join(root,'themes','space-satellite');fs.mkdirSync(path.join(home,'raw'),{recursive:true});
  const files=[];
  const add=(ticker,days)=>{
    const content=days.map(d=>JSON.stringify(makeBar(ticker,d))).join('\n')+'\n';
    const hash=sha(content),relative=`raw/${ticker}_${hash}.jsonl`;
    fs.writeFileSync(path.join(home,relative),content);
    files.push({path:relative,sha256:hash,
      source:'https://getmarkethistory.com',priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'});
  };
  const finish=()=>fs.writeFileSync(path.join(home,'raw-manifest.json'),
    JSON.stringify({version:1,themeId:'space-satellite',files}));
  const spyReader=()=>({sourceTheme:'data-center-power',manifestSha256:'TEST_SPY_SHA',
    bars:['21','22','23'].map(d=>makeBar('SPY',d))});
  return {root,home,files,add,finish,spyReader};
}

test('R13 checks all requested symbols, including absent/new candidates without a two-ETF cap',t=>{
  const f=fixture(t);f.add('UFO',['21','22','23']);f.add('ARKX',['21','23']);f.finish();
  const out=auditSpaceUniverse({dataRoot:f.root,
    symbols:['UFO','NASA','ARKX','ROKT','WARP','ORBX','MARS','DIPR','WSPC'],
    spyReader:f.spyReader});
  assert.equal(out.candidateCount,9);assert.equal(out.records.length,9);
  assert.equal(out.records[0].spyCommonNy15Dates,3);
  assert.equal(out.records[2].spyCommonNy15Dates,2);
  assert.equal(out.records[3].stage,'NO_LOCAL_RAW');
  assert.equal(out.records[3].rawShaAudited,false);
  assert.equal(out.records[2].r2ScoringVerified,false);
  assert.equal(out.rawFilesWritten,0);assert.equal(out.providerCalls,0);
});

test('R13 detects tampered SHA and never infers eligibility from file presence',t=>{
  const f=fixture(t);f.add('WSPC',['21','22']);f.finish();
  const good=auditSpaceUniverse({dataRoot:f.root,symbols:['WSPC'],spyReader:f.spyReader});
  assert.equal(good.records[0].stage,'PRIVATE_SHA_AUDITED_UNDER_40');
  assert.equal(good.records[0].spyCommonNy15Dates,2);
  fs.appendFileSync(path.join(f.home,f.files[0].path),'\n');
  assert.throws(()=>auditSpaceUniverse({dataRoot:f.root,symbols:['WSPC'],
    spyReader:f.spyReader}),/R13_RAW_SHA_MISMATCH/);
});

test('R13 rejects missing shared SPY, duplicate symbols and mismatched source',t=>{
  const f=fixture(t);f.add('UFO',['21']);f.finish();
  assert.throws(()=>auditSpaceUniverse({dataRoot:f.root,symbols:['UFO','UFO'],
    spyReader:f.spyReader}),/R13_SYMBOLS_INVALID/);
  assert.throws(()=>auditSpaceUniverse({dataRoot:f.root,symbols:['UFO'],
    spyReader:()=>({bars:[]})}),/R13_SHARED_SPY_SOURCE_NOT_VERIFIED/);
  f.files[0].source='https://other.example';f.finish();
  assert.throws(()=>auditSpaceUniverse({dataRoot:f.root,symbols:['UFO'],
    spyReader:f.spyReader}),/R13_RAW_SOURCE_OR_MODE_INVALID/);
});

test('R13 does not cap candidate universe to 2/3/9 when input grows',t=>{
  const f=fixture(t);f.finish();
  const symbols=Array.from({length:25},(_,i)=>`ETF${i}`);
  const out=auditSpaceUniverse({dataRoot:f.root,symbols,spyReader:f.spyReader});
  assert.equal(out.candidateCount,25);
  assert.equal(out.records.every(row=>row.stage==='NO_LOCAL_RAW'),true);
});
