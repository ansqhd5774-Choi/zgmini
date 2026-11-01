// R7: explain each R6 intake decision without relaxing the existing R5 gates.
// All SQLite, D1, checkpoint, task and publication paths stay read-only/off.
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {IRAN_NEWS_METADATA_SOURCES_R41} from '../../lib/iran-progress/news-metadata-r41.mjs';
import {kstCalendarDate} from '../../lib/iran-progress/chart-history.mjs';
import {readPublishedNews,planPublishedNewsInput} from './published-news-score-input-r1.mjs';
import {runEnglishScoreEvidenceR5Raw} from './english-score-preview-r5.mjs';
import {planEnglishR5PublishedPreview,openEnglishR5ReadOnlyStore}
 from './english-r5-published-preview-r6.mjs';

function counted(rows,select){
 const counts={};
 for(const row of rows){
  const key=select(row);
  counts[key]=(counts[key]??0)+1;
 }
 return Object.fromEntries(Object.entries(counts).sort((a,b)=>a[0].localeCompare(b[0])));
}

export function explainEnglishR5HoldsR7(r41,proof,plan,preview,{now=Date.now()}={}){
 if(r41?.status!=='READY'||!Array.isArray(r41.items)||
  plan?.endpoint!=='/api/outbreak-news/iran/r41'||
  preview?.status!=='ENGLISH_R5_R6_IN_MEMORY_PREVIEW'||
  preview.publicWrite!==false||preview.sqliteWrite!==false||
  !Array.isArray(plan.articleResults)||!Array.isArray(plan.held)||
  !Array.isArray(plan.planned)||!Array.isArray(proof?.items)||
  !Array.isArray(proof.pending)||!Number.isSafeInteger(now))
  throw Error('IRAN_R7_INPUT_INVALID');
 const results=new Map(plan.articleResults.map(item=>[item.id,item]));
 const approved=new Set(plan.planned.map(item=>item.candidateId));
 const held=new Map();
 for(const entry of plan.held){
  if(!held.has(entry.id))held.set(entry.id,[]);
  held.get(entry.id).push(entry.reason);
 }
 const proofById=new Map();
 for(const entry of proof.items){
  if(proofById.has(entry.id))throw Error('IRAN_R7_DUPLICATE_PROOF');
  proofById.set(entry.id,{state:entry.status,reason:entry.reason??null});
 }
 const pendingById=new Map();
 for(const entry of proof.pending){
  if(pendingById.has(entry.id))throw Error('IRAN_R7_DUPLICATE_PENDING');
  pendingById.set(entry.id,entry.reason);
 }
 const sourceIds=new Map(Object.entries(IRAN_NEWS_METADATA_SOURCES_R41)
  .map(([id,source])=>[source.name,id]));
 const intakeDate=kstCalendarDate(now);
 const articles=r41.items.map(item=>{
  const result=results.get(item.id);
  if(!result||result.sourceUrl!==item.sourceUrl||
   !/^[a-f0-9]{64}$/.test(item.id)||!sourceIds.has(item.source)||
   !Number.isFinite(Date.parse(item.publishedAt)))
   throw Error('IRAN_R7_ARTICLE_LINEAGE_INVALID');
  const sourceId=sourceIds.get(item.source);
  const ageDays=(Date.parse(intakeDate+'T00:00:00Z')-
   Date.parse(item.publishedAt.slice(0,10)+'T00:00:00Z'))/86400000;
  const evidence=proofById.get(item.id);
  const pending=pendingById.get(item.id);
  if(evidence&&pending)throw Error('IRAN_R7_EVIDENCE_STATE_CONFLICT');
  return {id:item.id,sourceId,publishedDate:item.publishedAt.slice(0,10),
   publicationAgeDays:ageDays,scoreStatus:result.status,
   scoreReasons:held.get(item.id)??[],
   proofStatus:evidence?.state??(pending?'PENDING':'NOT_REVIEWED'),
   proofReason:evidence?.reason??pending??null,
   admittedAsNewCandidate:approved.has(item.id)};
 });
 if(articles.length!==r41.itemCount||
  new Set(articles.map(item=>item.id)).size!==articles.length||
  articles.filter(item=>item.admittedAsNewCandidate).length!==plan.planned.length)
  throw Error('IRAN_R7_TRACE_COVERAGE_INVALID');
 return {status:'IRAN_ENGLISH_R7_HOLD_DIAGNOSTICS_READ_ONLY',
  asOfDate:intakeDate,sourceBranch:'codex/outbreak-iran-news-retention-r1-20261026',
  publicNewsCount:articles.length,traceCoverageCount:articles.length,
  totalNewCandidates:plan.planned.length,
  scoreHeldCounts:counted(plan.held,item=>item.reason),
  evidencePendingCounts:counted(proof.pending,item=>item.reason),
  confirmedEnglishProofs:proof.items.filter(item=>item.status==='EVIDENCE_CONFIRMED').length,
  confirmedButNotAdmitted:articles.filter(item=>item.proofStatus==='EVIDENCE_CONFIRMED'&&
   !item.admittedAsNewCandidate).length,
  scoreBefore:preview.baselineScore,scoreAfterHypothetical:preview.previewScore,
  scoreDifferenceHypothetical:preview.previewDifference,
  r3SourceGate:preview.sourceCollectionGate,
  diagnosticOnly:true,fullArticleBodyLogged:false,originalTitleLogged:false,
  sqliteWrite:false,checkpointWrite:false,d1Write:false,publicWrite:false,
  taskChange:false,articles};
}

