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
 assert.deepEqual(generated.supportingQuotes,[quote]);
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
