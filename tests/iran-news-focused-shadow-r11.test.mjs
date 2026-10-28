import test from 'node:test';
import assert from 'node:assert/strict';
import {topicFocusedBody,validateLocalModelDraft} from '../scripts/iran-progress/news-display-model-shadow-r10.mjs';
import {runFocusedShadowR11} from '../scripts/iran-progress/news-display-focused-shadow-r11.mjs';
import {IRAN_GOVUK_NEWS_FEEDS} from '../scripts/iran-progress/news-display-discover-r1.mjs';

const now=Date.parse('2026-10-27T06:00:00Z');
const snippet='<p>The leaders spoke about Ukraine and Starlink.</p><p>They also discussed energy cooperation.</p><p>The UK reaffirmed its support for Saudi Arabia in response to hostile Houthi attacks while ceasefire talks continued.</p>';
const official=(slug)=>({base_path:`/government/news/${slug}`,title:slug,description:'Government statement',
 first_published_at:'2026-10-26T03:00:00Z',document_type:'press_release',details:{body:snippet}});

test('R11 topic paragraphs exclude the unrelated Ukraine and energy sections',()=>{
 assert.equal(topicFocusedBody(snippet),'The UK reaffirmed its support for Saudi Arabia in response to hostile Houthi attacks while ceasefire talks continued.');
 assert.equal(topicFocusedBody('Before Iran was mentioned. Other background after it.').includes('Iran'),true);
});

test('R11 rejects unrelated and mixed-language model summaries',()=>{
 assert.equal(validateLocalModelDraft(JSON.stringify({summary:'영국은 우크라이나의 스타링크 접근을 보장하는 방안을 논의했습니다.',impact:'positive'}),{requireTopic:true}).status,'INVALID_TOPIC_OMITTED');
 assert.equal(validateLocalModelDraft(JSON.stringify({summary:'사우디 정부는 요emen 공격에 대한 대응을 강조했습니다.',impact:'neutral'}),{requireTopic:true}).status,'INVALID_MIXED_TRANSLATION');
 assert.equal(validateLocalModelDraft(JSON.stringify({summary:'영국 총리는 사우디아라비아에 대한 후티 공격과 관련해 지지 입장을 재확인했습니다.',impact:'neutral'}),{requireTopic:true}).status,'VALID_SHADOW_DRAFT');
});

test('R11 sends only matching topical source text to both local models and does not publish',async()=>{
 const requestTexts=[],calls=[];
 const result=await runFocusedShadowR11({now,fetcher:async (url,opts={})=>{
  calls.push({url,method:opts.method??'GET'});
  if(IRAN_GOVUK_NEWS_FEEDS.includes(url))return new Response('<feed><entry><title>Global leaders call</title><updated>2026-10-27T03:00:00Z</updated><link href="https://www.gov.uk/government/news/pm-call"/></entry></feed>');
  if(url==='http://127.0.0.1:11434/api/tags')return new Response(JSON.stringify({models:[{name:'gemma3:4b'},{name:'qwen3:4b'}]}));
  if(url==='http://127.0.0.1:11434/api/chat'){
   const req=JSON.parse(opts.body),prompt=req.messages[0].content;
   requestTexts.push(prompt);
   assert.ok(prompt.includes('[해당 문단]'));
   assert.ok(prompt.includes('support for Saudi Arabia'));
   assert.equal(prompt.includes('Ukraine and Starlink'),false);
   return new Response(JSON.stringify({message:{content:JSON.stringify({summary:'영국 총리는 사우디아라비아에 대한 후티 공격과 관련해 영국의 지지를 재확인했습니다.',impact:'neutral'})}}));
  }
  return new Response(JSON.stringify(official('pm-call')));
 }});
 assert.equal(result.status,'R11_TOPIC_FOCUSED_SHADOW_ONLY');
 assert.equal(result.unique30DayCandidates,1);
 assert.equal(result.modelCallCount,2);
 assert.equal(result.validModelCalls,2);
 assert.equal(result.samples[0].focusCharacters>0,true);
 assert.equal(requestTexts.length,2);
 assert.equal(result.publication,'DISABLED_READ_ONLY');
 assert.equal(calls.some(x=>x.method==='POST'&&!x.url.startsWith('http://127.0.0.1:11434/')),false);
});
