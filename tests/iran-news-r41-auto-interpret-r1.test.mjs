import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateR41MetadataFeed,validateR41ArticleEvidence,
 validateR41ModelAnalysis,generateR41ModelAnalysis,runR41AnalysisCycle,
 R41_ANALYSIS_VERSION,R41_ANALYSIS_CACHE_VERSION} from '../scripts/iran-progress/news-r41-auto-interpret-r1.mjs';

const now=Date.parse('2026-10-29T09:30:00.000Z');
const sourceUrl='https://www.gov.uk/government/news/test-iran-peace-talks';
const id=createHash('sha256').update(sourceUrl).digest('hex');
const item={id,sourceUrl,source:'GOV.UK',title:'Iran and regional delegates discuss diplomatic talks',
 publishedAt:'2026-10-28T15:51:00.000Z'};
const feed={status:'READY',items:[item]};
const articleBody='The foreign ministers of Iran and neighboring countries met on Wednesday to discuss diplomatic options for a future regional dialogue. They did not sign a ceasefire or announce a final agreement. A spokesperson said the meetings would continue next week.';
const quote='They did not sign a ceasefire or announce a final agreement.';
const proposal={
 titleKo:'이란과 주변국 외무장관, 지역 외교 대화 방안 논의',
 keyPointKo:'이란과 주변국 외무장관들이 지역 외교 대화를 논의했지만 합의는 발표하지 않았다.',
 keyFactsKo:[
  '이란과 주변국 외무장관들이 향후 외교 대화 방안을 논의했다.',
  '이번 회의에서는 휴전 협정이나 최종 합의가 체결되지 않았다.',
 ],
 summaryKo:'이란과 주변국 외무장관들은 향후 지역 대화를 위한 외교적 선택지를 논의했다. 이번 회의에서 최종 합의나 휴전 협정이 체결됐다는 발표는 없었다.',
 interpretationKo:'협의가 계속된다는 점은 대화 채널이 유지되고 있음을 보여준다. 다만 합의가 발표되지 않아 긴장 완화를 확정할 수는 없다.',
 impact:'neutral',supportingQuotes:[quote],
};
const evidence={version:'IRAN_NEWS_ARTICLE_EVIDENCE_R1',items:[{
 sourceId:'govuk',sourceUrl,originalTitle:item.title,publishedAt:item.publishedAt,
 articleBody,
}]};

test('R41 feed must match source URL SHA and article metadata',()=>{
 assert.equal(validateR41MetadataFeed(feed,{now})[0].sourceId,'govuk');
 assert.equal(validateR41MetadataFeed({items:[{...item,
  publishedAt:'2026-10-28T15:51:00Z'}]},{now}).length,1);
 assert.equal(validateR41MetadataFeed({items:[{...item,
  publishedAt:'2026-10-28T15:51:00.0Z'}]},{now}).length,1);
 assert.equal(validateR41MetadataFeed({items:[{...item,
  publishedAt:'2026-10-28T15:51:00.12Z'}]},{now}).length,1);
 assert.throws(()=>validateR41MetadataFeed({items:[{...item,
  publishedAt:'2026-02-30T15:51:00Z'}]},{now}),/NEWS_R41_ANALYSIS_ITEM_INVALID/);
 assert.throws(()=>validateR41MetadataFeed({items:[{...item,id:'a'.repeat(64)}]},{now}),
  /NEWS_R41_ANALYSIS_ITEM_INVALID/);
 assert.throws(()=>validateR41MetadataFeed({items:[item,item]},{now}),
  /NEWS_R41_ANALYSIS_ITEM_INVALID/);
 assert.throws(()=>validateR41MetadataFeed({items:[{...item,publishedAt:
  '2026-11-28T15:51:00.000Z'}]},{now}),/NEWS_R41_ANALYSIS_ITEM_INVALID/);
});

