import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {generateBoundEnglishScoreEvidence,matchingEnglishEventQuotes}
 from '../scripts/iran-progress/english-score-bound-quote-r3.mjs';
import {generateEnglishScoreEvidence}
 from '../scripts/iran-progress/news-r41-english-score-evidence-r1.mjs';
import {previewEnglishScoreEvidenceR5}
 from '../scripts/iran-progress/english-score-preview-r5.mjs';

const now=Date.parse('2026-10-31T08:00:00.000Z');
const title='At Least 14 Killed in Saudi Strikes on Yemen As Attacks Reach 101 in 24 Hours';
const sourceUrl='https://www.tasnimnews.ir/en/news/2026/10/29/3735170/at-least-14-killed-in-saudi-strikes-on-yemen-as-attacks-reach-101-in-24-hours';
const publishedAt='2026-10-29T11:41:00.000Z';
const quote='At least 14 civilians were killed and 15 others wounded in Saudi airstrikes on a market and a fuel station in Yemen.';
const articleBody=quote+' Additional local reports described the aftermath of the strike. '+
 'Aid agencies reviewed the humanitarian needs of civilians in the northern province.';
const article={sourceUrl,originalTitle:title,publishedAt,articleBody};
const draft={eventRule:'MILITARY_ATTACK',stageStatus:'REPORTED_COMPLETED',supportingQuote:quote};
const item={id:createHash('sha256').update(sourceUrl).digest('hex'),
 source:'Tasnim',sourceUrl,title,publishedAt};
const feed={version:'IRAN_NEWS_METADATA_R41',status:'READY',sourceCount:1,
 itemCount:1,displayDays:14,items:[item]};
const evidenceCollector=async articles=>({items:articles.map(a=>({
 sourceId:a.sourceId,sourceUrl:a.sourceUrl,originalTitle:a.originalTitle,
 publishedAt:a.publishedAt,articleBody,
}))});
const preview=options=>previewEnglishScoreEvidenceR5({now,
 fetchImpl:async()=>new Response(JSON.stringify(feed),{status:200}),
 evidenceCollector,...options});

test('R5 constrains a model decision to the proposed R3 rule or an explicit veto',async()=>{
 const response=await generateBoundEnglishScoreEvidence(article,{
  reportedEventSemantics:true,targetedEventReview:true,
  fetcher:async(url,options)=>{
   assert.equal(url,'http://127.0.0.1:11434/api/generate');
   const request=JSON.parse(options.body);
   assert.deepEqual(request.format.properties.eventRule.enum,['NONE','MILITARY_ATTACK']);
   assert.deepEqual(request.format.properties.supportingQuote.enum,[quote]);
   assert.equal(JSON.parse(request.prompt).proposedEventRule,'MILITARY_ATTACK');
   assert.match(request.system,/HYPOTHESIS/);
   assert.match(request.system,/Otherwise choose eventRule=NONE/);
   assert.equal(request.options.temperature,0);
   return {ok:true,json:async()=>({response:JSON.stringify(draft)})};
  },
 });
 assert.equal(response.proof.status,'EVIDENCE_CONFIRMED');
 assert.equal(response.proof.scoreApplied,false);
 assert.equal(response.proof.rule,'MILITARY_ATTACK');
 assert.ok(!JSON.stringify(response.proof).includes(quote));
});

test('R5 cannot enter targeted review without a scorable title and verified quote options',async()=>{
 await assert.rejects(generateEnglishScoreEvidence(article,{targetedEventReview:true,
  fetcher:async()=>{throw Error('Must not call the model');}}),
 /IRAN_ENGLISH_SCORE_TARGET_EVENT_UNAVAILABLE/);
 assert.deepEqual(matchingEnglishEventQuotes({...article,
  originalTitle:'Iran Ready to Defend Itself, Keeps Door Open to Diplomacy: FM'}),[]);
});

