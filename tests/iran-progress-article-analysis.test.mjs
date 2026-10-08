import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {officialArticlePolicy,parseOfficialArticle,discoverOfficialArticles} from '../scripts/iran-progress/article-text-r14.mjs';
import {processOfficialArticles,articleAnalysisInstallReady,articleParts,interpretStoredArticle} from '../scripts/iran-progress/article-analysis-r14.mjs';
import {interpretSource,ARTICLE_PROMPT_VERSION,articleEvidenceBlocks} from '../scripts/iran-progress/ai.mjs';
import {evaluateArticleModel,EVALUATION_CASES} from '../scripts/iran-progress/evaluate-article-ai-r14.mjs';
const url='https://www.mofa.go.jp/press/release/pressite_test_123.html';
const text='Iran and the United States held indirect talks. The statement did not announce a ceasefire or a final peace agreement. The foreign ministers discussed safe navigation.';
const html=(body=text)=>`<h2>Iran call</h2><div id="maincontents"><div class="rightalign">October 1, 2026</div><div class="read-text"><p>${body}</p></div><div class="main-section"><p>The report remains a statement requiring independent verification.</p></div><div class="relatedlink-section">FOOTER IRAN ATTACK</div></div>`;
const now=Date.parse('2026-10-09T00:00:00Z');
function modelReply(candidates){return {ok:true,json:async()=>({done:true,done_reason:'stop',response:JSON.stringify({candidates})})};}
test('balanced full article parser keeps intro and final paragraph and excludes scripts/footer',()=>{
 const r=parseOfficialArticle(html().replace('<p>','<script>ATTACK INSTRUCTION</script><p>'),url);
 assert.ok(r.text.startsWith(text));assert.ok(r.text.endsWith('independent verification.'));
 assert.ok(!r.text.includes('FOOTER'));assert.ok(!r.text.includes('INSTRUCTION'));assert.equal(r.sourceLevel,'FULL_ARTICLE_TEXT');assert.equal(r.publishedDate,'2026-10-01');assert.equal(r.textHash,hash(r.text));
});
test('unapproved URLs, shifted layout and text truncation cannot pass as full article',()=>{
 for(const u of ['http://www.mofa.go.jp/press/release/pressite_test_123.html',url+'?token=secret','https://127.0.0.1/internal','https://www.mofa.go.jp.evil.test/press/release/pressite_test_123.html',url+'#part'])assert.throws(()=>officialArticlePolicy(u));
 assert.throws(()=>parseOfficialArticle('<body>Iran</body>',url),/CONTAINER_MISSING/);
 assert.throws(()=>parseOfficialArticle(html('Iran '+ 'x'.repeat(61000)),url),/LENGTH_INVALID/);
 assert.throws(()=>parseOfficialArticle(html('All rights reserved. '+text),url),/RIGHTS_EXCEPTION/);
});
test('GOV.UK parser reads speech body and original publication date, not navigation',()=>{
 const r=parseOfficialArticle(`<h1>Iran statement</h1><time datetime="2026-10-01T00:00:00Z">Date</time><div class="govspeak"><p>${text}</p><div><p>Final qualification.</p></div></div><footer>Other events</footer>`,'https://www.gov.uk/government/speeches/iran-statement');
 assert.ok(r.text.endsWith('Final qualification.'));assert.ok(!r.text.includes('Other events'));assert.equal(r.license,'OGLv3.0');
});
test('GOV.UK first-published metadata is used when a news page has no time element; updates never replace it',()=>{
 const r=parseOfficialArticle(`<meta name="govuk:first-published-at" content="2026-10-02T15:28:00+01:00"><meta name="govuk:updated-at" content="2026-10-05T20:02:11+01:00"><h1>Iran statement</h1><div class="govspeak"><p>${text}</p></div>`,'https://www.gov.uk/government/news/iran-statement');
 assert.equal(r.publishedDate,'2026-10-02');
});
test('discovery permits official article paths only and retains related title uncertainty',()=>{
 assert.deepEqual(discoverOfficialArticles('<div id="pressrelease"><a href="/press/release/pressite_test_123.html">Iran talks</a><a href="https://evil.test/iran">Iran</a></div>',{site:'mofa'}),[url]);
 assert.deepEqual(discoverOfficialArticles('<entry><link rel="alternate" type="text/html" href="https://www.gov.uk/government/news/iran-update"/></entry>',{site:'govuk'}),['https://www.gov.uk/government/news/iran-update']);
});
test('full article prompt retains negation, forbids inferred actors/date and records prompt identity',async()=>{
 const quote='Iran has not agreed to a ceasefire.';
 const r=await interpretSource(quote,{mode:'FULL_ARTICLE_TEXT',model:'qwen3:4b',modelDigest:'digest',fetcher:async(u,o)=>{
  const b=JSON.parse(o.body);assert.equal(b.think,false);assert.ok(b.system.includes('Source publication date is not incident date'));assert.equal(b.format.required[0],'candidates');
  return modelReply([{evidenceId:0,type:'CEASEFIRE',claimStatus:'DENIED'}]);}});
 assert.equal(r.promptVersion,ARTICLE_PROMPT_VERSION);assert.equal(r.candidates[0].verified,false);
 assert.equal(r.candidates[0].quote,quote);assert.equal(r.candidates[0].eventAt,null);assert.equal(r.candidates[0].claimStatus,'DENIED');
 for(const override of [{actors:['Israel']},{eventAt:'2026-10-01'},{type:'PEACE_CONFIRMED'},{evidenceId:99},{quote:'Iran agreed to a ceasefire.'}]){
  await assert.rejects(interpretSource(quote,{mode:'FULL_ARTICLE_TEXT',modelDigest:'digest',fetcher:async()=>modelReply([{evidenceId:0,type:'CEASEFIRE',claimStatus:'DENIED',...override}])}),/UNSUPPORTED/);
 }
});
test('an unrelated Gaza ceasefire model selection is preserved as rejected evidence, not Iran candidate',async()=>{
 const quote='Nearly a year ago in Gaza, a ceasefire was declared. Yet killings continued.';
 const r=await interpretSource(quote,{mode:'FULL_ARTICLE_TEXT',modelDigest:'digest',fetcher:async()=>modelReply([{evidenceId:0,type:'CEASEFIRE',claimStatus:'ASSERTED'}])});
 assert.equal(r.candidates.length,0);assert.equal(r.scopeRejectedCandidates.length,1);
 assert.equal(r.scopeRejectedCandidates[0].quote,quote);assert.equal(r.scopeRejectedCandidates[0].verified,false);
 assert.equal(r.scopeRejectedCandidates[0].reason,'GAZA_CEASEFIRE_WITHOUT_IRAN_RELATION_EVIDENCE');
});
function fixtureFetch(counter){return async u=>{
 counter.push(u);
 if(u.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{name:'qwen3:4b',digest:'digest'}]})};
 if(u.includes('legalmatters'))return new Response('Public Data License (Version 1.0). Cite the source.');
 if(u.includes('public_data_license'))return new Response('Commercial use of content is also permitted.');
 return new Response(html());
};}
const interpreter=async(text,options)=>({status:'CANDIDATE_ONLY',candidates:[{quote:'Iran and the United States held indirect talks.',eventAt:null,actors:['Iran','United States'],type:'DIPLOMACY',status:'PENDING_REVIEW',verified:false}],sourceHash:hash(text),model:options.model,modelDigest:options.modelDigest,promptVersion:ARTICLE_PROMPT_VERSION,interpretedAt:now});
test('real SQLite path stores entire source before inference and never changes facts/score/publishing',async()=>{
 const store=openStore(':memory:'),requests=[];let calls=0;
 try{const args={store,urls:[url],now,delay:async()=>{},fetcher:fixtureFetch(requests),interpreter:async(t,o)=>{
  calls++;assert.equal(store.db.prepare("SELECT count(*) n FROM sources WHERE id LIKE 'official-article:%'").get().n,1);return interpreter(t,o);
 }};
 const r=await processOfficialArticles(args);assert.equal(r.status,'ANALYSIS_COMPLETE');assert.equal(r.reports[0].storageVerified,true);assert.ok(articleAnalysisInstallReady(r));
 const source=JSON.parse(store.db.prepare("SELECT body FROM sources WHERE id LIKE 'official-article:%'").get().body);assert.ok(source.text.endsWith('independent verification.'));
 assert.equal(store.getCheckpoint('verified-input'),null);assert.equal(store.events().length,0);assert.equal(store.db.prepare('SELECT count(*) n FROM publications').get().n,0);
 const replay=await processOfficialArticles({...args,now:now+7*3600000});assert.equal(replay.reports[0].status,'UNCHANGED');assert.equal(calls,1);
 }finally{store.close();}
});
test('429 stops other URLs from same site and retains cooldown; incomplete analysis cannot activate task',async()=>{
 const store=openStore(':memory:'),requests=[],baseFetch=fixtureFetch(requests);
 try{const r=await processOfficialArticles({store,urls:[url,url.replace('123','124')],now,delay:async()=>{},fetcher:async u=>u===url?new Response('',{status:429}):baseFetch(u),interpreter:()=>assert.fail('no AI on fetch failure')});
 assert.equal(r.reports.length,1);assert.equal(r.reports[0].reason,'ARTICLE_HTTP_429');assert.equal(store.getCheckpoint('article-site:mofa').retryAt,now+6*3600000);assert.equal(articleAnalysisInstallReady(r),false);assert.equal(requests.some(u=>u.endsWith('124.html')),false);
 }finally{store.close();}
});
test('evidence references preserve full source text and cannot fabricate unobserved quotes',()=>{
 const source=('Iran and the United States held indirect talks. No ceasefire was announced. ').repeat(100).trim();
 const blocks=articleEvidenceBlocks(source);assert.equal(blocks.map(b=>b.text).join(' '),source);
 assert.ok(blocks.every(b=>b.text.length<=900&&source.includes(b.text)));
});
test('new analysis identity resumes immutable article without re-downloading or renewing publication date',async()=>{
 const store=openStore(':memory:'),requests=[];
 try{const args={store,urls:[url],now,delay:async()=>{},fetcher:fixtureFetch(requests),interpreter:async()=>{throw Error('AI_SCHEMA_INVALID');}};
 await processOfficialArticles(args);const cp=store.getCheckpoint('article-queue-r14');cp.items[0].lastAnalysisIdentity='older-prompt';store.checkpoint('article-queue-r14',cp);requests.length=0;
 const r=await processOfficialArticles({...args,interpreter});assert.equal(r.reports[0].status,'CANDIDATE_ONLY');assert.equal(requests.includes(url),false);
 assert.equal(JSON.parse(store.db.prepare("SELECT body FROM sources WHERE id LIKE 'official-article:%'").get().body).publishedDate,'2026-10-01');
 }finally{store.close();}
});
test('model evaluation is synthetic, immutable and never writes input or events; failure is preserved',async()=>{
 const store=openStore(':memory:');try{
 let calls=0;const args={store,modelDigest:'digest',interpreter:async()=>{calls++;return {candidates:[]};}};
 const r=await evaluateArticleModel(args);assert.equal(r.status,'PENDING');assert.equal(r.synthetic,true);assert.equal(calls,EVALUATION_CASES.length);
 const replay=await evaluateArticleModel(args);assert.equal(replay.reused,true);assert.equal(calls,EVALUATION_CASES.length);
 assert.equal(store.events().length,0);assert.equal(store.getCheckpoint('verified-input'),null);assert.equal(store.db.prepare('SELECT count(*) n FROM publications').get().n,0);
 }finally{store.close();}
});
test('scheduled analysis requires the exact model/prompt evaluation before article fetches',async()=>{
 const store=openStore(':memory:');try{
 let calls=0;const r=await processOfficialArticles({store,requireEvaluation:true,urls:[url],now,fetcher:async u=>{
  calls++;assert.ok(u.endsWith('/api/tags'));return {ok:true,json:async()=>({models:[{name:'qwen3:4b',digest:'unevaluated-model'}]})};
 }});assert.equal(r.reason,'AI_MODEL_EVALUATION_REQUIRED');assert.equal(calls,1);
 }finally{store.close();}
});
test('truncated generation cannot become an accepted full article analysis',async()=>{
 await assert.rejects(interpretSource('Iran has not agreed to a ceasefire.',{mode:'FULL_ARTICLE_TEXT',modelDigest:'digest',fetcher:async()=>({ok:true,json:async()=>({done:true,done_reason:'length',response:'{"candidates":[]}'})})}),/AI_RESPONSE_INCOMPLETE/);
});
test('long articles preserve every source character and resume completed parts after a model failure',async()=>{
 const store=openStore(':memory:');try{
 const text=('Iran and the United States held indirect talks. The attacker remains unknown. ').repeat(250).trim(),parts=articleParts(text);
 assert.ok(parts.length>1);assert.equal(parts.join(' '),text);assert.ok(parts.every(p=>p.length<=12000));
 let calls=0,fail=true;const args={store,sourceId:'test-full',article:{text,textHash:hash(text)},model:'test',modelDigest:'digest',interpreter:async part=>{
  calls++;if(fail&&calls===2)throw Error('AI_RESPONSE_INCOMPLETE');return {sourceHash:hash(part),candidates:[{quote:'Iran and the United States held indirect talks.',eventAt:null,actors:['Iran','United States'],type:'DIPLOMACY',status:'PENDING_REVIEW',verified:false}],interpretedAt:now};
 }};
 await assert.rejects(interpretStoredArticle(args),/INCOMPLETE/);assert.equal(store.db.prepare("SELECT count(*) n FROM decisions WHERE id LIKE 'article-ai-part:%'").get().n,1);
 fail=false;const before=calls,result=await interpretStoredArticle(args);assert.equal(calls-before,parts.length-1);assert.equal(result.partCount,parts.length);assert.equal(result.sourceHash,hash(text));assert.equal(result.candidates.length,1);assert.equal(result.sourceLevel,'FULL_ARTICLE_TEXT');assert.equal(store.events().length,0);
 }finally{store.close();}
});