test('external full-body evidence must match exact source, title and date',()=>{
 assert.equal(validateR41ArticleEvidence(evidence,validateR41MetadataFeed(feed,{now}))
  .get(sourceUrl),articleBody);
 for(const changes of [{originalTitle:'Other news'},
  {publishedAt:'2026-10-27T15:51:00.000Z'},
  {sourceId:'tasnim'},
  {sourceUrl:'https://www.gov.uk/government/news/other'}]){
  assert.throws(()=>validateR41ArticleEvidence({...evidence,
   items:[{...evidence.items[0],...changes}]},validateR41MetadataFeed(feed,{now})),
   /NEWS_R41_ANALYSIS_EVIDENCE_MISMATCH/);
 }
});

test('metadata-only articles are pending; no title-only AI invention',async()=>{
 let calls=0;
 const result=await runR41AnalysisCycle(feed,{now,modelDigest:'digest-1',
  evidenceCollector:async()=>({items:[]}),generator:async()=>{calls++;return proposal;}});
 assert.equal(calls,0);
 assert.equal(result.publicResult.version,R41_ANALYSIS_VERSION);
 assert.equal(result.publicResult.items.length,0);
 assert.deepEqual(result.publicResult.pending,[{id,reason:'ARTICLE_BODY_EVIDENCE_UNAVAILABLE'}]);
 assert.equal(result.report.r5ScoreChanges,0);
 assert.equal(result.report.publicWriteAttempted,false);
});

test('unlicensed or unsupported source articles stay rights-restricted without supplied evidence',async()=>{
 const bbcUrl='https://www.bbc.com/news/articles/iran-diplomacy-report';
 const bbc={id:createHash('sha256').update(bbcUrl).digest('hex'),
  sourceUrl:bbcUrl,source:'BBC',title:'Regional leaders hold new consultations on Iran',
  publishedAt:item.publishedAt};
 const result=await runR41AnalysisCycle({items:[bbc]},
  {now,modelDigest:'digest-1',evidenceCollector:async()=>{
   throw Error('restricted source must not be scraped');
  },generator:async()=>{throw Error('unverified content must not be interpreted');}});
 assert.deepEqual(result.publicResult.pending,[
  {id:bbc.id,reason:'SOURCE_RIGHTS_RESTRICTED'}]);
 const attempted={version:'IRAN_NEWS_ARTICLE_EVIDENCE_R1',items:[{
  sourceId:'bbc-middle-east',sourceUrl:bbcUrl,originalTitle:bbc.title,
  publishedAt:bbc.publishedAt,articleBody,
 }]};
 const blocked=await runR41AnalysisCycle({items:[bbc]},
  {now,modelDigest:'digest-1',externalEvidence:attempted,
   generator:async()=>{throw Error('unlicensed evidence must not reach Ollama');}});
 assert.deepEqual(blocked.publicResult.pending,[
  {id:bbc.id,reason:'SOURCE_RIGHTS_RESTRICTED'}]);
 const approved={...attempted,items:[{...attempted.items[0],
  analysisPermission:{granted:true,scope:'AI_KOREAN_PROVISIONAL_INTERPRETATION',
   basis:'EXPLICIT_PUBLISHER_PERMISSION',reviewer:'Editorial clearance officer',
   documentUrl:'https://www.bbc.com/pages/terms-of-use',
   reviewedAt:'2026-10-29T08:00:00.000Z'},
 }]};
 const cleared=await runR41AnalysisCycle({items:[bbc]},
  {now,modelDigest:'digest-1',externalEvidence:approved,
   generator:async()=>proposal});
 assert.equal(cleared.publicResult.items.length,1);
 assert.equal(cleared.publicResult.items[0].analysisStatus,'READY');
});

