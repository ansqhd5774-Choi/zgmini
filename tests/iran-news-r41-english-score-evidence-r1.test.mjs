import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {validateEnglishScoreEvidence,generateEnglishScoreEvidence,runEnglishScoreShadow,
 ENGLISH_SCORE_EVIDENCE_VERSION} from '../scripts/iran-progress/news-r41-english-score-evidence-r1.mjs';
import {previewEnglishScoreEvidence} from '../scripts/iran-progress/english-score-preview-r1.mjs';

const now=Date.parse('2026-10-31T08:00:00.000Z');
const sourceUrl='https://www.gov.uk/government/news/iran-saudi-direct-talks';
const originalTitle='Iran and Saudi officials held peace talks in Tehran';
const publishedAt='2026-10-31T02:00:00.000Z';
const articleBody='Iran and Saudi officials held peace talks in Tehran on Friday. '+
 'The foreign ministers reviewed the diplomatic options for next month. '+
 'The teams did not sign a ceasefire agreement and agreed to meet again next week.';
const supportingQuote='Iran and Saudi officials held peace talks in Tehran on Friday.';
const draft={eventRule:'TALKS_HELD',stageStatus:'REPORTED_COMPLETED',supportingQuote};
const article={sourceUrl,originalTitle,publishedAt,articleBody};
const item={sourceUrl,id:createHash('sha256').update(sourceUrl).digest('hex'),
 source:'GOV.UK',title:originalTitle,publishedAt};
const evidence={version:'IRAN_NEWS_ARTICLE_EVIDENCE_R1',items:[{
 sourceUrl,sourceId:'govuk',originalTitle,publishedAt,articleBody,
}]};

test('English review confirms only matching original headline and verbatim event quote',()=>{
 const result=validateEnglishScoreEvidence(draft,article);
 assert.equal(result.version,ENGLISH_SCORE_EVIDENCE_VERSION);
 assert.equal(result.status,'EVIDENCE_CONFIRMED');
 assert.equal(result.rule,'TALKS_HELD');
 assert.equal(result.delta,8);
 assert.equal(result.scoreApplied,false);
 assert.ok(!JSON.stringify(result).includes(supportingQuote));
 assert.ok(!JSON.stringify(result).includes(articleBody));
});

test('negative, uncertain or quote-unsupported claims cannot enter R5',()=>{
 for(const stageStatus of ['PROPOSED_OR_FUTURE','NEGATED_OR_DENIED','DISPUTED_OR_UNVERIFIED']){
  const result=validateEnglishScoreEvidence({...draft,stageStatus},article);
  assert.equal(result.status,'HELD');
  assert.equal(result.reason,'EVENT_NOT_VERIFIED_AS_OCCURRED');
 }
 const missing=validateEnglishScoreEvidence({...draft,eventRule:'CEASEFIRE_SIGNED'},article);
 assert.equal(missing.reason,'MODEL_STAGE_CONFLICT');
 const vague=validateEnglishScoreEvidence({...draft,
  supportingQuote:'The foreign ministers reviewed the diplomatic options for next month.'},article);
 assert.equal(vague.reason,'QUOTE_DOES_NOT_PROVE_STAGE');
 assert.throws(()=>validateEnglishScoreEvidence({...draft,supportingQuote:
  'Iran and Saudi officials signed a ceasefire on Friday.'},article),/MODEL_INVALID/);
 const differentActor='Houthi and Saudi officials held peace talks in Aden on Friday.';
 const different=validateEnglishScoreEvidence({...draft,supportingQuote:differentActor},
  {...article,articleBody:articleBody+' '+differentActor});
 assert.equal(different.status,'HELD');
 assert.equal(different.reason,'QUOTE_EVENT_IDENTITY_CONFLICT');
});

test('local Ollama review uses English-only compact JSON and zero temperature',async()=>{
 const response=await generateEnglishScoreEvidence(article,{fetcher:async(url,options)=>{
  assert.equal(url,'http://127.0.0.1:11434/api/generate');
  assert.equal(options.method,'POST');
  const request=JSON.parse(options.body);
  assert.match(request.system,/Do not translate anything/);
  assert.equal(request.options.temperature,0);
  assert.deepEqual(request.format.required,['eventRule','stageStatus','supportingQuote']);
  assert.equal(request.stream,false);
  return {ok:true,json:async()=>({response:JSON.stringify(draft)})};
 }});
 assert.deepEqual(response.draft,draft);
 assert.equal(response.proof.status,'EVIDENCE_CONFIRMED');
});

