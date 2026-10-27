import test from 'node:test';
import assert from 'node:assert/strict';
import {correctSourceBoundTermsR21,evaluateDirectTranslationR21,
 translateDirectNewsR21} from '../scripts/iran-progress/news-display-translation-direct-r21.mjs';

const exampleTitle='PM call with President Trump of the United States: 23 October 2026';
const exampleExcerpt='The leaders also discussed the situation in the Middle East, with the Prime Minister reaffirming the UK’s support for the Kingdom of Saudi Arabia in the face of hostile Houthi attacks.';

test('R21 corrects source-present Houthis but not a source-absent term',()=>{
 assert.deepEqual(correctSourceBoundTermsR21('Houthi attacks','호세족 공격'),{
  text:'후티 공격',changes:['HOUTHI_NAME']});
 assert.deepEqual(correctSourceBoundTermsR21('Unrelated title','호세족 공격'),{
  text:'호세족 공격',changes:[]});
});

test('R21 does not corrupt 20 October into year 2020',()=>{
 assert.deepEqual(correctSourceBoundTermsR21('Operational update 20 October','2020년 10월 작전 상황'),{
  text:'10월 20일 작전 상황',changes:['OCTOBER_20_DATE']});
});

test('R21 corrects factual Korean names but leaves unlisted roles alone',()=>{
 const miliband=correctSourceBoundTermsR21('Foreign Secretary, Ed Miliband','에드 밀번드 연설');
 assert.equal(miliband.text,'에드 밀리밴드 연설');
 const turkey=correctSourceBoundTermsR21('Republic of Türkiye','터키 공화국');
 assert.equal(turkey.text,'튀르키예 공화국');
 const deterrence=correctSourceBoundTermsR21('Deterrence is not a threat','억지 우호는 위협이 아닙니다');
 assert.equal(deterrence.text,'억지력는 위협이 아닙니다');
});

test('R21 preserves correct PM title and corrects Houthis in excerpt',()=>{
 const result=evaluateDirectTranslationR21({sourceTitle:exampleTitle,sourceExcerpt:exampleExcerpt,
  titleRaw:'미국 대통령 트럼프와의 전화 통화: 2026년 10월 23일',
  excerptRaw:'정상들은 중동 정세를 논의하고 총리는 호세족 공격에 직면한 사우디아라비아 왕국에 대한 영국의 지지를 재확인했다.'});
 assert.equal(result.status,'R21_DRAFT_HUMAN_REVIEW');
 assert.match(result.excerptKo,/후티 공격/);
 assert.ok(result.terminologyWarnings.includes('CORRECTED_EXCERPT_HOUTHI_NAME'));
 assert.equal(result.qualityAutomaticallyVerified,false);
});

test('R21 flags the R19 added cyber sanctions and program termination',()=>{
 const result=evaluateDirectTranslationR21({
  sourceTitle:'We are witnessing an industrial-scale assault by hostile actors like Russia on the information environment in the UK: UK Statement at the UN First Committee',
  sourceExcerpt:'Raising the cost to Russia of its illegal and senseless war against Ukraine, challenging Iran’s non-compliance with its nuclear safeguards obligations, and the DPRK’s unlawful nuclear and ballistic missile programmes.',
  titleRaw:'우리는 러시아의 영국 정보 환경에 대한 대규모 사이버 공격을 목격하고 있습니다. (영국, UN 제1위원회 발언)',
  excerptRaw:'우크라이나에 대한 러시아의 전쟁 비용을 증가시키고 이란의 핵 안전조치 의무 불이행을 제재하고 북한의 불법 핵 및 탄도미사일 프로그램을 중단시키는 것.'});
 assert.equal(result.status,'R21_SEMANTIC_OR_FORMAT_HOLD');
 assert.ok(result.warnings.includes('TITLE_UNSUPPORTED_CYBER'));
 assert.ok(result.warnings.includes('EXCERPT_UNSUPPORTED_SANCTION'));
 assert.ok(result.warnings.includes('EXCERPT_UNSUPPORTED_TERMINATION'));
});

test('R21 catches missing El Nino and false COVID aggression',()=>{
 const result=evaluateDirectTranslationR21({
  sourceTitle:'Ed Miliband speech on climate',
  sourceExcerpt:'We see rising food and fuel prices as a result of the Iran War, which comes on top of Russia’s invasion of Ukraine, which came on top of COVID, and we see climate damage hitting developing countries as we brace ourselves for the worst El Nino on record.',
  titleRaw:'에드 밀리밴드의 기후 관련 연설',
  excerptRaw:'러시아의 우크라이나 침공과 코로나19의 침공 이후 이란 전쟁으로 식량과 연료 가격이 상승하여 개발도상국이 기후 피해를 입고 있다.'});
 assert.equal(result.status,'R21_SEMANTIC_OR_FORMAT_HOLD');
 assert.ok(result.warnings.includes('EXCERPT_MISSING_EL_NINO'));
 assert.ok(result.warnings.includes('EXCERPT_COVID_INCORRECT_AGGRESSION'));
});

test('R21 catches unsupported doctor role, no forced correction',()=>{
 const result=evaluateDirectTranslationR21({
  sourceTitle:'Change of His Majesty’s Ambassador to Yemen',
  sourceExcerpt:'Ms Ann Snow MBE has been appointed His Majesty’s Ambassador to the Republic of Yemen in succession to Ms Abda Sharif OBE, who will be transferring to another Diplomatic Service appointment.',
  titleRaw:'영국의 예멘 주재 대사 변경',
  excerptRaw:'앤 스노 박사(MBE)가 압다 샤리프 박사(OBE)의 후임으로 예멘 공화국 대사로 임명됐다. 압다 샤리프 박사는 다른 외교직으로 이동한다.'});
 assert.ok(result.warnings.includes('EXCERPT_UNSUPPORTED_DOCTOR'));
 assert.equal(result.publication,'DISABLED');
});

test('R21 never downloads and produces a read-only comparison object',async()=>{
 const requested=[];
 const responses=['미국 대통령 트럼프와의 전화 통화: 2026년 10월 23일',
  '정상들은 중동 정세를 논의하고 총리는 호세 공격에 직면한 사우디아라비아 왕국에 대한 영국의 지지를 재확인했다.'];
 const fetcher=async(url,options)=>{
  requested.push({url,body:JSON.parse(options.body)});
  return {ok:true,json:async()=>({message:{content:responses.shift()}})};
 };
 const result=await translateDirectNewsR21({sourceTitle:exampleTitle,
  sourceExcerpt:exampleExcerpt,fetcher});
 assert.equal(result.status,'R21_DRAFT_HUMAN_REVIEW');
 assert.equal(result.publication,'DISABLED');
 assert.equal(requested.length,2);
 assert.ok(requested.every(x=>x.url.endsWith('/api/chat')&&x.body.model==='translategemma:4b'));
 assert.ok(requested.every(x=>!x.body.messages[0].content.includes('ZXANCHOR')));
});
