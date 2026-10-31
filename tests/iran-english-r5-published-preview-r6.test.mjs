import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {CLASSIFIER_VERSION} from '../lib/iran-progress/reference-flow-r3.mjs';
import {R3_FEEDS} from '../scripts/iran-progress/continuous-news-r3.mjs';
import {runEnglishScoreEvidenceR5Raw} from '../scripts/iran-progress/english-score-preview-r5.mjs';
import {planEnglishR5PublishedPreview,runEnglishR5PublishedPreview,openEnglishR5ReadOnlyStore}
 from '../scripts/iran-progress/english-r5-published-preview-r6.mjs';
import {planPublishedNewsInput,applyPublishedNewsInput}
 from '../scripts/iran-progress/published-news-score-input-r1.mjs';

const now=Date.parse('2026-10-29T04:00:00Z');
const sourceUrl='https://www.gov.uk/government/news/iran-missile-report';
const title='Iran fired missiles at Saudi base';
const publishedAt='2026-10-29T02:00:00.000Z';
const item={id:hash(sourceUrl),source:'GOV.UK',sourceUrl,title,publishedAt};
const feed={version:'IRAN_NEWS_METADATA_R41',status:'READY',sourceCount:1,
 itemCount:1,displayDays:14,items:[item]};
const quote='Iran fired missiles at Saudi base on Tuesday.';
const body=quote+' Military officials described the incident as an attack that took place. '+
 'The report stated the missiles were launched against the base and no other event was confirmed.';

function fixture(t,{checkpoint=true}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-r5-integration-'));
 const file=path.join(dir,'iran.sqlite'),store=openStore(file);
 t.after(()=>{store.close();fs.rmSync(dir,{recursive:true,force:true});});
 const prior={sourceUrl:'https://www.gov.uk/government/news/historical-attack',
  title:'Iran fired missiles at Saudi military base',summary:'',date:'2026-10-20'};
 store.putSource('news-metadata:'+hash(prior),prior,Date.parse('2026-10-20T12:00:00Z'));
 if(checkpoint)store.checkpoint('continuous-news-last-run-r3',{
  lastDiscoverySuccessAt:now-60000,classifierVersion:CLASSIFIER_VERSION,status:'UPDATED',
  feeds:R3_FEEDS.map(feed=>({id:feed.id,status:'COLLECTED'})),
 });
 return {store,file};
}
async function proof(){
 return runEnglishScoreEvidenceR5Raw(feed,{now,
  externalEvidence:{version:'IRAN_NEWS_ARTICLE_EVIDENCE_R1',items:[{
   sourceId:'govuk',sourceUrl,originalTitle:title,publishedAt,articleBody:body,
  }]},
  generator:async()=>({eventRule:'MILITARY_ATTACK',stageStatus:'REPORTED_COMPLETED',
   supportingQuote:quote}),
 });
}

test('R5 R6 preview consumes verified English proof without any source/score/checkpoint write',async t=>{
 const {store}=fixture(t),evidence=await proof();
 assert.equal(evidence.items.length,1);
 assert.equal(evidence.items[0].status,'EVIDENCE_CONFIRMED');
 const sourcesBefore=store.db.prepare('SELECT COUNT(*) n FROM sources').get().n;
 const checkpointBefore=store.getCheckpoint('continuous-news-last-run-r3');
 const result=planEnglishR5PublishedPreview(store,feed,evidence,{now});
 assert.equal(result.status,'ENGLISH_R5_R6_IN_MEMORY_PREVIEW');
 assert.equal(result.candidateCount,1);
 assert.equal(result.previewEventCount,result.baselineEventCount+1);
 assert.ok(result.previewScore<result.baselineScore);
 assert.equal(result.publicWrite,false);
 assert.equal(result.sqliteWrite,false);
 assert.equal(result.checkpointWrite,false);
 assert.equal(result.r5ScoreChanges,0);
 assert.equal(store.db.prepare('SELECT COUNT(*) n FROM sources').get().n,sourcesBefore);
 assert.deepEqual(store.getCheckpoint('continuous-news-last-run-r3'),checkpointBefore);
 assert.equal(store.getCheckpoint('score-published-news-input-r1'),null);
});

