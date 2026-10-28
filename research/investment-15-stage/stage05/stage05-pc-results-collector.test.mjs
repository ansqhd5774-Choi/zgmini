import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {collectStage05ResultInventory} from './stage05-pc-results-collector.mjs';

const date='2026-10-28';
test('inventory identifies a complete saved snapshot and outputs existing scores only',async()=>{
  const root=await mkdtemp(join(tmpdir(),'r87-existing-'));
  try{
    const themes=Array.from({length:9},(_,i)=>({id:`approved-${i}`,
      name:`테마-${i}`,approved:true,sectorId:'s',score:40+i}));
    const snapshot={schemaVersion:'STAGE05_COMPLETED_STAGE_RESULTS_V2',snapshotDate:date,
      stage01:{status:'READY',date,risk:'CAUTION'},
      stage02:{status:'READY',sectors:[{id:'s',score:70}]},
      stage03:{status:'READY',themes},
      stage04:{status:'READY',themes:themes.map((x,i)=>({id:x.id,
        status:'QUANTIFIED',M4:50+i,scoreKind:'STAGE04_M4_FINAL',
        scoreValidation:'VERIFIED',validatedDate:date}))}};
    await writeFile(join(root,'COMPLETED_SNAPSHOT.json'),JSON.stringify(snapshot));
    const r=await collectStage05ResultInventory({roots:[root]});
    assert.equal(r.summary.candidateCount,1);
    assert.equal(r.summary.readyForOllama,true);
    assert.equal(r.summary.verifiedM4Rows,9);
    assert.equal(r.files[0].ranking[0].S5,58);
    assert.equal(r.files[0].ranking[0].themeId,'approved-8');
  }finally{await rm(root,{recursive:true,force:true});}
});

test('R77 forecast and old M2 selection do not become a verified M4 score',async()=>{
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
    assert.equal(r.summary.verifiedM4Rows,0);
    assert.equal(r.summary.readyForOllama,false);
    assert.ok(r.files.every(x=>!('token'in x)));
  }finally{await rm(root,{recursive:true,force:true});}
});
