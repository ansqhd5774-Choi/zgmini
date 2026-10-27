import test from 'node:test';
import assert from 'node:assert/strict';
import {displayTopicNames,safeNewsFallbackSummary,assessGovUkNewsRights,previewSafeIranNewsR12} from '../scripts/iran-progress/news-display-safe-preview-r12.mjs';
import {IRAN_GOVUK_NEWS_FEEDS} from '../scripts/iran-progress/news-display-discover-r1.mjs';

const now=Date.parse('2026-10-27T06:00:00Z');
const govBody='<p>The UK Prime Minister reaffirmed support for Saudi Arabia in response to Houthi attacks.</p>';
const content={base_path:'/government/news/pm-call',title:'Prime Minister call with overseas leaders',
 description:'International affairs discussion',document_type:'press_release',
 first_published_at:'2026-10-26T03:00:00Z',details:{body:govBody},
 links:{organisations:[{base_path:'/government/organisations/prime-ministers-office-10-downing-street'}]}};
const page='<html><main><p>Government news</p></main><footer>All content is available under the Open Government Licence v3.0 except where otherwise stated</footer></html>';

test('R12 includes each approved OR term and uses grounded neutral wording',()=>{
 assert.deepEqual(displayTopicNames('Iran / Saudi Arabia / Yemen / Houthi'),['이란','사우디아라비아','예멘','후티']);
 assert.deepEqual(displayTopicNames('Saudi Arabia and Houthi militia'),['사우디아라비아','후티']);
 assert.equal(safeNewsFallbackSummary(['사우디아라비아','후티']),
  '영국 정부 공식 발표에서 사우디아라비아·후티 관련 내용을 언급했습니다. 상세 내용은 원문에서 확인할 수 있습니다.');
 assert.throws(()=>safeNewsFallbackSummary(['검증되지 않은 국가']),/NEWS_SAFE_SUMMARY_TOPICS_INVALID/);
});

test('R12 requires the publisher, licence footer and no third-party body notice',()=>{
 assert.equal(assessGovUkNewsRights(content,page).status,'RIGHTS_CROWN_TEXT_ONLY');
 assert.equal(assessGovUkNewsRights({...content,links:{}},page).status,'RIGHTS_GOVERNMENT_PUBLISHER_UNVERIFIED');
 assert.equal(assessGovUkNewsRights(content,'no licence notice').status,'RIGHTS_OGL_NOTICE_NOT_FOUND');
 assert.equal(assessGovUkNewsRights({...content,details:{body:govBody+' Photo credit © agency'}},page).status,'RIGHTS_THIRD_PARTY_NOTICE_IN_BODY');
});

test('R12 previews eligible official topic news without cache/D1/task writes',async()=>{
 const touched=[];
 const result=await previewSafeIranNewsR12({now,fetcher:async(url,options={})=>{
  touched.push({url,method:options.method??'GET'});
  if(IRAN_GOVUK_NEWS_FEEDS.includes(url))return new Response('<feed><entry><title>Global developments</title><updated>2026-10-27T01:00:00Z</updated><link href="https://www.gov.uk/government/news/pm-call"/></entry></feed>');
  if(url==='https://www.gov.uk/api/content/government/news/pm-call')return new Response(JSON.stringify(content));
  if(url==='https://www.gov.uk/government/news/pm-call')return new Response(page);
  throw Error('Unexpected URL: '+url);
 }});
 assert.equal(result.status,'R12_DISPLAY_PREVIEW_ONLY_NO_WRITES');
 assert.equal(result.discovered14d,1);
 assert.equal(result.eligible,1);
 assert.equal(result.results[0].status,'ELIGIBLE_SAFE_TEXT_ONLY');
 assert.deepEqual(result.results[0].topics,['사우디아라비아','후티']);
 assert.equal(result.results[0].impact,'neutral');
 assert.equal(result.publication,'NOT_STARTED');
 assert.equal(result.d1Written,false);
 assert.equal(result.cacheModified,false);
 assert.equal(touched.some(x=>x.method!=='GET'),false);
});