test('verified source text yields a provisional interpretation, no scores or private quotes',async()=>{
 let calls=0;
 const result=await runR41AnalysisCycle(feed,{now,modelDigest:'digest-1',
  externalEvidence:evidence,evidenceCollector:async(rows)=>{
   assert.equal(rows.length,0);return {items:[]};},
  generator:async({originalTitle,articleBody:body})=>{
   calls++;assert.equal(originalTitle,item.title);assert.equal(body,articleBody);
   return proposal;
  }});
 assert.equal(calls,1);
 assert.equal(result.publicResult.publishedAt,now);
 assert.equal(result.publicResult.items.length,1);
 assert.deepEqual(result.publicResult.pending,[]);
 const [published]=result.publicResult.items;
 assert.deepEqual(published.evidenceUrls,[sourceUrl]);
 assert.equal(published.analysisStatus,'READY');
 assert.equal(published.impact,'neutral');
 assert.equal(published.keyPointKo,proposal.keyPointKo);
 assert.deepEqual(published.keyFactsKo,proposal.keyFactsKo);
 assert.equal(published.summaryKo,proposal.summaryKo);
 assert.ok(!('supportingQuotes' in published));
 assert.ok(!('sourceTextSha256' in published));
 assert.equal(result.privateCache.version,R41_ANALYSIS_CACHE_VERSION);
 assert.equal(result.privateCache.entries.length,1);
 assert.ok(!('articleBody' in result.privateCache.entries[0]));
});

test('unchanged article/model is reused without any source or model calls',async()=>{
 const once=await runR41AnalysisCycle(feed,{now,modelDigest:'digest-1',
  externalEvidence:evidence,evidenceCollector:async()=>({items:[]}),
  generator:async()=>proposal});
 const twice=await runR41AnalysisCycle(feed,{now:now+1000,
  modelDigest:'digest-1',cache:once.privateCache,
  evidenceCollector:async()=>{throw Error('reused sources must not be fetched');},
  generator:async()=>{throw Error('reused model must not be called');}});
 assert.equal(twice.publicResult.items.length,1);
 assert.equal(twice.publicResult.items[0].analyzedAt,now);
 assert.equal(twice.report.newReady,0);
});

test('evidence changes, model changes and proof failures cannot reuse a stale analysis',async()=>{
 const once=await runR41AnalysisCycle(feed,{now,modelDigest:'digest-1',
  externalEvidence:evidence,evidenceCollector:async()=>({items:[]}),
  generator:async()=>proposal});
 const changed=await runR41AnalysisCycle(feed,{now:now+1000,cache:once.privateCache,
  modelDigest:'digest-2',externalEvidence:evidence,evidenceCollector:async()=>({items:[]}),
  generator:async()=>({...proposal,supportingQuotes:['nonexistent source quote that is fabricated']})});
 assert.equal(changed.publicResult.items.length,0);
 assert.equal(changed.publicResult.pending[0].reason,'NEWS_R41_ANALYSIS_MODEL_OUTPUT_INVALID');
 assert.throws(()=>validateR41ModelAnalysis({...proposal,summaryKo:
  proposal.summaryKo+' 999명 사망'},
  {originalTitle:item.title,articleBody}),/NEWS_R41_ANALYSIS_NEW_NUMBER/);
 assert.throws(()=>validateR41ModelAnalysis({...proposal,keyFactsKo:[
  proposal.keyFactsKo[0], '회의에서 999명이 사망했다는 발표가 있었다.',
 ]},{originalTitle:item.title,articleBody}),/NEWS_R41_ANALYSIS_NEW_NUMBER/);
 assert.throws(()=>validateR41ModelAnalysis({...proposal,keyFactsKo:[
  proposal.keyFactsKo[0],proposal.keyFactsKo[0],
 ]},{originalTitle:item.title,articleBody}),/NEWS_R41_ANALYSIS_MODEL_OUTPUT_INVALID/);
});

test('arbitrary model error text never leaks into public pending reason',async()=>{
 const result=await runR41AnalysisCycle(feed,{now,modelDigest:'digest-1',
  externalEvidence:evidence,evidenceCollector:async()=>({items:[]}),
  generator:async()=>{throw Error('model says /private/path contains sensitive details');}});
 assert.deepEqual(result.publicResult.pending,[
  {id,reason:'NEWS_R41_ANALYSIS_GENERATION_FAILED'}]);
 assert.match(result.publicResult.pending[0].reason,/^[A-Z][A-Z0-9_]{1,79}$/);
});

