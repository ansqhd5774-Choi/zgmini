import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {privateNewsReviewQueue} from '../scripts/iran-progress/ui-news-publication-gate-r1.mjs';
import {R26_ARTICLE_EVIDENCE_VERSION,R26_KOREAN_DRAFT_VERSION,
 matchR26ArticleEvidence,validateR26KoreanDraft,generateR26KoreanDraft,
 draftR26News} from '../scripts/iran-progress/news-r26-ollama-drafts-r1.mjs';

const now=Date.parse('2026-10-28T12:00:00.000Z');
const url='https://www.tasnimnews.ir/en/news/2026/10/27/3733799/iran-gas';
const oldUrl='https://news.un.org/en/story/2026/10/1168559';
const body='Iranian officials said on Tuesday that the country produced 300 billion cubic meters of natural gas each year. The president called for regional energy cooperation, and the statement did not announce any new contract or binding agreement.';
const quote='The president called for regional energy cooperation';
function candidate(sourceUrl,sourceId,publishedAt,originalTitle){
 return {id:createHash('sha256').update(sourceUrl).digest('hex'),sourceUrl,sourceId,
  originalTitle,publisherDeclaredPublishedAt:publishedAt,rightsVerified:false,
  displayEligible:false,reviewStatus:'ARTICLE_METADATA_REVIEWED'};
}
const current=candidate(url,'tasnim','2026-10-27T13:11:33.763Z','President cites Iran 300 bcm gas output');
const old=candidate(oldUrl,'un-middle-east','2026-10-09T12:00:00.000Z','Yemen aid update');
const collection={version:'IRAN_NEWS_COLLECTION_R26',updatedAt:now-1000,items:[current,old]};
const queue=privateNewsReviewQueue(collection,{now});
const evidence={version:R26_ARTICLE_EVIDENCE_VERSION,items:[{
 sourceId:current.sourceId,sourceUrl:url,originalTitle:current.originalTitle,
 publishedAt:current.publisherDeclaredPublishedAt,articleBody:body,
}]};
const draft={title:'이란 대통령, 연간 300 규모 가스 생산량 언급하며 협력 촉구',
 summary:'이란 대통령은 연간 300 규모의 가스 생산을 언급하며 주변국과 에너지 협력 필요성을 강조했다. 새로운 계약이 체결됐다는 발표는 없었다.',
 impact:'neutral',supportingQuotes:[quote]};

test('private R26 metadata alone cannot produce Korean drafts',async()=>{
 const out=await draftR26News(queue,{version:R26_ARTICLE_EVIDENCE_VERSION,items:[]},{now,
  generator:()=>{throw Error('must not call Ollama');}});
 assert.equal(out.report.missingEvidenceWithin14Days,1);
 assert.equal(out.report.drafted,0);
 assert.equal(out.report.publicWriteAttempted,false);
});

test('article evidence must match exact R26 URL/source/title/date',()=>{
 for(const override of [{sourceId:'govuk'},{publishedAt:'2026-10-26T13:11:33.763Z'},
   {sourceUrl:'https://www.tasnimnews.ir/en/news/2026/10/27/another'},
   {originalTitle:'Different story'}]){
  assert.throws(()=>matchR26ArticleEvidence(queue,{...evidence,
   items:[{...evidence.items[0],...override}]}),/NEWS_R26_EVIDENCE_UNMATCHED/);
 }
 assert.throws(()=>matchR26ArticleEvidence(queue,{...evidence,
  items:[evidence.items[0],evidence.items[0]]}),/NEWS_R26_EVIDENCE_ITEM_INVALID/);
});

test('outdated article text is not sent for a public-window Ollama draft',async()=>{
 const oldEvidence={...evidence,items:[{sourceId:old.sourceId,sourceUrl:oldUrl,
  originalTitle:old.originalTitle,publishedAt:old.publisherDeclaredPublishedAt,articleBody:body}]};
 const out=await draftR26News(queue,oldEvidence,{now,
  generator:()=>{throw Error('model should not run for old candidate');}});
 assert.equal(out.report.evidenceWithin14Days,0);
 assert.equal(out.report.drafted,0);
});

test('Ollama output must be Korean, cite verbatim evidence, and invent no numbers',()=>{
 assert.deepEqual(validateR26KoreanDraft(draft,{originalTitle:current.originalTitle,
  articleBody:body}),draft);
 assert.throws(()=>validateR26KoreanDraft({...draft,summary:'아무 내용 없음'},
  {originalTitle:current.originalTitle,articleBody:body}),/NEWS_R26_DRAFT_OUTPUT_INVALID/);
 assert.throws(()=>validateR26KoreanDraft({...draft,supportingQuotes:['invented quote unrelated']},
  {originalTitle:current.originalTitle,articleBody:body}),/NEWS_R26_DRAFT_OUTPUT_INVALID/);
 assert.throws(()=>validateR26KoreanDraft({...draft,title:'이란 가스 생산량 800 확대 발표'},
  {originalTitle:current.originalTitle,articleBody:body}),/NEWS_R26_DRAFT_NEW_NUMBER/);
 assert.throws(()=>validateR26KoreanDraft({...draft,summary:
  '영국 정부 공식 발표에서 이란 관련 내용을 언급했습니다. 상세 내용은 원문에서 확인할 수 있습니다.'},
  {originalTitle:current.originalTitle,articleBody:body}),/NEWS_R26_DRAFT_OUTPUT_INVALID/);
});

test('structured Ollama call remains fixed to localhost and draft does not approve publication',async()=>{
 let calls=0;
 const generated=await generateR26KoreanDraft({originalTitle:current.originalTitle,
  articleBody:body},{now,modelDigest:'sha256:installed-model',fetcher:async (requested,options)=>{
   calls++;
   assert.equal(requested,'http://127.0.0.1:11434/api/generate');
   const payload=JSON.parse(options.body);
   assert.equal(payload.stream,false);
   assert.equal(payload.options.temperature,0);
   assert.equal(payload.format.type,'object');
   assert.equal(payload.prompt.includes(url),false);
   return {ok:true,json:async()=>({response:JSON.stringify(draft)})};
  }});
 assert.equal(calls,1);
 assert.equal(generated.impact,'neutral');
 assert.ok(!('rightsVerified' in generated));
 const out=await draftR26News(queue,evidence,{now,modelDigest:'sha256:installed-model',
  generator:async()=>generated});
 assert.equal(out.version,R26_KOREAN_DRAFT_VERSION);
 assert.equal(out.items.length,1);
 assert.equal(out.items[0].reviewStatus,'PENDING_EDITORIAL_AND_RIGHTS_REVIEW');
 assert.equal(out.items[0].rightsVerified,false);
 assert.equal(out.items[0].displayEligible,false);
 assert.equal(out.items[0].suggestedImpact,'neutral');
 assert.equal(out.report.publicWriteAttempted,false);
 assert.ok(!('articleBody' in out.items[0]));
});

test('malformed model response is rejected and not replaced with fabricated copy',async()=>{
 const out=await draftR26News(queue,evidence,{now,generator:async()=>({
  ...draft,supportingQuotes:['the model hallucinated this source quote'],
 })});
 assert.equal(out.items.length,0);
 assert.equal(out.failures.length,1);
 assert.equal(out.failures[0].reason,'NEWS_R26_DRAFT_OUTPUT_INVALID');
 assert.equal(out.report.status,'NO_PUBLISHABLE_DRAFTS');
});