test('R5 reports expected and actual model rules without leaking article text',async()=>{
 const report=await preview({generator:async()=>({...draft,eventRule:'MILITARY_WARNING'})});
 assert.equal(report.modelCallsAttempted,1);
 assert.equal(report.modelCallsSucceeded,1);
 assert.equal(report.evidenceConfirmed,0);
 assert.equal(report.evidenceHeld,1);
 assert.equal(report.inferenceFailures,0);
 assert.equal(report.articleResults[0].reason,'MODEL_STAGE_CONFLICT');
 assert.equal(report.articleResults[0].expectedEventRule,'MILITARY_ATTACK');
 assert.equal(report.articleResults[0].modelEventRule,'MILITARY_WARNING');
 assert.equal(report.articleResults[0].modelStageStatus,'REPORTED_COMPLETED');
 assert.ok(!JSON.stringify(report).includes(quote));
 assert.ok(!JSON.stringify(report).includes(articleBody));
 assert.equal(report.publicWrite,false);
 assert.equal(report.r5ScoreChanges,0);
});

test('R5 respects model refusal and all non-occurred, disputed and negated stages',async()=>{
 for(const changes of [
  {eventRule:'NONE'},
  {stageStatus:'PROPOSED_OR_FUTURE'},
  {stageStatus:'NEGATED_OR_DENIED'},
  {stageStatus:'DISPUTED_OR_UNVERIFIED'},
  {stageStatus:'NO_EVENT'},
 ]){
  const report=await preview({generator:async()=>({...draft,...changes})});
  assert.equal(report.evidenceConfirmed,0);
  assert.equal(report.articleResults[0].status,'HELD');
  assert.equal(report.publicWrite,false);
  assert.equal(report.r5ScoreChanges,0);
 }
});

test('R5 never calls Ollama without a quote independently matching the title',async()=>{
 let calls=0;
 const report=await preview({evidenceCollector:async articles=>({items:articles.map(a=>({
  sourceId:a.sourceId,sourceUrl:a.sourceUrl,originalTitle:a.originalTitle,
  publishedAt:a.publishedAt,articleBody:'Officials discussed future diplomatic meetings. '+
   'The participants agreed to issue another statement to the media later. '+
   'The meeting agenda included humanitarian funding and updates to public information.',
 }))}),generator:async()=>{calls++;return draft;}});
 assert.equal(calls,0);
 assert.equal(report.heldNoMatchingQuote,1);
 assert.equal(report.modelCallsAttempted,0);
 assert.equal(report.r5ScoreChanges,0);
});

test('R5 can confirm a matching reported event but does not alter the public score',async()=>{
 const report=await preview({generator:async()=>draft});
 assert.equal(report.evidenceConfirmed,1);
 assert.equal(report.verifiedRules[0].rule,'MILITARY_ATTACK');
 assert.equal(report.verifiedRules[0].delta,-12);
 assert.equal(report.articleResults[0].expectedEventRule,'MILITARY_ATTACK');
 assert.equal(report.articleResults[0].modelEventRule,'MILITARY_ATTACK');
 assert.equal(report.r5ScoreChanges,0);
 assert.equal(report.publicWrite,false);
});

test('R5 Windows launcher is ASCII CRLF and does not publish or alter tasks',()=>{
 const bytes=fs.readFileSync(new URL(
  '../scripts/iran-progress/IRAN_ENGLISH_SCORE_R5_PREVIEW.cmd',import.meta.url));
 const command=bytes.toString('ascii');
 assert.equal(bytes.some(b=>b>127),false);
 assert.ok(command.includes('\r\n'));
 assert.match(command,/english-score-preview-r5\.mjs/);
 assert.match(command,/ENGLISH_SCORE_R5_SHADOW_NO_PUBLISH/);
 assert.doesNotMatch(command,/schtasks|wrangler|news-analysis-scheduled-r1\.mjs/i);
});
