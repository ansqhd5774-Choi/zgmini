import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {previewEnglishScoreEvidenceR4}
 from '../scripts/iran-progress/english-score-preview-r4.mjs';
import {generateBoundEnglishScoreEvidence}
 from '../scripts/iran-progress/english-score-bound-quote-r3.mjs';

const now=Date.parse('2026-10-31T08:00:00.000Z');
const title='At Least 14 Killed in Saudi Strikes on Yemen As Attacks Reach 101 in 24 Hours';
const sourceUrl='https://www.tasnimnews.ir/en/news/2026/10/29/3735170/at-least-14-killed-in-saudi-strikes-on-yemen-as-attacks-reach-101-in-24-hours';
const publishedAt='2026-10-29T11:41:00.000Z';
const quote='At least 14 civilians were killed and 15 others wounded in Saudi airstrikes on a market and a fuel station in Yemen.';
const articleBody=quote+' Additional local reports described the aftermath of the strike in the area. '+
 'Aid groups reviewed the needs of the civilians and prepared supplies for affected families.';
const draft={eventRule:'MILITARY_ATTACK',stageStatus:'REPORTED_COMPLETED',supportingQuote:quote};
const tasnim=(id,headline,date)=>({source:'Tasnim',sourceUrl:`https://www.tasnimnews.ir/en/news/${date.replaceAll('-','/')}/${id}/article`,
 title:headline,publishedAt:`${date}T11:41:00.000Z`});
const items=[
 tasnim('3733652',"Leader Stresses Iran's Continued Management of Strait of Hormuz",'2026-10-27'),
 tasnim('3734212',"Iran's Foreign Ministry Urges Qatar to Uphold Requirements of Mediation",'2026-10-28'),
 tasnim('3735037','Iran Ready to Defend Itself, Keeps Door Open to Diplomacy: FM','2026-10-29'),
 {source:'Tasnim',sourceUrl,title,publishedAt},
 tasnim('3735725',"No Progress Possible without Acceptance of Iran's Conditions, Qalibaf Says",'2026-10-30'),
 tasnim('3735916',"Cleric Highlights National Demand for Change in Iran's Nuclear Doctrine",'2026-10-30'),
 {source:'GOV.UK',sourceUrl:'https://www.gov.uk/government/speeches/iran-must-allow-the-return-of-iaea-inspectors-to-all-nuclear-sites',
  title:'Iran must allow the return of IAEA inspectors to all nuclear sites',publishedAt:'2026-10-28T09:00:00.000Z'},
].map(item=>({...item,id:createHash('sha256').update(item.sourceUrl).digest('hex')}));
const feed={version:'IRAN_NEWS_METADATA_R41',status:'READY',sourceCount:2,
 itemCount:items.length,displayDays:14,items};
const collector=async rows=>({items:rows.map(article=>({sourceId:article.sourceId,
 sourceUrl:article.sourceUrl,originalTitle:article.originalTitle,
 publishedAt:article.publishedAt,articleBody}))});
const preview=options=>previewEnglishScoreEvidenceR4({now,
 fetchImpl:async()=>new Response(JSON.stringify(feed),{status:200}),
 evidenceCollector:collector,...options});

test('R4 screens all six unscorable real headlines before body collection and model calls',async()=>{
 let collected=0,calls=0;
 const result=await preview({evidenceCollector:async rows=>{
  collected++;assert.deepEqual(rows.map(row=>row.sourceUrl),[sourceUrl]);
  return collector(rows);
 },generator:async()=>{calls++;return draft;}});
 assert.equal(collected,1);
 assert.equal(calls,1);
 assert.equal(result.modelCallsAttempted,1);
 assert.equal(result.modelCallsSucceeded,1);
 assert.equal(result.screenedOutNoEvent,6);
 assert.equal(result.evidenceConfirmed,1);
 assert.equal(result.inferenceFailures,0);
 assert.equal(result.verifiedRules[0].rule,'MILITARY_ATTACK');
 assert.equal(result.verifiedRules[0].delta,-12);
 assert.equal(result.r5ScoreChanges,0);
 assert.equal(result.publicWrite,false);
 assert.ok(!JSON.stringify(result).includes(quote));
 assert.ok(!JSON.stringify(result).includes(articleBody));
});

