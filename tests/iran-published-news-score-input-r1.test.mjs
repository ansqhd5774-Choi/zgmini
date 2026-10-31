import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {planPublishedNewsInput,applyPublishedNewsInput,syncPublishedNewsInput,PUBLISHED_NEWS_CHECKPOINT} from '../scripts/iran-progress/published-news-score-input-r1.mjs';
import {calculateOperationalR5} from '../scripts/iran-progress/operate-r5.mjs';
import {runEnglishScoreShadow} from '../scripts/iran-progress/news-r41-english-score-evidence-r1.mjs';
const now=Date.parse('2026-10-29T04:00:00Z');
const item=(slug='talks',title='Iran and Saudi officials held peace talks in Tehran')=>{
 const sourceUrl='https://www.gov.uk/government/news/'+slug;
 return {id:hash(sourceUrl),source:'GOV.UK',sourceUrl,title,publishedAt:'2026-10-29T02:00:00.000Z'};
};
const r41=items=>({version:'IRAN_NEWS_METADATA_R41',status:'READY',
 sourceCount:new Set(items.map(a=>a.source)).size,itemCount:items.length,displayDays:14,items});
const r1=items=>({version:'IRAN_NEWS_DISPLAY_R1',status:'READY',publishedAt:now-1000,asOfDate:'2026-10-29',displayDays:14,itemCount:items.length,items:items.map(x=>({...x,summary:'Official report',impact:'negative'}))});
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-published-input-'));const store=openStore(path.join(dir,'iran.sqlite'));t.after(()=>{store.close();fs.rmSync(dir,{recursive:true,force:true});});return store;}
test('page R41 precedence, R1 fallback and original-title scoring ignore display impact',t=>{
 const store=fixture(t),a=item();
 const preferred=planPublishedNewsInput(store,r41([a]),r1([item('other')]),{now});
 assert.equal(preferred.endpoint,'/api/outbreak-news/iran/r41');
 assert.equal(preferred.planned[0].article.title,a.title);
 const fallback=planPublishedNewsInput(store,{...r41([a]),status:'PARTIAL'},r1([a]),{now});
 assert.equal(fallback.endpoint,'/api/outbreak-news/iran');assert.equal(fallback.planned.length,1);
 assert.equal(fallback.freshnessEligible,false);
});
test('expanded R41 feed keeps approved R5 sources and holds new publishers',t=>{
 const store=fixture(t),approved=item('approval','Iran and Saudi officials held peace talks in Tehran');
 const reutersUrl='https://www.reuters.com/world/middle-east/iran-conflict-update/';
 const reuters={id:hash(reutersUrl),source:'Reuters',sourceUrl:reutersUrl,
  title:'Iran fired missiles at Saudi base',publishedAt:approved.publishedAt};
 const feed=r41([approved,reuters]);
 assert.equal(feed.sourceCount,2);
 const plan=planPublishedNewsInput(store,feed,null,{now});
 assert.equal(plan.endpoint,'/api/outbreak-news/iran/r41');
 assert.deepEqual(plan.planned.map(x=>x.article.sourceUrl),[approved.sourceUrl]);
 assert.deepEqual(plan.held.filter(x=>x.reason==='SOURCE_NOT_APPROVED_FOR_R5')
  .map(x=>x.id),[reuters.id]);
 assert.deepEqual(plan.admittedUrls,[approved.sourceUrl]);
 assert.equal(plan.freshnessEligible,false);
});
test('R41 source count discrepancy never silently accepts malformed metadata',t=>{
 const store=fixture(t),feed={...r41([item()]),sourceCount:8};
 assert.throws(()=>planPublishedNewsInput(store,feed,null,{now}),/INVALID/);
});
test('confirmed English Ollama proof reaches existing R5 score without new weights',async t=>{
 const store=fixture(t),a=item('verified-talks');
 const articleBody='Iran and Saudi officials held peace talks in Tehran on Friday. '+
  'The meeting took place at a government office near the city centre. '+
  'The participants also discussed further dialogue but signed no ceasefire agreement.';
 const proof=await runEnglishScoreShadow({items:[a]}, {now,
  externalEvidence:{version:'IRAN_NEWS_ARTICLE_EVIDENCE_R1',items:[{
   sourceId:'govuk',sourceUrl:a.sourceUrl,originalTitle:a.title,
   publishedAt:a.publishedAt,articleBody,
  }]},generator:async()=>({eventRule:'TALKS_HELD',stageStatus:'REPORTED_COMPLETED',
   supportingQuote:'Iran and Saudi officials held peace talks in Tehran on Friday.'})});
 const strict={now,aiScorePolicy:'REQUIRE_VERIFIED_ENGLISH_EVIDENCE'};
 const held=planPublishedNewsInput(store,r41([a]),null,{...strict,
  englishScoreShadow:{...proof,items:[]}});
 assert.equal(held.planned.length,0);
 assert.equal(held.held[0].reason,'ENGLISH_AI_EVIDENCE_REQUIRED');
 const plan=planPublishedNewsInput(store,r41([a]),null,{...strict,englishScoreShadow:proof});
 assert.equal(plan.planned.length,1);
 assert.equal(plan.planned[0].article.title,a.title);
 assert.equal(plan.aiScorePolicy,strict.aiScorePolicy);
 applyPublishedNewsInput(store,plan,{now,dryRun:false});
 store.checkpoint('score-news-input-last-run-r1',{version:'IRAN_SCORE_NEWS_INPUT_R1',
  freshnessEligible:true,collectionCheckedAt:now,checkedAt:now,sourcesVerifiedThisRun:7});
 const scored=calculateOperationalR5(store,{now});
 assert.equal(scored.body.acceptedEventCount,1);
 assert.ok(scored.body.score>13);
});
test('failed or empty published responses never fall back to private candidates or mutate checkpoints',async t=>{
 const store=fixture(t);store.checkpoint(PUBLISHED_NEWS_CHECKPOINT,{version:'IRAN_PUBLISHED_NEWS_SCORE_INPUT_R1',cutoverAt:now,baselineEventKeys:[],admittedUrls:[]});
 const before=store.getCheckpoint(PUBLISHED_NEWS_CHECKPOINT);
 await assert.rejects(syncPublishedNewsInput(store,{now,dryRun:false,fetchImpl:async()=>new Response('{}',{status:503})}),/UNAVAILABLE/);
 assert.throws(()=>planPublishedNewsInput(store,null,r1([]),{now}),/EMPTY/);
 assert.deepEqual(store.getCheckpoint(PUBLISHED_NEWS_CHECKPOINT),before);
});
test('private post-cutover events cannot alter R5; admitted URLs persist when they leave 14-day display',t=>{
 const store=fixture(t),a=item();
 applyPublishedNewsInput(store,planPublishedNewsInput(store,r41([a]),null,{now}),{now,dryRun:false});
 store.checkpoint('score-news-input-last-run-r1',{version:'IRAN_SCORE_NEWS_INPUT_R1',freshnessEligible:true,collectionCheckedAt:now,checkedAt:now,sourcesVerifiedThisRun:7});
 const first=calculateOperationalR5(store,{now});
 const privateArticle={sourceUrl:'https://www.gov.uk/government/news/private-attack',title:'Iran fired missiles at Saudi base',summary:'',date:'2026-10-29'};
 store.putSource('news-metadata:'+hash(privateArticle),privateArticle,now+1);
 const after=calculateOperationalR5(store,{now:now+2});
 assert.equal(after.body.score,first.body.score);assert.equal(after.body.acceptedEventCount,1);
 const plan=planPublishedNewsInput(store,r41([item('unmatched','Iran and Saudi officials issued a statement')]),null,{now:now+3});
 assert.deepEqual(plan.admittedUrls,[a.sourceUrl]);
 applyPublishedNewsInput(store,plan,{now:now+3,dryRun:false});
 assert.equal(calculateOperationalR5(store,{now:now+4}).body.score,first.body.score);
});
test('existing historical baseline survives cutover; old backlog held and transaction rollback is atomic',t=>{
 const store=fixture(t),old={sourceUrl:item('baseline').sourceUrl,title:item().title,summary:'',date:'2026-10-28'};
 store.putSource('news-metadata:'+hash(old),old,now-86400000);
 const late={...item('old-attack','Iran fired missiles at Saudi base'),publishedAt:'2026-10-24T02:00:00.000Z'};
 const plan=planPublishedNewsInput(store,r41([item(),late]),null,{now});
 assert.equal(plan.baselineEventKeys.length,1);assert.equal(plan.held[0].reason,'OLDER_PUBLICATION_REQUIRES_REVIEW');
 const put=store.putSource;store.putSource=(id,...args)=>{if(id.startsWith('score-published-news-provenance:'))throw Error('DISK_FAILURE');return put(id,...args);};
 assert.throws(()=>applyPublishedNewsInput(store,plan,{now,dryRun:false}),/DISK_FAILURE/);
 assert.equal(store.getCheckpoint(PUBLISHED_NEWS_CHECKPOINT),null);
 assert.equal(store.db.prepare('SELECT COUNT(*) n FROM sources').get().n,1);
});
test('a privately saved URL is admitted only when published; repeats do not reset first observation',t=>{
 const store=fixture(t),initial=item();
 applyPublishedNewsInput(store,planPublishedNewsInput(store,r41([initial]),null,{now}),{now,dryRun:false});
 const next=item('later','Iran and Saudi officials rejected a peace proposal');
 const receipt={sourceUrl:next.sourceUrl,title:next.title,summary:'',date:'2026-10-29',claimVerification:'SINGLE_SOURCE_REPORT'};
 store.putSource('news-metadata:'+hash(receipt),receipt,now+1);
 assert.ok(!store.getCheckpoint(PUBLISHED_NEWS_CHECKPOINT).admittedUrls.includes(next.sourceUrl));
 const plan=planPublishedNewsInput(store,r41([next]),null,{now:now+2});
 assert.equal(plan.planned.length,0);assert.ok(plan.admittedUrls.includes(next.sourceUrl));
 applyPublishedNewsInput(store,plan,{now:now+2,dryRun:false});
 assert.equal(store.db.prepare('SELECT stored_at FROM sources WHERE id=?').get('news-metadata:'+hash(receipt)).stored_at,now+1);
});
test('previously missed ongoing peace proposal is scored only once',t=>{
 const store=fixture(t),a=item('peace-plan',
  'Gulf states working on multipart peace deal to avert renewal of US-Iran war');
 const plan=planPublishedNewsInput(store,r41([a]),null,{now});
 assert.equal(plan.planned.length,1);
 assert.equal(plan.articleResults[0].status,'NEW_ACCEPTED');
 applyPublishedNewsInput(store,plan,{now,dryRun:false});
 store.checkpoint('score-news-input-last-run-r1',{version:'IRAN_SCORE_NEWS_INPUT_R1',
  freshnessEligible:true,collectionCheckedAt:now,checkedAt:now,sourcesVerifiedThisRun:7});
 const first=calculateOperationalR5(store,{now});
 assert.equal(first.body.acceptedEventCount,1);
 assert.ok(first.body.score>13&&first.body.score<14);
 assert.equal(first.body.publishedNewsClassifierVersion,'IRAN_PUBLISHED_EVENT_RULES_R1');
 applyPublishedNewsInput(store,planPublishedNewsInput(store,r41([a]),null,{now:now+1}),
  {now:now+1,dryRun:false});
 assert.equal(calculateOperationalR5(store,{now:now+2}).body.score,first.body.score);
});
