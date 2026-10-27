import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {translationPromptR19,ensureTranslateGemmaR19,translateArticleR19,
 inspectTranslateGemmaNewsR19,formatTranslateGemmaReportR19,R19_MODEL}
 from '../scripts/iran-progress/news-display-translategemma-review-r19.mjs';
import {toDisplayNewsItem,RIGHTS_SOURCE,RIGHTS_POLICY_URL,IRAN_NEWS_CACHE_VERSION}
 from '../scripts/iran-progress/news-display-r1.mjs';
import {DISPLAY_CACHE_BASENAME} from '../scripts/iran-progress/news-display-io-r1.mjs';

const now=Date.parse('2026-10-27T10:00:00Z');
const sourceTitle='Change of His Majesty’s Ambassador to Yemen';
const sourceExcerpt='Ms Ann Snow MBE has been appointed His Majesty’s Ambassador to the Republic of Yemen in succession to Ms Abda Sharif OBE, who will be transferring to another Diplomatic Service appointment.';
const sourceUrl='https://www.gov.uk/government/news/change-ambassador-yemen';
const publicationDate='2026-10-26T09:00:00Z';
const content={base_path:'/government/news/change-ambassador-yemen',title:sourceTitle,
 first_published_at:publicationDate,document_type:'news_story',
 details:{body:`<p>${sourceExcerpt}</p>`},
 links:{organisations:[{base_path:'/government/organisations/foreign-commonwealth-development-office'}]}};
const page='<html>All content is available under the Open Government Licence v3.0 except where otherwise stated</html>';
const item=toDisplayNewsItem({source:'GOV.UK',sourceUrl,title:sourceTitle,
 summary:'영국 정부 공식 발표에서 예멘 관련 내용을 언급했습니다. 상세 내용은 원문에서 확인할 수 있습니다.',
 publishedAt:publicationDate,impact:'neutral',rightsVerified:true,
 rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL},{now});

test('R19 uses the official TranslateGemma language prompt and exactly two blank lines',()=>{
 const p=translationPromptR19('Hello, world.');
 assert.match(p,/English \(en\) to Korean \(ko\)/);
 assert.ok(p.endsWith('Korean:\n\n\nHello, world.'));
 assert.throws(()=>translationPromptR19(''),/R19_SOURCE_TEXT_INVALID/);
});

test('R19 checks existing installation without a download',async()=>{
 let count=0;
 const result=await ensureTranslateGemmaR19({allowInstall:true,fetcher:async (url)=>{
  count++;assert.match(url,/api\/tags$/);
  return new Response(JSON.stringify({models:[{name:R19_MODEL}]}));
 }});
 assert.equal(result.status,'ALREADY_INSTALLED');assert.equal(count,1);
});

test('R19 pulls only the approved model and requires success and post-pull tag',async()=>{
 let n=0;const events=[];
 const result=await ensureTranslateGemmaR19({allowInstall:true,logger:m=>events.push(m),
  fetcher:async(url,options={})=>{
   n++;
   if(n===1)return new Response(JSON.stringify({models:[{name:'gemma3:4b'}]}));
   if(n===2){
    assert.match(url,/api\/pull$/);
    assert.equal(options.method,'POST');
    assert.deepEqual(JSON.parse(options.body),{name:R19_MODEL,stream:true});
    return new Response('{"status":"downloading","completed":50,"total":100}\n{"status":"success"}\n');
   }
   return new Response(JSON.stringify({models:[{name:R19_MODEL}]}));
  }});
 assert.equal(result.status,'NEWLY_INSTALLED');assert.equal(n,3);
 assert.ok(events.some(s=>s.startsWith('MODEL_PULL_PROGRESS=')));
});

test('R19 translation makes two separate requests and blocks Yemen-to-Iran drift',async()=>{
 const messages=[];
 const fetcher=async(url,options)=>{
  assert.match(url,/api\/chat$/);
  const req=JSON.parse(options.body);
  messages.push(req.messages[0].content);
  assert.equal(req.model,R19_MODEL);assert.equal(req.format,undefined);
  const isTitle=messages.length===1;
  return new Response(JSON.stringify({message:{content:isTitle?'이란 외교관 변경':
   '앤 스노가 예멘 주재 대사로 임명되었다.'}}));
 };
 const response=await translateArticleR19({sourceTitle,sourceExcerpt,fetcher});
 assert.equal(messages.length,2);
 assert.equal(response.status,'NAMED_ACTOR_TRANSLATION_MISMATCH');
 assert.equal(response.failedTopic,'Iran');
});

test('R19 uses R18 rights/identity checks and never changes PC cache or ledger',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'iran-r19-test-'));
 try{
  const cached=JSON.stringify({version:IRAN_NEWS_CACHE_VERSION,items:[item]});
  writeFileSync(path.join(dir,'iran.sqlite'),'score sentinel');
  const cachePath=path.join(dir,DISPLAY_CACHE_BASENAME);
  writeFileSync(cachePath,cached);
  const report=await inspectTranslateGemmaNewsR19({dataDirectory:dir,now,
   modelCheck:async()=>({status:'ALREADY_INSTALLED'}),
   fetcher:async url=>{
    if(url==='https://www.gov.uk/api/content/government/news/change-ambassador-yemen')
     return new Response(JSON.stringify(content));
    if(url===sourceUrl)return new Response(page);
    throw Error('Unexpected source '+url);
   },
   translate:async()=>({status:'DRAFT_REQUIRES_HUMAN_REVIEW',
    titleKo:'예멘 주재 영국 대사 교체',
    excerptKo:'앤 스노가 압다 샤리프의 후임으로 예멘 주재 영국 대사로 임명되었다.',
    failedTopic:null,terminologyWarnings:[]})});
  assert.equal(report.model,R19_MODEL);
  assert.equal(report.translatedCount,1);
  assert.equal(report.publication,'DISABLED');
  assert.equal(report.translationAutoApproved,false);
  assert.equal(report.pcCacheWritten,false);
  assert.equal(report.d1Written,false);
  assert.equal(report.schedulerModified,false);
  assert.equal(report.scoreLedgerModified,false);
  assert.equal(readFileSync(cachePath,'utf8'),cached);
  assert.equal(readFileSync(path.join(dir,'iran.sqlite'),'utf8'),'score sentinel');
  const output=formatTranslateGemmaReportR19(report);
  assert.match(output,/EN_SOURCE_EXCERPT=/);
  assert.match(output,/KO_TITLE=예멘 주재 영국 대사 교체/);
  assert.match(output,/FINAL_STATUS=R19_TRANSLATION_DRAFTS_REQUIRE_HUMAN_REVIEW_NO_PUBLICATION/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