test('R4 refuses model calls when the article body lacks an event-matching quote',async()=>{
 let calls=0;
 const result=await preview({evidenceCollector:async rows=>({items:rows.map(a=>({
  sourceId:a.sourceId,sourceUrl:a.sourceUrl,originalTitle:a.originalTitle,
  publishedAt:a.publishedAt,articleBody:'The report discussed diplomatic activities in several countries. '+
   'Officials outlined their priorities for the coming weeks and made statements on international trade policies.',
 }))}),generator:async()=>{calls++;return draft;}});
 assert.equal(calls,0);
 assert.equal(result.heldNoMatchingQuote,1);
 assert.equal(result.modelCallsAttempted,0);
 assert.equal(result.inferenceFailures,0);
 assert.equal(result.evidenceConfirmed,0);
});

test('R4 records safe quote diagnostic without recording the original evidence',async()=>{
 const result=await preview({generator:async()=>({...draft,
  supportingQuote:'This invented sentence is not contained anywhere in the source article body.'})});
 assert.equal(result.modelCallsAttempted,1);
 assert.equal(result.modelCallsSucceeded,0);
 assert.equal(result.inferenceFailures,1);
 assert.equal(result.inferenceFailureCodes.MODEL_QUOTE_NOT_VERBATIM,1);
 const attack=result.articleResults.find(row=>row.sourceUrl===sourceUrl);
 assert.equal(attack.reason,'IRAN_ENGLISH_SCORE_EVIDENCE_MODEL_INVALID');
 assert.equal(attack.diagnosticCode,'MODEL_QUOTE_NOT_VERBATIM');
 assert.ok(!JSON.stringify(result).includes('invented sentence'));
});

test('R4 makes model stage refusal explicit but never overrides it automatically',async()=>{
 const result=await preview({generator:async()=>({...draft,stageStatus:'DISPUTED_OR_UNVERIFIED'})});
 const attack=result.articleResults.find(row=>row.sourceUrl===sourceUrl);
 assert.equal(attack.reason,'EVENT_NOT_VERIFIED_AS_OCCURRED');
 assert.equal(attack.modelStageStatus,'DISPUTED_OR_UNVERIFIED');
 assert.equal(result.evidenceConfirmed,0);
 assert.equal(result.r5ScoreChanges,0);
});

test('R4 prompt distinguishes an attributed past report from independent confirmation',async()=>{
 const input={sourceUrl,originalTitle:title,publishedAt,articleBody};
 const output=await generateBoundEnglishScoreEvidence(input,{reportedEventSemantics:true,
  fetcher:async(url,options)=>{
   assert.equal(url,'http://127.0.0.1:11434/api/generate');
   const request=JSON.parse(options.body);
   assert.match(request.system,/NOT assert independent factual verification/);
   assert.deepEqual(request.format.properties.supportingQuote.enum,[quote]);
   assert.equal(request.options.temperature,0);
   return {ok:true,json:async()=>({response:JSON.stringify(draft)})};
  }});
 assert.equal(output.proof.status,'EVIDENCE_CONFIRMED');
 assert.equal(output.proof.scoreApplied,false);
});

test('R4 Windows launcher stays ASCII CRLF and cannot deploy or reschedule',()=>{
 const bytes=fs.readFileSync(new URL('../scripts/iran-progress/IRAN_ENGLISH_SCORE_R4_PREVIEW.cmd',import.meta.url));
 const command=bytes.toString('ascii');
 assert.equal(bytes.some(b=>b>127),false);
 assert.ok(command.includes('\r\n'));
 assert.match(command,/english-score-preview-r4\.mjs/);
 assert.doesNotMatch(command,/schtasks|wrangler|news-analysis-scheduled-r1\.mjs/i);
});