async function assertOllamaAvailable({fetchImpl=fetch}={}){
 try{
  const response=await fetchImpl('http://127.0.0.1:11434/api/tags',
   {signal:AbortSignal.timeout(5000)});
  if(response.ok){
   const models=(await response.json()).models;
   if(Array.isArray(models)&&models.some(row=>row.name==='gemma3:4b'&&
    typeof row.digest==='string'&&row.digest.length>0))return;
  }
 }catch{}
 throw Error('IRAN_ENGLISH_SCORE_OLLAMA_MODEL_UNAVAILABLE');
}

export async function runEnglishR5HoldsR7(store,{now=Date.now(),
 fetchImpl=fetch,ollamaFetch=fetch,generator,evidenceCollector,maxNew=16}={}){
 if(!generator)await assertOllamaAvailable({fetchImpl:ollamaFetch});
 const {r41,selected}=await readPublishedNews({now,fetchImpl});
 if(selected.endpoint!=='/api/outbreak-news/iran/r41')
  throw Error('IRAN_R7_R41_REQUIRED');
 const proof=await runEnglishScoreEvidenceR5Raw(r41,{now,maxNew,
  ...(generator?{generator}:{}),...(evidenceCollector?{evidenceCollector}:{})});
 const plan=planPublishedNewsInput(store,r41,null,{now,
  aiScorePolicy:'REQUIRE_VERIFIED_ENGLISH_EVIDENCE',englishScoreShadow:proof});
 const preview=planEnglishR5PublishedPreview(store,r41,proof,{now});
 return explainEnglishR5HoldsR7(r41,proof,plan,preview,{now});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let store;
 try{
  if(process.argv.length!==3||process.argv[2]!=='--diagnose')
   throw Error('IRAN_R7_DIAGNOSE_ONLY');
  const home=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
  store=openEnglishR5ReadOnlyStore(path.join(home,'iran.sqlite'));
  console.log(JSON.stringify(await runEnglishR5HoldsR7(store),null,2));
 }catch(error){
  const reason=/^(?:IRAN|R5)_[A-Z0-9_]+$/.test(error?.message)?
   error.message:'IRAN_R7_DIAGNOSTICS_FAILED';
  console.error(JSON.stringify({status:'BLOCKED',reason,sqliteWrite:false,
   checkpointWrite:false,d1Write:false,publicWrite:false,taskChange:false}));
  process.exitCode=1;
 }finally{store?.close();}
}