test('rights-checked source evidence is required; shadow never writes score',async()=>{
 let calls=0;
 const generator=async()=>{calls++;return draft;};
 const empty=await runEnglishScoreShadow({items:[item]},
  {now,generator,externalEvidence:null});
 assert.equal(calls,0);
 assert.equal(empty.items.length,0);
 assert.equal(empty.pending[0].reason,'RIGHTS_CHECKED_BODY_NOT_AVAILABLE');
 const scored=await runEnglishScoreShadow({items:[item]},
  {now,generator,externalEvidence:evidence});
 assert.equal(calls,1);
 assert.equal(scored.items[0].status,'EVIDENCE_CONFIRMED');
 assert.equal(scored.r5ScoreChanges,0);
 assert.equal(scored.publicWrite,false);
 assert.equal(scored.status,'SHADOW_ONLY');
});
test('PC preview collects eligible English originals and has no score or public writes',async()=>{
 let collected=0;
 const result=await previewEnglishScoreEvidence({now,
  fetchImpl:async()=>new Response(JSON.stringify({version:'IRAN_NEWS_METADATA_R41',
   status:'READY',sourceCount:1,itemCount:1,displayDays:14,items:[item]}),{status:200}),
  evidenceCollector:async(rows)=>{
   collected++;
   assert.equal(rows.length,1);
   assert.equal(rows[0].sourceUrl,sourceUrl);
   return {items:evidence.items};
  },generator:async()=>draft,
 });
 assert.equal(collected,1);
 assert.equal(result.newsCount,1);
 assert.equal(result.evidenceConfirmed,1);
 assert.equal(result.verifiedRules[0].delta,8);
 assert.equal(result.articleResults.length,1);
 assert.equal(result.articleResults[0].status,'EVIDENCE_CONFIRMED');
 assert.equal(result.articleResults[0].source,'GOV.UK');
 assert.equal(result.articleResults[0].rule,'TALKS_HELD');
 assert.ok(!JSON.stringify(result).includes(articleBody));
 assert.ok(!JSON.stringify(result).includes(supportingQuote));
 assert.equal(result.publicWrite,false);
 assert.equal(result.r5ScoreChanges,0);
});
test('Korean-only publisher permission cannot authorize English score inference',async()=>{
 const bbcUrl='https://www.bbc.com/news/articles/iran-talks-briefing';
 const bbcItem={...item,id:createHash('sha256').update(bbcUrl).digest('hex'),
  source:'BBC',sourceUrl:bbcUrl};
 const permittedForKorean={version:'IRAN_NEWS_ARTICLE_EVIDENCE_R1',items:[{
  sourceId:'bbc-middle-east',sourceUrl:bbcUrl,originalTitle,
  publishedAt,articleBody,analysisPermission:{
   granted:true,scope:'AI_KOREAN_PROVISIONAL_INTERPRETATION',
   basis:'EXPLICIT_PUBLISHER_PERMISSION',reviewer:'News clearance officer',
   documentUrl:'https://www.bbc.com/pages/terms-of-use',
   reviewedAt:'2026-10-30T09:00:00.000Z',
  },
 }]};
 const report=await runEnglishScoreShadow({items:[bbcItem]},{now,
  externalEvidence:permittedForKorean,
  generator:async()=>{throw Error('Korean permission cannot authorize English inference');}});
 assert.equal(report.items.length,0);
 assert.equal(report.pending[0].reason,'SOURCE_RIGHTS_RESTRICTED');
});
test('Windows launcher is ASCII CRLF, read-only and never calls scheduled publisher',()=>{
 const bytes=fs.readFileSync(new URL('../scripts/iran-progress/IRAN_ENGLISH_SCORE_R1_PREVIEW.cmd',
  import.meta.url));
 const text=bytes.toString('ascii');
 assert.equal(bytes.some(byte=>byte>127),false);
 assert.ok(text.includes('\r\n'));
 assert.match(text,/english-score-preview-r1\.mjs/);
 assert.doesNotMatch(text,/news-analysis-scheduled-r1\.mjs|schtasks(?:\.exe)?\s+\/create|wrangler/i);
});
test('PC preview fails closed when Ollama server or model is unavailable',async()=>{
 let feedCalls=0;
 await assert.rejects(previewEnglishScoreEvidence({now,
  ollamaFetch:async(url)=>{
   assert.equal(url,'http://127.0.0.1:11434/api/tags');
   return {ok:true,json:async()=>({models:[{name:'some-other-model',digest:'test'}]})};
  },fetchImpl:async()=>{feedCalls++;throw Error('should not read news');},
 }),/IRAN_ENGLISH_SCORE_OLLAMA_MODEL_UNAVAILABLE/);
 assert.equal(feedCalls,0);
});
