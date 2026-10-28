import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {loadCompletedStageFiles,FILES_MANIFEST_VERSION} from './stage05-completed-files.mjs';
import {calculateFusionStage05} from './stage05-fusion-core.mjs';
import {buildVerifiedResultsHandoff} from './stage05-verified-results-handoff.mjs';

const snapshotDate='2026-10-28';
const names=['로봇·자동화','클라우드·SaaS','자율주행','원전·SMR',
  '방산','핀테크','사이버보안','바이오·신약','데이터센터·전력'];
function stages(){
  return {
    stage01:{status:'READY',date:snapshotDate,risk:'CAUTION'},
    stage02:{status:'READY',sectors:[{id:'sector-a',score:75}]},
    stage03:{status:'READY',themes:names.map((name,i)=>({id:`approved-${i+12}`,
      name,sectorId:'sector-a',approved:true,score:40+i}))},
    stage04:{status:'READY',themes:names.map((name,i)=>({id:`approved-${i+12}`,
      status:'QUANTIFIED',M4:50+i,scoreKind:'STAGE04_M4_FINAL',
      scoreValidation:'VERIFIED',validatedDate:snapshotDate}))},
  };
}
async function withFiles(fn){
  const dir=await mkdtemp(join(tmpdir(),'stage05-files-'));
  const paths=Object.fromEntries(['stage01','stage02','stage03','stage04'].map(x=>[x,`${x}.json`]));
  const manifestPath=join(dir,'sources.json');
  const save=async(source)=>{
    for (const [stage,filename] of Object.entries(paths))
      await writeFile(join(dir,filename),JSON.stringify(source[stage]),'utf8');
    await writeFile(manifestPath,JSON.stringify({version:FILES_MANIFEST_VERSION,
      snapshotDate,files:paths}),'utf8');
  };
  try{await save(stages());await fn({manifestPath,save});}
  finally{await rm(dir,{recursive:true,force:true});}
}

test('four explicit completed files join without recalculation or program theme selection',async()=>{
  await withFiles(async({manifestPath})=>{
    const {snapshot}=await loadCompletedStageFiles(manifestPath);
    const result=calculateFusionStage05(snapshot);
    const handoff=buildVerifiedResultsHandoff({completedSnapshot:snapshot,fusion:result});
    assert.equal(result.summary.rankableCount,9);
    assert.equal(result.summary.selectedThemeId,null);
    assert.equal(handoff.status,'READY_FOR_OLLAMA_RESEARCH');
    assert.equal(handoff.ollamaInput.candidates.length,9);
    assert.equal(result.rows[0].S5,50);
    assert.equal(result.rows[0].stage03Score,40);
    assert.equal(handoff.ollamaInput.selectedThemeId,undefined);
  });
});

test('missing finalized M4 stays NULL and prevents Ollama handoff',async()=>{
  await withFiles(async({manifestPath,save})=>{
    const input=stages();
    delete input.stage04.themes[0].M4;
    input.stage04.themes[0].mean_pct=11.285;
    await save(input);
    const {snapshot}=await loadCompletedStageFiles(manifestPath);
    const result=calculateFusionStage05(snapshot);
    const handoff=buildVerifiedResultsHandoff({completedSnapshot:snapshot,fusion:result});
    assert.equal(result.summary.rankableCount,8);
    assert.equal(result.rows[0].S5,null);
    assert.equal(handoff.status,'BLOCKED_STAGE01_04_SCORES');
    assert.equal(handoff.ollamaInput,null);
  });
});

test('missing explicit stage file fails closed; no archive or web fallback',async()=>{
  await withFiles(async({manifestPath,save})=>{
    const broken=stages();
    broken.stage03=null;
    await save(broken);
    await assert.rejects(loadCompletedStageFiles(manifestPath),
      /STAGE05_SOURCE_OBJECT_INVALID_stage03/);
  });
});
