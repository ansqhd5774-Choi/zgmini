import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {compareKoreanIranNewsR18,assessTranslationTerminology,inspectTranslationResponse}
 from '../scripts/iran-progress/news-display-translation-compare-r18.mjs';
import {toDisplayNewsItem,RIGHTS_SOURCE,RIGHTS_POLICY_URL,IRAN_NEWS_CACHE_VERSION}
 from '../scripts/iran-progress/news-display-r1.mjs';
import {DISPLAY_CACHE_BASENAME} from '../scripts/iran-progress/news-display-io-r1.mjs';

const now=Date.parse('2026-10-27T10:00:00Z');
const sourceUrl='https://www.gov.uk/government/news/iran-statement';
const sourceTitle='Deterrence is not a threat: UK statement to the OSCE';
const excerpt='The ministers discussed the situation in Iran and confirmed their support for continued dialogue.';
const content={base_path:'/government/news/iran-statement',title:sourceTitle,
 document_type:'statement',first_published_at:'2026-10-26T10:00:00Z',
 details:{body:`<p>${excerpt}</p>`},links:{organisations:[{base_path:'/government/organisations/foreign-commonwealth-development-office'}]}};
const page='<html><footer>All content is available under the Open Government Licence v3.0 except where otherwise stated</footer></html>';
const item=toDisplayNewsItem({source:'GOV.UK',sourceUrl,title:sourceTitle,
 summary:'영국 정부 공식 발표에서 이란 관련 내용을 언급했습니다. 상세 내용은 원문에서 확인할 수 있습니다.',
 publishedAt:content.first_published_at,impact:'neutral',rightsVerified:true,
 rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL},{now});

test('R18 flags semantic terminology even when R17 structural validation passes',()=>{
 assert.deepEqual(assessTranslationTerminology('Deterrence is not a threat','위협이 아닌 방어'),['deterrence']);
 assert.deepEqual(assessTranslationTerminology('Deterrence is not a threat','억지력은 위협이 아니다'),[]);
 const draft=inspectTranslationResponse(JSON.stringify({
  titleKo:'위협이 아닌 방어: 영국의 OSCE 성명',
  excerptKo:'장관들은 이란의 상황을 논의하고 지속적인 대화를 지지한다고 확인했다.',
 }),sourceTitle,excerpt);
 assert.equal(draft.status,'DRAFT_REQUIRES_HUMAN_REVIEW');
 assert.deepEqual(draft.terminologyWarnings,['TITLE_deterrence']);
 assert.match(draft.titleKo,/방어/);
});

test('R18 preserves both failed and passing model drafts and writes nothing',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'iran-r18-test-'));
 try{
  const before=JSON.stringify({version:IRAN_NEWS_CACHE_VERSION,items:[item]});
  writeFileSync(path.join(dir,'iran.sqlite'),'score sentinel');
  const cacheFile=path.join(dir,DISPLAY_CACHE_BASENAME);
  writeFileSync(cacheFile,before);
  const compared=[];
  const report=await compareKoreanIranNewsR18({dataDirectory:dir,now,
   modelsOverride:['qwen3:4b','gemma3:4b'],
   fetcher:async url=>{
    if(url==='https://www.gov.uk/api/content/government/news/iran-statement')return new Response(JSON.stringify(content));
    if(url===sourceUrl)return new Response(page);
    throw Error('Unexpected '+url);
   },
   translate:async({model,sourceTitle:title,sourceExcerpt:part})=>{
    compared.push(model);assert.equal(title,sourceTitle);assert.equal(part,excerpt);
    return model==='qwen3:4b'
     ?{status:'NAMED_ACTOR_TRANSLATION_MISMATCH',failedTopic:'Iran',titleKo:'위협이 아닌 방어',excerptKo:'사우디아라비아 관련 성명'}
     :{status:'DRAFT_REQUIRES_HUMAN_REVIEW',titleKo:'억지력은 위협이 아니다: 영국의 OSCE 성명',
      excerptKo:'장관들은 이란 상황을 논의하고 지속적인 대화에 대한 지지를 확인했다.'};
   }});
  assert.deepEqual(compared,['qwen3:4b','gemma3:4b']);
  assert.equal(report.comparedArticles,1);
  assert.equal(report.results[0].translations[0].failedTopic,'Iran');
  assert.match(report.results[0].translations[1].titleKo,/억지력/);
  assert.equal(report.publication,'DISABLED');assert.equal(report.pcCacheWritten,false);
  assert.equal(report.d1Written,false);assert.equal(report.scoreLedgerModified,false);
  assert.equal(readFileSync(cacheFile,'utf8'),before);
  assert.equal(readFileSync(path.join(dir,'iran.sqlite'),'utf8'),'score sentinel');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