test('Ollama request is fixed to local endpoint and rejects unsupported output',async()=>{
 let calls=0;
 const generated=await generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async(url,options)=>{
   calls++;
   assert.equal(url,'http://127.0.0.1:11434/api/generate');
   const payload=JSON.parse(options.body);
   assert.equal(payload.stream,false);
   assert.equal(payload.options.temperature,0);
   assert.equal(payload.format.type,'object');
   return {ok:true,json:async()=>({response:JSON.stringify(proposal)})};
  }});
 assert.equal(calls,1);
 assert.equal(generated.summaryKo,proposal.summaryKo);
 assert.equal(generated.keyPointKo,proposal.keyPointKo);
 assert.deepEqual(generated.supportingQuotes,[quote]);
});

test('Ollama server failures expose only a bounded numeric status',async()=>{
 await assert.rejects(generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async()=>({ok:false,status:503,
   text:async()=>'/private/secret: model not ready'})}),
  /NEWS_R41_ANALYSIS_OLLAMA_HTTP_503/);
});

test('repeat-token HTTP 500 retries with anti-loop settings then JSON fallback',async()=>{
 const payloads=[];
 const generated=await generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async(_,options)=>{
   const payload=JSON.parse(options.body);
   payloads.push(payload);
   if(payloads.length<3)return {ok:false,status:500,
    json:async()=>({error:'prediction aborted, token repeat limit reached'})};
   return {ok:true,json:async()=>({response:JSON.stringify(proposal)})};
  }});
 assert.equal(generated.impact,'neutral');
 assert.equal(payloads.length,3);
 assert.equal(payloads[0].options.temperature,0);
 assert.equal(payloads[1].options.num_predict,650);
 assert.equal(payloads[1].options.repeat_penalty,1.2);
 assert.equal(payloads[2].format,'json');
 assert.ok(payloads.every(payload=>payload.model==='gemma3:4b'));
});

test('HTTP 200 with malformed evidence quote retries with a fixed corrective hint',async()=>{
 const payloads=[];
 const result=await generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async(_,options)=>{
   const payload=JSON.parse(options.body);
   payloads.push(payload);
   return {ok:true,json:async()=>({response:JSON.stringify(payloads.length===1?
    {...proposal,supportingQuotes:['a fabricated quote not in source']}:
    proposal)})};
  }});
 assert.equal(result.impact,'neutral');
 assert.equal(payloads.length,2);
 assert.equal(payloads[0].prompt.includes('CORRECTION REQUIRED'),false);
 assert.match(payloads[1].prompt,/CORRECTION REQUIRED: Select 1-3 DISTINCT integer supportingQuoteIds/);
 assert.equal(payloads[1].format.properties.supportingQuoteIds.type,'array');
 assert.ok(!payloads[1].prompt.includes('a fabricated quote not in source'));
});

test('bounded fallback lets the model select exact source quote IDs instead of paraphrasing',async()=>{
 const requests=[];
 const {supportingQuotes,...draft}=proposal;
 const result=await generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async(_,options)=>{
   const request=JSON.parse(options.body);
   requests.push(request);
   if(requests.length===1)return {ok:false,status:500,
    json:async()=>({error:'prediction aborted, token repeat limit reached'})};
   const input=JSON.parse(request.prompt.split('\n\nCORRECTION REQUIRED:')[0]);
   assert.ok(input.quoteCandidates.length>=2);
   assert.ok(input.quoteCandidates.every((row,index)=>row.id===index+1&&
    articleBody.includes(row.text)));
   return {ok:true,json:async()=>({response:JSON.stringify({
    ...draft,supportingQuoteIds:[2],
   })})};
  }});
 assert.equal(requests.length,2);
 assert.deepEqual(result.supportingQuotes,[quote]);
 assert.equal(result.summaryKo,proposal.summaryKo);
});

test('model cannot select a fabricated or out-of-range quote ID',async()=>{
 const {supportingQuotes,...draft}=proposal;
 let calls=0;
 await assert.rejects(generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async()=>{calls++;return {ok:true,json:async()=>({response:JSON.stringify({
   ...draft,supportingQuoteIds:[999],
  })})};}}),/NEWS_R41_ANALYSIS_MODEL_OUTPUT_INVALID/);
 assert.equal(calls,4);
});