test('unverified or forged model confirmation cannot alter the simulated R5 score',async t=>{
 const {store}=fixture(t),evidence=await proof();
 const unverified={...evidence,items:evidence.items.map(x=>({...x,
  status:'HELD',reason:'MODEL_STAGE_CONFLICT'}))};
 const report=planEnglishR5PublishedPreview(store,feed,unverified,{now});
 assert.equal(report.candidateCount,0);
 assert.equal(report.previewScore,report.baselineScore);
 assert.equal(report.scoreInputHeldReasons.ENGLISH_AI_EVIDENCE_REQUIRED,1);
 const forged={...evidence,items:evidence.items.map(x=>({...x,delta:999}))};
 const forgedResult=planEnglishR5PublishedPreview(store,feed,forged,{now});
 assert.equal(forgedResult.candidateCount,0);
 assert.equal(forgedResult.previewScore,forgedResult.baselineScore);
});

test('stale R3 source collection keeps existing source gate closed despite English confirmation',async t=>{
 const {store}=fixture(t,{checkpoint:false});
 const evidence=await proof();
 assert.throws(()=>planEnglishR5PublishedPreview(store,feed,evidence,{now}),
  /R5_SOURCE_COLLECTION_UNREADY/);
 assert.equal(store.db.prepare('SELECT COUNT(*) n FROM sources').get().n,1);
});

test('existing receipt is never counted or rewritten as a newly published event',async t=>{
 const {store}=fixture(t),existing={sourceUrl,title,summary:'',date:'2026-10-29',
  claimVerification:'SINGLE_SOURCE_REPORT'};
 store.putSource('news-metadata:'+hash(existing),existing,now-1000);
 const report=planEnglishR5PublishedPreview(store,feed,await proof(),{now});
 assert.equal(report.candidateCount,0);
 assert.equal(report.previewScore,report.baselineScore);
 assert.equal(report.previewEventCount,report.baselineEventCount);
});

test('published-news write path remains locked even for a verified English plan',async t=>{
 const {store}=fixture(t),evidence=await proof();
 const plan=planPublishedNewsInput(store,feed,null,{now,
  aiScorePolicy:'REQUIRE_VERIFIED_ENGLISH_EVIDENCE',englishScoreShadow:evidence});
 assert.equal(plan.planned.length,1);
 assert.throws(()=>applyPublishedNewsInput(store,plan,{now,dryRun:false}),
  /IRAN_PUBLISHED_NEWS_OPERATIONAL_WRITE_NOT_APPROVED/);
 assert.equal(store.db.prepare('SELECT COUNT(*) n FROM sources').get().n,1);
});

test('PC DB can be opened query-only without creating a new operational file',t=>{
 const {store,file}=fixture(t),before=fs.statSync(file).size;
 const reader=openEnglishR5ReadOnlyStore(file);
 try{
  assert.ok(reader.getCheckpoint('continuous-news-last-run-r3'));
  assert.throws(()=>reader.db.exec("INSERT INTO checkpoints(name,body) VALUES('test','{}')"));
 }finally{reader.close();}
 assert.ok(fs.statSync(file).size>=before);
 assert.equal(store.getCheckpoint('test'),null);
});

test('end-to-end R41 and English proof preview uses only injected reads and reports an unposted difference',async t=>{
 const {store}=fixture(t);
 const result=await runEnglishR5PublishedPreview(store,{now,
  fetchImpl:async url=>{
   assert.match(url,/\/api\/outbreak-news\/iran\/r41$/);
   return new Response(JSON.stringify(feed),{status:200});
  },
  evidenceCollector:async()=>({items:[{sourceId:'govuk',sourceUrl,
   originalTitle:title,publishedAt,articleBody:body}]}),
  generator:async()=>({eventRule:'MILITARY_ATTACK',stageStatus:'REPORTED_COMPLETED',
   supportingQuote:quote}),
 });
 assert.equal(result.evidenceConfirmed,1);
 assert.equal(result.candidateCount,1);
 assert.equal(result.sourceCollectionGate,'PASSED_EXISTING_R3_CHECKPOINT');
 assert.equal(result.r5ScoreChanges,0);
 assert.equal(store.getCheckpoint('score-published-news-input-r1'),null);
});

test('Windows R6 launcher retains ASCII CRLF and cannot schedule or deploy',()=>{
 const bytes=fs.readFileSync(new URL('../scripts/iran-progress/IRAN_ENGLISH_R5_R6_IN_MEMORY_PREVIEW.cmd',import.meta.url));
 const text=bytes.toString('ascii');
 assert.ok(bytes.every(value=>value<=127));
 assert.match(text,/\r\n/);
 assert.match(text,/english-r5-published-preview-r6\.mjs/);
 assert.doesNotMatch(text,/schtasks|wrangler|cloudflare|--publish/i);
});
