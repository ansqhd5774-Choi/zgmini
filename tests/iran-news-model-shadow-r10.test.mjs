import test from 'node:test';
import assert from 'node:assert/strict';
import {runNewsModelShadowR10,plainNewsBody,validateLocalModelDraft} from '../scripts/iran-progress/news-display-model-shadow-r10.mjs';
import {IRAN_GOVUK_NEWS_FEEDS} from '../scripts/iran-progress/news-display-discover-r1.mjs';

const now=Date.parse('2026-10-27T06:00:00Z');
const feed=(name)=>`<feed><entry><title>${name} regional news</title><updated>2026-10-26T20:00:00Z</updated><link href="https://www.gov.uk/government/news/${name}"/></entry></feed>`;
const response=(obj)=>new Response(JSON.stringify(obj),{status:200});
const body=(name)=>({base_path:'/government/news/'+name,
 title:`${name} regional news`,description:`Official ${name} announcement`,
 first_published_at:'2026-10-26T03:00:00Z',document_type:'press_release',
 details:{body:`<p>${name} was discussed by officials. Further official developments were announced.</p>`}});

test('R10 evaluates the four official feeds; only local Ollama receives POST; no remote publication',async()=>{
 const calls=[];
 const result=await runNewsModelShadowR10({now,fetcher:async (url,options={})=>{
  calls.push({url,method:options.method??'GET'});
  if(IRAN_GOVUK_NEWS_FEEDS.includes(url))return new Response(feed(['Iran','Saudi','Yemen','Houthi'][IRAN_GOVUK_NEWS_FEEDS.indexOf(url)]));
  if(url==='http://127.0.0.1:11434/api/tags')return response({models:[{name:'gemma3:4b'},{name:'qwen3:4b'}]});
  if(url==='http://127.0.0.1:11434/api/chat'){
   const req=JSON.parse(options.body);
   assert.ok(['gemma3:4b','qwen3:4b'].includes(req.model));
   assert.equal(req.stream,false);
   assert.deepEqual(req.format.required,['summary','impact']);
   assert.equal(req.messages.length,1);
   return response({message:{content:JSON.stringify({summary:'정부가 역내 상황에 관한 공식 발표를 내놓았으며 관련 내용을 확인했다고 밝혔습니다.',impact:'neutral'})},
    eval_count:40,prompt_eval_count:200});
  }
  assert.ok(url.startsWith('https://www.gov.uk/api/content'));
  return response(body(url.split('/').at(-1)));
 }});
 assert.equal(result.status,'R10_SHADOW_ONLY_NO_PUBLICATION');
 assert.equal(result.unique30DayCandidates,4);
 assert.equal(result.unique14DayCandidates,4);
 assert.equal(result.modelCallCount,4);
 assert.equal(result.validModelCalls,4);
 assert.equal(result.samples.length,2);
 assert.equal(result.publication,'DISABLED_READ_ONLY');
 assert.equal(result.d1Written,false);
 assert.equal(result.cacheModified,false);
 assert.equal(result.scoreLedgerModified,false);
 assert.equal(calls.filter(x=>x.method==='POST').length,4);
 assert.equal(calls.some(x=>x.method==='POST'&&!x.url.startsWith('http://127.0.0.1:11434/')),false);
});

test('R10 never invents a draft if no local model is installed',async()=>{
 const result=await runNewsModelShadowR10({now,fetcher:async url=>{
  if(IRAN_GOVUK_NEWS_FEEDS.includes(url))return new Response(feed('Iran'));
  if(url==='http://127.0.0.1:11434/api/tags')return response({models:[]});
  return response(body('Iran'));
 }});
 assert.equal(result.unique30DayCandidates,1); // same URL in all four feeds
 assert.equal(result.testedModels.length,0);
 assert.equal(result.modelCallCount,0);
 assert.equal(result.publication,'DISABLED_READ_ONLY');
});

test('R10 accepts only constrained Korean structured output and safely extracts text',()=>{
 assert.equal(plainNewsBody('<script>ignore</script><p>Iran &amp; Yemen &#xD55C;&#44544;</p>'),'Iran & Yemen 한글');
 assert.equal(validateLocalModelDraft('{bad json').status,'INVALID_JSON');
 assert.equal(validateLocalModelDraft(JSON.stringify({summary:'English-only text that lacks Korean',impact:'neutral'})).status,'INVALID_DRAFT');
 assert.equal(validateLocalModelDraft(JSON.stringify({summary:'정부 발표가 확인됐으며 기존 통계는 발표되지 않았습니다.',impact:'extreme'})).status,'INVALID_DRAFT');
 assert.equal(validateLocalModelDraft(JSON.stringify({summary:'정부 발표가 확인됐으며 기존 통계는 발표되지 않았습니다.',impact:'neutral'})).status,'VALID_SHADOW_DRAFT');
});