test('model cannot select duplicate quote IDs as separate proof',async()=>{
 const {supportingQuotes,...draft}=proposal;
 let calls=0;
 await assert.rejects(generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async()=>{calls++;return {ok:true,json:async()=>({response:JSON.stringify({
   ...draft,supportingQuoteIds:[1,1],
  })})};}}),/NEWS_R41_ANALYSIS_MODEL_OUTPUT_INVALID/);
 assert.equal(calls,4);
});

test('invalid JSON can recover on a bounded retry but no evidence gate is bypassed',async()=>{
 let calls=0;
 const result=await generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async()=>({ok:true,json:async()=>({response:++calls===1?'{':
   JSON.stringify(proposal)})})});
 assert.equal(result.impact,'neutral');
 assert.equal(calls,2);
});

test('invalid evidence across all structured attempts remains blocked',async()=>{
 let calls=0;
 await assert.rejects(generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async()=>{calls++;return {ok:true,json:async()=>({response:JSON.stringify({
   ...proposal,supportingQuotes:['fabricated proof never present in source'],
  })})};}}),/NEWS_R41_ANALYSIS_MODEL_OUTPUT_INVALID/);
 assert.equal(calls,4);
});

test('unrelated HTTP 500 never triggers retry or leaks the raw response',async()=>{
 let calls=0;
 await assert.rejects(generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async()=>{calls++;return {ok:false,status:500,
   json:async()=>({error:'C:\\private\\model-file missing'})};}}),
  /NEWS_R41_ANALYSIS_OLLAMA_HTTP_500/);
 assert.equal(calls,1);
});

test('fallback output without verbatim source proof remains blocked',async()=>{
 let calls=0;
 await assert.rejects(generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async()=>{
   calls++;
   if(calls<3)return {ok:false,status:500,
    json:async()=>({error:'prediction aborted, token repeat limit reached'})};
   return {ok:true,json:async()=>({response:JSON.stringify({...proposal,
    supportingQuotes:['a quote not found in verified source evidence']})})};
  }}),/NEWS_R41_ANALYSIS_MODEL_OUTPUT_INVALID/);
 assert.equal(calls,4);
});

test('small local model can recover via separate base, facts and exact quote IDs',async()=>{
 const payloads=[];
 const {supportingQuotes,...core}=proposal;
 const {keyPointKo,keyFactsKo,...base}=core;
 const result=await generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async(_,options)=>{
   const payload=JSON.parse(options.body);
   payloads.push(payload);
   if(payloads.length<=3)return {ok:true,
    json:async()=>({response:JSON.stringify({...proposal,
     supportingQuotes:['invented evidence absent in article']})})};
   if(payloads.length===4)return {ok:true,
    json:async()=>({response:JSON.stringify(base)})};
   if(payloads.length===5)return {ok:true,
    json:async()=>({response:JSON.stringify({keyPointKo,keyFactsKo})})};
   const inputs=JSON.parse(payload.prompt);
   assert.ok(inputs.quoteCandidates.some(row=>row.text===quote));
   assert.equal(payload.format.properties.supportingQuoteIds.items.maximum,
    inputs.quoteCandidates.length);
   return {ok:true,json:async()=>({response:JSON.stringify({
    supportingQuoteIds:[inputs.quoteCandidates.find(row=>row.text===quote).id]})})};
  }});
 assert.equal(payloads.length,6);
 assert.deepEqual(result.supportingQuotes,[quote]);
 assert.deepEqual(result.keyFactsKo,proposal.keyFactsKo);
 assert.equal(payloads[3].format.required.length,4);
 assert.equal(payloads[4].format.required.length,2);
 assert.equal(payloads[5].format.required.length,1);
});

