// Manually compare English-verified public R41 news with the existing R5
// calculation in memory. No SQLite writes, D1, translation or scheduled jobs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {readPublishedNews,planPublishedNewsInput} from './published-news-score-input-r1.mjs';
import {previewOperationalR5WithEnglishEvidence} from './operate-r5.mjs';
import {runEnglishScoreEvidenceR5Raw} from './english-score-preview-r5.mjs';

export function planEnglishR5PublishedPreview(store,r41,proof,{now=Date.now()}={}){
 if(r41?.status!=='READY'||!Array.isArray(r41.items))
  throw Error('IRAN_ENGLISH_R5_R41_REQUIRED');
 const plan=planPublishedNewsInput(store,r41,null,{now,
  aiScorePolicy:'REQUIRE_VERIFIED_ENGLISH_EVIDENCE',englishScoreShadow:proof});
 if(plan.endpoint!=='/api/outbreak-news/iran/r41')
  throw Error('IRAN_ENGLISH_R5_R41_REQUIRED');
 const projected=previewOperationalR5WithEnglishEvidence(store,plan.planned,{now});
 const heldCounts={};
 for(const item of plan.held)heldCounts[item.reason]=(heldCounts[item.reason]??0)+1;
 const evidenceCounts={};
 for(const item of proof.pending??[])evidenceCounts[item.reason]=(evidenceCounts[item.reason]??0)+1;
 return {status:'ENGLISH_R5_R6_IN_MEMORY_PREVIEW',
  asOfDate:projected.baseline.shadow.asOfDate,
  publicNewsCount:r41.itemCount,publicSourceCount:r41.sourceCount,
  evidenceConfirmed:proof.items.filter(item=>item.status==='EVIDENCE_CONFIRMED').length,
  modelCallsAttempted:proof.modelCallsAttempted,
  modelCallsSucceeded:proof.modelCallsSucceeded,
  proofHeldReasons:evidenceCounts,scoreInputHeldReasons:heldCounts,
  candidateCount:plan.planned.length,
  baselineScore:projected.baseline.body.score,
  previewScore:projected.projected.body.score,
  previewDifference:Number((projected.projected.body.score-projected.baseline.body.score).toFixed(2)),
  baselineEventCount:projected.baseline.body.acceptedEventCount,
  previewEventCount:projected.projected.body.acceptedEventCount,
  sourceCollectionGate:'PASSED_EXISTING_R3_CHECKPOINT',
  r5CalibrationStatus:projected.projected.shadow.status,
  publicWrite:false,sqliteWrite:false,checkpointWrite:false,
  r5ScoreChanges:0,automaticActivation:false};
}

async function assertLocalModel({fetchImpl=fetch}={}){
 let ready=false;
 try{
  const response=await fetchImpl('http://127.0.0.1:11434/api/tags',
   {signal:AbortSignal.timeout(5000)});
  if(response.ok){
   const tags=await response.json();
   ready=Array.isArray(tags.models)&&tags.models.some(item=>
    item.name==='gemma3:4b'&&typeof item.digest==='string'&&item.digest.length>0);
  }
 }catch{}
 if(!ready)throw Error('IRAN_ENGLISH_SCORE_OLLAMA_MODEL_UNAVAILABLE');
}

export async function runEnglishR5PublishedPreview(store,{now=Date.now(),
 fetchImpl=fetch,ollamaFetch=fetch,generator,evidenceCollector,maxNew=16}={}){
 // Test injection is explicit. Actual PC runs must prove model availability.
 if(!generator)await assertLocalModel({fetchImpl:ollamaFetch});
 const {r41,selected}=await readPublishedNews({now,fetchImpl});
 if(selected.endpoint!=='/api/outbreak-news/iran/r41')
  throw Error('IRAN_ENGLISH_R5_R41_REQUIRED');
 const proof=await runEnglishScoreEvidenceR5Raw(r41,{now,maxNew,
  ...(generator?{generator}:{}),...(evidenceCollector?{evidenceCollector}:{})});
 return planEnglishR5PublishedPreview(store,r41,proof,{now});
}

export function openEnglishR5ReadOnlyStore(file){
 if(typeof file!=='string'||!fs.statSync(file).isFile())
  throw Error('IRAN_ENGLISH_R5_OPERATIONAL_DB_MISSING');
 const db=new DatabaseSync(file,{readOnly:true});
 db.exec('PRAGMA query_only=ON');
 return {db,close:()=>db.close(),getCheckpoint(name){
  const record=db.prepare('SELECT body FROM checkpoints WHERE name=?').get(name);
  return record?JSON.parse(record.body):null;
 }};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let store;
 try{
  if(process.argv.length!==3||process.argv[2]!=='--preview')
   throw Error('IRAN_ENGLISH_R5_R6_PREVIEW_ONLY');
  const home=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
  store=openEnglishR5ReadOnlyStore(path.join(home,'iran.sqlite'));
  console.log(JSON.stringify(await runEnglishR5PublishedPreview(store),null,2));
 }catch(error){
  const reason=/^(?:IRAN|R5)_[A-Z0-9_]+$/.test(error?.message)?
   error.message:'IRAN_ENGLISH_R5_R6_PREVIEW_FAILED';
  console.error(JSON.stringify({status:'BLOCKED',reason,publicWrite:false,
   sqliteWrite:false,checkpointWrite:false,r5ScoreChanges:0}));
  process.exitCode=1;
 }finally{store?.close();}
}
