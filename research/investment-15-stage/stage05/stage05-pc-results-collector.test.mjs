import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {collectStage05ResultInventory} from './stage05-pc-results-collector.mjs';
import {SCHEMA_VERSION} from './stage05-fusion-core.mjs';

const date='2026-10-28';
test('inventory identifies a complete saved snapshot and outputs existing scores only',async()=>{
  const root=await mkdtemp(join(tmpdir(),'r87-existing-'));
  try{
    const themes=Array.from({length:9},(_,i)=>({id:`approved-${i}`,
      name:`테마-${i}`,approved:true,sectorId:'s',score:40+i}));
    const snapshot={schemaVersion:SCHEMA_VERSION,snapshotDate:date,
      stage01:{status:'READY',date,risk:'CAUTION'},
      stage02:{status:'READY',sectors:[{id:'s',score:70}]},
      stage03:{status:'READY',themes},
      stage04:{status:'READY',final_selection:{state:'FINAL_CONFIRMED',
        confirmed_theme_ids:['approved-8'],approval_evidence:'USER_APPROVAL',
        confirmed_at:date}}};
    await writeFile(join(root,'COMPLETED_SNAPSHOT.json'),JSON.stringify(snapshot));
    const r=await collectStage05ResultInventory({roots:[root]});
    assert.equal(r.summary.candidateCount,1);
    assert.equal(r.summary.readyForOllama,true);
    assert.equal(r.summary.userConfirmedThemes,1);
    assert.deepEqual(r.files[0].ranking,[]);
    assert.equal(r.files[0].confirmedCount,1);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('R77 forecast and old M2 selection do not become user confirmation',async()=>{
  const root=await mkdtemp(join(tmpdir(),'r87-null-'));
  try{
    await writeFile(join(root,'R77_OLLAMA_FORECAST_RESULT.json'),JSON.stringify({
      publisher_adapter_revision:'R77_OFFICIAL_SITEMAP_DISCOVERY',mean_pct:11.285}));
    await writeFile(join(root,'M2_STAGE4_SELECTION.json'),JSON.stringify({
      schema:'ZGMINI_M2_STAGE4_SELECTION_V1',investmentAttractiveness:'NOT_EVALUATED'}));
    await mkdir(join(root,'secrets'));
    await writeFile(join(root,'secrets','STAGE04_SECRET.json'),JSON.stringify({token:'PRIVATE'}));
    const r=await collectStage05ResultInventory({roots:[root]});
    assert.equal(r.summary.candidateCount,2);
    assert.equal(r.summary.userConfirmedThemes,0);
    assert.equal(r.summary.readyForOllama,false);
    assert.ok(r.files.every(x=>!('token'in x)));
  }finally{await rm(root,{recursive:true,force:true});}
});