test('three-step fallback never publishes source-unsupported numbers',async()=>{
 let calls=0;
 const {supportingQuotes,...core}=proposal;
 const {keyPointKo,keyFactsKo,...base}=core;
 await assert.rejects(generateR41ModelAnalysis({originalTitle:item.title,articleBody},
  {fetcher:async()=>({ok:true,json:async()=>({response:JSON.stringify(
   ++calls<=3?{...proposal,supportingQuotes:['invented source evidence']}:
   calls===4?base:{keyPointKo,keyFactsKo:[keyFactsKo[0],
    '회의에 999명이 참석했다는 공식 발표가 있었다.']})})})}),
  /NEWS_R41_ANALYSIS_NEW_NUMBER/);
 assert.equal(calls,5);
});

test('source evidence backlog is explicit; no false ready status',async()=>{
 const second={...item,sourceUrl:'https://www.gov.uk/government/news/iran-outlook-2',
  title:'Iran situation second detailed report'};
 second.id=createHash('sha256').update(second.sourceUrl).digest('hex');
 const rows=await runR41AnalysisCycle({items:[item,second]},
  {now,modelDigest:'digest-1',maxNew:1,
   evidenceCollector:async()=>({items:[]}),generator:async()=>proposal});
 assert.equal(rows.publicResult.pending.length,2);
 assert.equal(rows.publicResult.pending[1].reason,'ANALYSIS_BACKLOG');
});

test('rights-restricted headlines never consume limited analysis slots',async()=>{
 const restricted=Array.from({length:25},(_,index)=>{
  const sourceUrl=`https://www.bbc.com/news/articles/iran-coverage-${index}`;
  return {id:createHash('sha256').update(sourceUrl).digest('hex'),sourceUrl,
   title:`Iran regional developments detailed update ${index}`,publishedAt:item.publishedAt};
 });
 let collected=0,generated=0;
 const result=await runR41AnalysisCycle({items:[...restricted,item]},
  {now,modelDigest:'digest-1',maxNew:1,
   evidenceCollector:async rows=>{
    collected++;
    assert.deepEqual(rows.map(row=>row.id),[item.id]);
    return {items:[{sourceId:'govuk',sourceUrl,
     originalTitle:item.title,publishedAt:item.publishedAt,articleBody}]};
   },generator:async()=>{generated++;return proposal;}});
 assert.equal(collected,1);
 assert.equal(generated,1);
 assert.deepEqual(result.publicResult.items.map(row=>row.id),[item.id]);
 assert.equal(result.report.rightsRestricted,25);
 assert.equal(result.report.backlog,0);
 assert.equal(result.report.attempted,1);
 assert.ok(result.publicResult.pending.every(row=>row.reason==='SOURCE_RIGHTS_RESTRICTED'));
});

test('repeated failures rotate through all eligible articles without dropping history',async()=>{
 const articles=Array.from({length:4},(_,index)=>{
  const sourceUrl=`https://www.gov.uk/government/news/iran-detailed-${index}`;
  return {id:createHash('sha256').update(sourceUrl).digest('hex'),sourceUrl,
   title:`Iran diplomacy detailed official report ${index}`,publishedAt:item.publishedAt};
 });
 const attempted=[];
 let cache=null;
 for(let round=0;round<4;round++){
  const result=await runR41AnalysisCycle({items:articles},
   {now:now+round*600000,cache,modelDigest:'digest-1',maxNew:1,
    evidenceCollector:async rows=>{
     attempted.push(rows[0].id);
     return {items:[]};
    },generator:async()=>{throw Error('generator must not see absent evidence');}});
  assert.equal(result.report.backlog,3);
  assert.equal(result.publicResult.items.length,0);
  assert.equal(result.publicResult.pending.length,4);
  assert.equal(result.privateCache.attempts.length,round+1);
  assert.equal(result.publicResult.pending.filter(row=>
   row.reason==='ARTICLE_BODY_EVIDENCE_UNAVAILABLE').length,1);
  cache=result.privateCache;
 }
 assert.deepEqual(attempted,articles.map(row=>row.id));
 const fifth=await runR41AnalysisCycle({items:articles},
  {now:now+2400000,cache,modelDigest:'digest-1',maxNew:1,
   evidenceCollector:async rows=>{
    assert.equal(rows[0].id,articles[0].id);return {items:[]};
   }});
 assert.equal(fifth.privateCache.attempts.length,4);
});
