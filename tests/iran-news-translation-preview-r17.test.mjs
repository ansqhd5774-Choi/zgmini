import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {selectRelevantSourceExcerpt,validateTranslationDraft,
 previewKoreanPublishedIranNewsR17} from '../scripts/iran-progress/news-display-translation-preview-r17.mjs';
import {toDisplayNewsItem,RIGHTS_SOURCE,RIGHTS_POLICY_URL,IRAN_NEWS_CACHE_VERSION}
 from '../scripts/iran-progress/news-display-r1.mjs';
import {DISPLAY_CACHE_BASENAME} from '../scripts/iran-progress/news-display-io-r1.mjs';

const now=Date.parse('2026-10-27T09:00:00Z');
const url='https://www.gov.uk/government/news/iran-briefing';
const sourceTitle='Iran discussion at the United Nations';
const sourceExcerpt='The ministers discussed recent developments in Iran and agreed to continue diplomatic consultations.';
const body=`<p>Other economic information.</p><p>${sourceExcerpt}</p>`;
const content={base_path:'/government/news/iran-briefing',title:sourceTitle,
 document_type:'press_release',first_published_at:'2026-10-26T12:00:00Z',
 details:{body},links:{organisations:[{base_path:'/government/organisations/foreign-commonwealth-development-office'}]}};
const page='<html><footer>All content is available under the Open Government Licence v3.0 except where otherwise stated</footer></html>';
const rights={rightsVerified:true,rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL};
const item=toDisplayNewsItem({source:'GOV.UK',sourceUrl:url,publishedAt:content.first_published_at,
 title:sourceTitle,summary:'영국 정부 공식 발표에서 이란 관련 내용을 언급했습니다. 상세 내용은 원문에서 확인할 수 있습니다.',
 impact:'neutral',...rights},{now});

test('R17 selects exact complete topical sentence, not a new narrative',()=>{
 assert.equal(selectRelevantSourceExcerpt(body),sourceExcerpt);
 assert.equal(selectRelevantSourceExcerpt('<p>Unrelated bulletin only.</p>'),'');
});

test('R17 checks numbers and named approved country terms across each field',()=>{
 const valid=validateTranslationDraft(JSON.stringify({
  titleKo:'유엔에서 열린 이란 관련 논의',
  excerptKo:'장관들은 최근 이란의 상황을 논의하고 외교적 협의를 계속하기로 합의했다.',
 }),{sourceTitle,sourceExcerpt});
 assert.equal(valid.status,'DRAFT_REQUIRES_HUMAN_REVIEW');
 const newActor=validateTranslationDraft(JSON.stringify({
  titleKo:'유엔에서 열린 이란 관련 논의',excerptKo:'장관들은 이란과 후티 문제를 논의했다.',
 }),{sourceTitle,sourceExcerpt});
 assert.equal(newActor.status,'NAMED_ACTOR_TRANSLATION_MISMATCH');
 assert.equal(newActor.topic,'Houthi');
 const unrelatedActor=validateTranslationDraft(JSON.stringify({
  titleKo:'유엔에서 열린 이란 관련 논의',
  excerptKo:'장관들은 이스라엘과 이란의 최근 상황을 논의했다.',
 }),{sourceTitle,sourceExcerpt});
 assert.equal(unrelatedActor.status,'NAMED_ACTOR_TRANSLATION_MISMATCH');
 assert.equal(unrelatedActor.topic,'Israel');
 assert.equal(validateTranslationDraft(JSON.stringify({titleKo:'이란 관련 논의',excerptKo:'이란에서 20명이 사망했다.'}),
  {sourceTitle,sourceExcerpt}).status,'NUMERIC_FACT_DRIFT');
});

test('R17 prepares drafts for existing English items without modifying PC or remote data',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'iran-news-r17-test-'));
 try{
  writeFileSync(path.join(dir,'iran.sqlite'),'immutable score sentinel');
  const file=path.join(dir,DISPLAY_CACHE_BASENAME);
  const cache=JSON.stringify({version:IRAN_NEWS_CACHE_VERSION,items:[item]});
  writeFileSync(file,cache);
  let translations=0;
  const fetcher=async(url)=>{
   if(url==='https://www.gov.uk/api/content/government/news/iran-briefing')return new Response(JSON.stringify(content));
   if(url===item.sourceUrl)return new Response(page);
   throw Error('unexpected source '+url);
  };
  const result=await previewKoreanPublishedIranNewsR17({dataDirectory:dir,now,modelOverride:'qwen3:4b',fetcher,
   translate:async({sourceTitle:title,sourceExcerpt:excerpt})=>{
    translations++;
    assert.equal(title,sourceTitle);assert.equal(excerpt,sourceExcerpt);
    return validateTranslationDraft(JSON.stringify({titleKo:'유엔에서 열린 이란 관련 논의',
     excerptKo:'장관들은 최근 이란의 상황을 논의하고 외교적 협의를 계속하기로 합의했다.'}),
     {sourceTitle:title,sourceExcerpt:excerpt});
   }});
  assert.equal(result.translatedDrafts,1);assert.equal(result.heldCount,0);
  assert.equal(result.results[0].status,'DRAFT_REQUIRES_HUMAN_REVIEW');
  assert.equal(translations,1);assert.equal(result.publication,'DISABLED');
  assert.equal(result.pcCacheWritten,false);assert.equal(result.d1Written,false);
  assert.equal(readFileSync(file,'utf8'),cache);
  assert.equal(readFileSync(path.join(dir,'iran.sqlite'),'utf8'),'immutable score sentinel');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('R17 preserves previously translated and reviewed Korean publication',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'iran-news-r17-test-'));
 try{
  writeFileSync(path.join(dir,'iran.sqlite'),'score sentinel');
  const reviewed={...item,title:'이란 관련 유엔 회의',summary:'장관들은 이란 문제를 논의했다.'};
  writeFileSync(path.join(dir,DISPLAY_CACHE_BASENAME),JSON.stringify({version:IRAN_NEWS_CACHE_VERSION,items:[reviewed]}));
  const result=await previewKoreanPublishedIranNewsR17({dataDirectory:dir,now,modelOverride:null,
   fetcher:async()=>{throw Error('should not make request');}});
  assert.equal(result.preservedKorean,1);
  assert.equal(result.results[0].status,'PREVIOUS_KOREAN_REVIEW_PRESERVED');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
