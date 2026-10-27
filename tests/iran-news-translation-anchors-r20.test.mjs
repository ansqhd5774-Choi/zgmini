import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {protectEnglishNewsTextR20,restoreProtectedTranslationR20,
 compareNumericFactsR20,semanticWarningsR20}
 from '../scripts/iran-progress/news-display-translation-anchors-r20.mjs';
import {evaluateGuardedTranslationR20,reviewGuardedNewsR20,translateGuardedNewsR20,
 formatGuardedReviewR20} from '../scripts/iran-progress/news-display-translation-guarded-r20.mjs';
import {toDisplayNewsItem,RIGHTS_SOURCE,RIGHTS_POLICY_URL,IRAN_NEWS_CACHE_VERSION}
 from '../scripts/iran-progress/news-display-r1.mjs';
import {DISPLAY_CACHE_BASENAME} from '../scripts/iran-progress/news-display-io-r1.mjs';

test('R20 protects dates, Houthi and Saudi Arabia with reversible source anchors',()=>{
 const en='Operational update 20 October – UK military support to the Kingdom of Saudi Arabia given Houthi attacks.';
 const protectedText=protectEnglishNewsTextR20(en);
 assert.ok(protectedText.anchors.length>=4);
 assert.doesNotMatch(protectedText.prepared,/20 October|Houthi|Saudi Arabia/);
 const sample=protectedText.anchors.map(x=>x.id).join(' ');
 const restored=restoreProtectedTranslationR20('소식 '+sample,protectedText);
 assert.equal(restored.missing.length,0);
 assert.match(restored.text,/10월 20일/);
 assert.match(restored.text,/후티/);
 assert.match(restored.text,/사우디아라비아 왕국/);
 const omitted=restoreProtectedTranslationR20('소식',protectedText);
 assert.equal(omitted.missing.length,protectedText.anchors.length);
});

test('R20 compares equivalent dates, year additions, acronyms, and ordinals',()=>{
 assert.equal(compareNumericFactsR20('Istanbul on 23 October 2026','이스탄불, 2026년 10월 23일').matched,true);
 assert.equal(compareNumericFactsR20('Operational update 20 October','2020년 10월 작전 보고').matched,false);
 assert.equal(compareNumericFactsR20('UN First Committee and COVID','유엔 제1위원회와 코로나19').matched,true);
 assert.equal(compareNumericFactsR20('Meeting R4 on 23 October 2026','2026년 10월 23일 R4 회의').matched,true);
});

test('R20 semantic rules catch unsupported facts and missing negative meaning',()=>{
 assert.deepEqual(semanticWarningsR20('commercial ships unable to navigate','상선들이 항해에 어려움을 겪고 있다'),['MISSING_INABILITY']);
 assert.ok(semanticWarningsR20('Ms Ann Snow was appointed Ambassador','앤 스노 박사가 대사에 임명됐다').includes('UNSUPPORTED_DOCTOR'));
 assert.ok(semanticWarningsR20('a broad assault on the information environment','정보 환경에 대한 사이버 공격').includes('UNSUPPORTED_CYBER'));
 assert.ok(semanticWarningsR20('Iran’s non-compliance with safeguards','이란에 대한 제재').includes('UNSUPPORTED_SANCTION'));
 assert.ok(semanticWarningsR20('the worst El Nino on record','기록상 가장 극심한 현상').includes('MISSING_EL_NINO'));
});

test('R20 never approves an unprotected or altered model draft as translated fact',()=>{
 const sourceTitle='Deterrence is not a threat: UK statement to the OSCE';
 const sourceExcerpt='Iran is challenging the DPRK’s safeguards obligations.';
 const title=protectEnglishNewsTextR20(sourceTitle);
 const excerpt=protectEnglishNewsTextR20(sourceExcerpt);
 const withoutAnchor=evaluateGuardedTranslationR20({sourceTitle,sourceExcerpt,
  titleRaw:'억지 우호는 위협이 아니다',excerptRaw:'북한이 이란의 핵 안전조치 의무를 위반했다.'});
 assert.equal(withoutAnchor.status,'R20_PROTECTED_ANCHOR_MISMATCH');
 assert.ok(withoutAnchor.terminologyWarnings.some(x=>x.includes('ANCHOR')));
 const withAnchor=evaluateGuardedTranslationR20({sourceTitle,sourceExcerpt,
  titleRaw:`${title.anchors.map(a=>a.id).join(' ')} 위협이 아니다: OSCE 성명`,
  excerptRaw:`${excerpt.anchors.map(a=>a.id).join(' ')} 의무와 관련된다.`});
 assert.notEqual(withAnchor.status,'R20_PROTECTED_ANCHOR_MISMATCH');
 assert.match(withAnchor.titleKo,/억지력/);
 assert.equal(withAnchor.qualityAutomaticallyVerified,false);
});

