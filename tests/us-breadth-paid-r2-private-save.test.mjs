import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {savePrivatePaidUsBreadthR2,validPrivatePaidUsBreadthR2}
  from '../scripts/pc-writer/us-breadth-paid-r2-private-save.mjs';

function candidate(){
  return {
    status:'PAID_R2_STORED_PRIVATE_CALCULATED',prepared:true,
    publicationAllowed:false,firstDate:'2026-11-19',
    lastDate:'2026-11-19',comparedSessions:1,fullYearHistory:false,
    sourceLatestProviderDateVerified:false,
    publicPercentPreview:{
      date:'2026-11-19',risingPct:25,unchangedPct:50,fallingPct:25,
    },
    publicHistoryPreview:[{
      date:'2026-11-19',risingPct:25,unchangedPct:50,fallingPct:25,
    }],
    privateSourceReceipts:[
      {date:'2026-11-18',sha256:'a'.repeat(64),
        projectionSha256:'c'.repeat(64)},
      {date:'2026-11-19',sha256:'b'.repeat(64),
        projectionSha256:'d'.repeat(64)},
    ],
  };
}

test('opt-in private save: bytes SHA/readback and immutable replay',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-paid-r2-'));
  try{
    const input=candidate();
    assert.equal(validPrivatePaidUsBreadthR2(input),true);
    const off=savePrivatePaidUsBreadthR2(root,input);
    assert.equal(off.status,'PAID_R2_PRIVATE_SAVE_DISABLED');
    assert.equal(off.operationalWrites,0);
    const first=savePrivatePaidUsBreadthR2(root,input,{saveEnabled:true});
    assert.equal(first.status,'PAID_R2_PRIVATE_SAVED_READBACK_VERIFIED');
    assert.equal(first.readbackVerified,true);
    assert.equal(first.operationalWrites,1);
    assert.equal(first.d1Writes,0);
    const file=path.join(root,first.relativePath);
    assert.equal(fs.existsSync(file),true);
    const stored=JSON.parse(fs.readFileSync(file,'utf8'));
    assert.equal(stored.schema,'ZGMINI_US_PAID_BREADTH_R2_PRIVATE_V1');
    assert.equal(stored.points.length,1);
    assert.equal(stored.publicationAllowed,false);
    assert.equal('rawPrices' in stored,false);
    const replay=savePrivatePaidUsBreadthR2(root,input,{saveEnabled:true});
    assert.equal(replay.status,'PAID_R2_PRIVATE_UNCHANGED_READBACK_VERIFIED');
    assert.equal(replay.operationalWrites,0);
    assert.equal(replay.sha256,first.sha256);
    fs.writeFileSync(file,'tampered\n');
    const conflict=savePrivatePaidUsBreadthR2(root,input,{saveEnabled:true});
    assert.equal(conflict.status,'PAID_R2_PRIVATE_CONFLICT_PRESERVED');
    assert.equal(fs.readFileSync(file,'utf8'),'tampered\n');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('bad source receipt or percent never writes',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-paid-r2-bad-'));
  try{
    const item=candidate();item.privateSourceReceipts[0].sha256='invalid';
    assert.equal(validPrivatePaidUsBreadthR2(item),false);
    assert.equal(savePrivatePaidUsBreadthR2(root,item,{saveEnabled:true}).status,
      'PAID_R2_PRIVATE_SAVE_INVALID_INPUT');
    const invalid=candidate();invalid.publicHistoryPreview[0].fallingPct=20;
    invalid.publicPercentPreview.fallingPct=20;
    assert.equal(validPrivatePaidUsBreadthR2(invalid),false);
    assert.equal(fs.existsSync(path.join(root,'marketparquet-paid')),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('private output explicitly whitelists fields',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-paid-r2-fields-'));
  try{
    const input=candidate();input.rawPrices=[{symbol:'SECRET',close:999}];
    const saved=savePrivatePaidUsBreadthR2(root,input,{saveEnabled:true});
    assert.equal(saved.readbackVerified,true);
    assert.equal(fs.readFileSync(path.join(root,saved.relativePath),'utf8').includes('SECRET'),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
