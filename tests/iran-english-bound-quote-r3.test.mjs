import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {matchingEnglishEventQuotes,generateBoundEnglishScoreEvidence}
 from '../scripts/iran-progress/english-score-bound-quote-r3.mjs';
import {previewEnglishScoreEvidenceR3}
 from '../scripts/iran-progress/english-score-preview-r3.mjs';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {planPublishedNewsInput,applyPublishedNewsInput}
 from '../scripts/iran-progress/published-news-score-input-r1.mjs';
import {calculateOperationalR5} from '../scripts/iran-progress/operate-r5.mjs';
import {runEnglishScoreShadow} from '../scripts/iran-progress/news-r41-english-score-evidence-r1.mjs';

const now=Date.parse('2026-10-31T08:00:00.000Z');
const sourceUrl='https://www.tasnimnews.ir/en/news/2026/10/29/3735170/at-least-14-killed-in-saudi-strikes-on-yemen-as-attacks-reach-101-in-24-hours';
const originalTitle='At Least 14 Killed in Saudi Strikes on Yemen As Attacks Reach 101 in 24 Hours';
const quote='At least 14 civilians were killed and 15 others wounded in Saudi airstrikes on a market in Yemen.';
const articleBody=quote+' Officials reported additional information about damage across the region on Thursday. '+
 'Diplomatic delegates met to discuss unrelated financial relief proposals for the affected communities.';
const article={sourceUrl,originalTitle,articleBody,publishedAt:'2026-10-29T11:41:00.000Z'};
const verdict={eventRule:'MILITARY_ATTACK',stageStatus:'REPORTED_COMPLETED',
 supportingQuote:quote};

test('R3 confines Ollama evidence to verifiable verbatim matching source sentences',async()=>{
 assert.deepEqual(matchingEnglishEventQuotes(article),[quote]);
 const result=await generateBoundEnglishScoreEvidence(article,{fetcher:async(url,options)=>{
  assert.equal(url,'http://127.0.0.1:11434/api/generate');
  const payload=JSON.parse(options.body);
  assert.deepEqual(payload.format.properties.supportingQuote.enum,[quote]);
  assert.equal(payload.options.temperature,0);
  assert.match(payload.system,/Do not translate anything/);
  return {ok:true,json:async()=>({response:JSON.stringify(verdict)})};
 }});
 assert.equal(result.proof.status,'EVIDENCE_CONFIRMED');
 assert.equal(result.proof.rule,'MILITARY_ATTACK');
 assert.equal(result.proof.delta,-12);
 assert.equal(result.proof.scoreApplied,false);
});

test('JSON schema selection does not bypass original-source quote verification',async()=>{
 await assert.rejects(generateBoundEnglishScoreEvidence(article,{fetcher:async()=>({
  ok:true,json:async()=>({response:JSON.stringify({...verdict,
   supportingQuote:'A fabricated casualty sentence that never appeared in the source body.'})}),
 })}),/IRAN_ENGLISH_SCORE_EVIDENCE_MODEL_INVALID/);
 assert.deepEqual(matchingEnglishEventQuotes({...article,
  originalTitle:'Iran says it is still considering future nuclear talks'}),[]);
});

test('R3 shadow report can validate a matching attack without writing R5',async()=>{
 const id=createHash('sha256').update(sourceUrl).digest('hex');
 const feed={version:'IRAN_NEWS_METADATA_R41',status:'READY',sourceCount:1,
  itemCount:1,displayDays:14,items:[{id,source:'Tasnim',sourceUrl,
   title:originalTitle,publishedAt:article.publishedAt}]};
 const preview=await previewEnglishScoreEvidenceR3({now,
  fetchImpl:async()=>new Response(JSON.stringify(feed)),
  evidenceCollector:async()=>({items:[{sourceId:'tasnim',...article}]}),
  generator:async()=>verdict,
 });
 assert.equal(preview.evidenceConfirmed,1);
 assert.equal(preview.verifiedRules[0].rule,'MILITARY_ATTACK');
 assert.equal(preview.verifiedRules[0].delta,-12);
 assert.equal(preview.modelCallsSucceeded,1);
 assert.equal(preview.r5ScoreChanges,0);
 assert.equal(preview.publicWrite,false);
 assert.ok(!JSON.stringify(preview).includes(quote));
});

test('confirmed fatality-first headline stays read-only without bypassing original R5 collection gate',async t=>{
 const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-r3-casualty-r5-'));
 const store=openStore(path.join(tempDir,'iran.sqlite'));
 t.after(()=>{store.close();fs.rmSync(tempDir,{recursive:true,force:true});});
 const at=Date.parse('2026-10-29T12:00:00.000Z');
 const newsItem={id:hash(sourceUrl),source:'Tasnim',sourceUrl,
  title:originalTitle,publishedAt:article.publishedAt};
 const feed={version:'IRAN_NEWS_METADATA_R41',status:'READY',sourceCount:1,
  itemCount:1,displayDays:14,items:[newsItem]};
 const proof=await runEnglishScoreShadow(feed,{now:at,
  externalEvidence:{version:'IRAN_NEWS_ARTICLE_EVIDENCE_R1',items:[{
   sourceId:'tasnim',...article,
  }]},generator:async()=>verdict});
 assert.equal(proof.items[0].status,'EVIDENCE_CONFIRMED');
 const args={now:at,aiScorePolicy:'REQUIRE_VERIFIED_ENGLISH_EVIDENCE',
  englishScoreShadow:proof};
 const plan=planPublishedNewsInput(store,feed,null,args);
 assert.equal(plan.planned.length,1);
 assert.equal(plan.articleResults[0].rule,'MILITARY_ATTACK');
 assert.throws(()=>applyPublishedNewsInput(store,plan,{now:at,dryRun:false}),
  /IRAN_PUBLISHED_NEWS_OPERATIONAL_WRITE_NOT_APPROVED/);
 store.checkpoint('score-news-input-last-run-r1',{version:'IRAN_SCORE_NEWS_INPUT_R1',
  freshnessEligible:true,collectionCheckedAt:at,checkedAt:at,sourcesVerifiedThisRun:7});
 assert.throws(()=>calculateOperationalR5(store,{now:at}),/R5_SOURCE_COLLECTION_UNREADY/);
 assert.throws(()=>applyPublishedNewsInput(store,planPublishedNewsInput(store,feed,null,
  {...args,now:at+1000}),{now:at+1000,dryRun:false}),/OPERATIONAL_WRITE_NOT_APPROVED/);
 assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM sources WHERE id LIKE 'news-metadata:%'").get().n,0);
 assert.throws(()=>calculateOperationalR5(store,{now:at+2000}),/R5_SOURCE_COLLECTION_UNREADY/);
});

test('Windows R3 pilot uses no scheduler, public-write or deployment calls',()=>{
 const bytes=fs.readFileSync(new URL('../scripts/iran-progress/IRAN_ENGLISH_SCORE_R3_PREVIEW.cmd',
  import.meta.url));
 const cmd=bytes.toString('ascii');
 assert.ok(bytes.every(b=>b<=127));
 assert.ok(cmd.includes('\r\n'));
 assert.match(cmd,/english-score-preview-r3\.mjs/);
 assert.doesNotMatch(cmd,/schtasks|wrangler|news-analysis-scheduled-r1\.mjs/i);
});