test('R20 makes two local model requests and restores source anchors without another download',async()=>{
 const sourceTitle='Change of His Majesty’s Ambassador to Yemen';
 const sourceExcerpt='Ms Ann Snow MBE has been appointed Ambassador to the Republic of Yemen.';
 let calls=0;
 const response=await translateGuardedNewsR20({sourceTitle,sourceExcerpt,
  fetcher:async(url,opts)=>{
   assert.match(url,/api\/chat$/);
   calls++;
   const request=JSON.parse(opts.body);
   assert.equal(request.model,'translategemma:4b');
   const protectedText=request.messages[0].content.split('\n\n\n').at(-1);
   const allAnchors=protectedText.match(/ZXANCHOR[A-Z]{2}XZ/g)??[];
   assert.ok(allAnchors.length>0);
   const korean=calls===1?`국왕의 ${allAnchors.join(' ')} 대사 변경`:
    `${allAnchors.join(' ')} 주재 대사로 임명되었다.`;
   return new Response(JSON.stringify({message:{content:korean}}));
  }});
 assert.equal(calls,2);
 assert.equal(response.status,'DRAFT_REQUIRES_HUMAN_REVIEW');
 assert.match(response.titleKo,/예멘/);
 assert.match(response.excerptKo,/앤 스노/);
 assert.doesNotMatch(response.excerptKo,/박사/);
 assert.equal(response.qualityAutomaticallyVerified,false);
});

test('R20 reuses identity and OGL rights checks and writes nothing to PC score or news',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'iran-r20-test-'));
 const now=Date.parse('2026-10-27T10:00:00Z');
 const sourceUrl='https://www.gov.uk/government/news/operational-update';
 const sourceTitle='Operational update 20 October – UK military support to the Kingdom of Saudi Arabia';
 const sourceExcerpt='The UK will provide additional defensive military support to the Kingdom of Saudi Arabia, given escalating Houthi attacks in the region.';
 const publishedAt='2026-10-26T11:00:00Z';
 const item=toDisplayNewsItem({source:'GOV.UK',sourceUrl,title:sourceTitle,
  summary:'영국 정부 공식 발표에서 사우디아라비아 관련 내용을 언급했습니다. 상세 내용은 원문에서 확인할 수 있습니다.',
  publishedAt,impact:'neutral',rightsVerified:true,rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL},{now});
 const cache=JSON.stringify({version:IRAN_NEWS_CACHE_VERSION,items:[item]});
 try{
  writeFileSync(path.join(dir,'iran.sqlite'),'score sentinel');
  const cacheFile=path.join(dir,DISPLAY_CACHE_BASENAME);
  writeFileSync(cacheFile,cache);
  const result=await reviewGuardedNewsR20({dataDirectory:dir,now,
   modelCheck:async({allowInstall})=>{assert.equal(allowInstall,false);return {status:'ALREADY_INSTALLED'};},
   fetcher:async url=>{
    if(url==='https://www.gov.uk/api/content/government/news/operational-update')
     return new Response(JSON.stringify({base_path:'/government/news/operational-update',
      title:sourceTitle,first_published_at:publishedAt,document_type:'news_story',
      details:{body:`<p>${sourceExcerpt}</p>`},
      links:{organisations:[{base_path:'/government/organisations/ministry-of-defence'}]}}));
    if(url===sourceUrl)return new Response('<html>All content is available under the Open Government Licence v3.0 except where otherwise stated</html>');
    throw Error('unexpected URL '+url);
   },
   translate:async({sourceTitle:original,sourceExcerpt:sentence})=>{
    assert.equal(original,sourceTitle);
    assert.equal(sentence,sourceExcerpt);
    return {status:'DRAFT_REQUIRES_HUMAN_REVIEW',titleKo:'10월 20일 작전 상황 – 영국의 사우디아라비아 군사 지원',
     excerptKo:'후티의 공격이 격화됨에 따라 영국은 사우디아라비아에 추가적인 방어 군사 지원을 제공할 예정이다.',
     failedTopic:null,terminologyWarnings:[]};
   }});
  assert.equal(result.comparedCount,1);
  assert.equal(result.publication,'DISABLED');assert.equal(result.pcCacheWritten,false);
  assert.equal(result.d1Written,false);assert.equal(result.modelDownloaded,false);
  assert.equal(result.schedulerModified,false);assert.equal(result.qualityAutomaticallyVerified,false);
  assert.equal(readFileSync(path.join(dir,'iran.sqlite'),'utf8'),'score sentinel');
  assert.equal(readFileSync(cacheFile,'utf8'),cache);
  assert.match(formatGuardedReviewR20(result),/FINAL_STATUS=R20_DRAFTS_FOR_SEMANTIC_REVIEW_NO_PUBLICATION/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
