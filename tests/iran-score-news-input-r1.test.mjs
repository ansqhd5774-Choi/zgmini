import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {planScoreNewsInput,syncScoreNewsInput} from '../scripts/iran-progress/score-news-input-r1.mjs';
import {calculateOperationalR5} from '../scripts/iran-progress/operate-r5.mjs';
import {classifyR3Article} from '../lib/iran-progress/reference-flow-r3.mjs';
const now=Date.parse('2026-10-28T10:00:00Z');
const make=(title='Iran and Saudi officials held peace talks in Tehran',sourceId='tasnim',sourceUrl='https://www.tasnimnews.ir/en/news/2026/10/28/123/test',publishedAt='2026-10-28T08:00:00.000Z')=>({id:hash(sourceUrl),sourceId,sourceUrl,originalTitle:title,publisherDeclaredPublishedAt:publishedAt,reviewStatus:'ARTICLE_METADATA_REVIEWED',rightsVerified:false,displayEligible:false});
const cache=items=>({version:'IRAN_NEWS_COLLECTION_R26',updatedAt:now-60000,items});
const status={version:'IRAN_NEWS_PRIVATE_AUTO_R29',status:'PRIVATE_COLLECTION_PARTIAL',sourceCount:7,
 candidatesSaved:1,
 completedAtKst:'2026-10-28 18:59:00',articleCoverage:{sourcesVerifiedThisRun:5}};
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-score-news-')),store=openStore(path.join(dir,'iran.sqlite'));
 t.after(()=>{store.close();fs.rmSync(dir,{recursive:true,force:true});});
 return {dir,store,write(items){fs.writeFileSync(path.join(dir,'news-display-candidates-r26.json'),JSON.stringify(cache(items)));fs.writeFileSync(path.join(dir,'news-display-candidates-auto-r29-status.json'),JSON.stringify(status));}};
}
test('new original headlines enter staging once without bypassing original R5 collection health',t=>{
 const f=fixture(t),a=make();f.write([a]);
 const preview=syncScoreNewsInput(f.store,f.dir,{now});
 assert.equal(preview.planned.length,1);
 assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM sources').get().n,0);
 syncScoreNewsInput(f.store,f.dir,{now,dryRun:false});
 const rows=f.store.db.prepare("SELECT body,stored_at FROM sources WHERE id LIKE 'news-metadata:%'").all();
 assert.equal(rows.length,1);assert.equal(rows[0].stored_at,now);
 assert.equal(JSON.parse(rows[0].body).title,a.originalTitle);
 assert.equal(JSON.parse(rows[0].body).summary,'');
 syncScoreNewsInput(f.store,f.dir,{now:now+1000,dryRun:false});
 assert.equal(f.store.db.prepare("SELECT COUNT(*) AS n FROM sources WHERE id LIKE 'news-metadata:%'").get().n,1);
 assert.equal(f.store.db.prepare("SELECT stored_at FROM sources WHERE id LIKE 'news-metadata:%'").get().stored_at,now);
 assert.throws(()=>calculateOperationalR5(f.store,{now:now+1000}),/R5_SOURCE_COLLECTION_UNREADY/);
});
test('late historical bad news and revised existing URLs are held, not newly charged',t=>{
 const {store}=fixture(t),a=make(),old={title:a.originalTitle,summary:'existing original context',date:'2026-10-28',sourceUrl:a.sourceUrl};
 store.putSource('news-metadata:'+hash(old),old,now-3600000);
 const plan=planScoreNewsInput(store,cache([{...a,originalTitle:'Iran and Saudi officials resumed peace talks in Tehran'},
  make('Houthi missile strike on Yemen camp kills 50 recruits','bbc-middle-east','https://www.bbc.co.uk/news/articles/test','2026-10-22T08:00:00.000Z')]),status,{now});
 assert.equal(plan.planned.length,0);
 assert.deepEqual(plan.held.map(r=>r.reason),['EXISTING_URL_REVISION_REQUIRES_REVIEW','OLDER_PUBLICATION_REQUIRES_REVIEW']);
 assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM sources').get().n,1);
});
test('invalid metadata is rejected; unverifiable collection health cannot replace the old freshness gate',t=>{
 const {store}=fixture(t),a=make();
 for(const x of [{...a,sourceId:'govuk'},{...a,sourceUrl:a.sourceUrl+'.evil',id:a.id}])
  assert.throws(()=>planScoreNewsInput(store,cache([x]),status,{now}),/CANDIDATE_INVALID/);
 assert.throws(()=>planScoreNewsInput(store,cache([a,a]),status,{now}),/CANDIDATE_INVALID/);
 assert.throws(()=>planScoreNewsInput(store,{...cache([a]),updatedAt:now-86400001},status,{now}),/INPUT_UNREADY/);
 const mismatched=planScoreNewsInput(store,cache([a]),{...status,completedAtKst:'2026-10-27 18:59:00'},{now});
 assert.equal(mismatched.freshnessEligible,false);assert.equal(mismatched.sourcesVerifiedThisRun,null);
 assert.equal(planScoreNewsInput(store,cache([a]),{...status,articleCoverage:{sourcesVerifiedThisRun:0}},{now}).freshnessEligible,false);
 assert.equal(planScoreNewsInput(store,cache([a]),null,{now}).freshnessEligible,false);
});
test('legacy R29 cache can supply inputs without pretending discovery health was verified',t=>{
 const f=fixture(t);f.write([make()]);
 fs.writeFileSync(path.join(f.dir,'news-display-candidates-auto-r29-status.json'),JSON.stringify({...status,articleCoverage:undefined}));
 const plan=syncScoreNewsInput(f.store,f.dir,{now,dryRun:false});
 assert.equal(plan.planned.length,1);assert.equal(plan.freshnessEligible,false);
 assert.throws(()=>calculateOperationalR5(f.store,{now}),/R5_SOURCE_COLLECTION_UNREADY/);
});
test('intake transaction rolls back receipts when provenance storage fails',t=>{
 const f=fixture(t);f.write([make()]);
 const put=f.store.putSource;f.store.putSource=(id,...args)=>{if(id.startsWith('score-news-provenance:'))throw Error('TEST_DISK_FAILURE');return put(id,...args);};
 assert.throws(()=>syncScoreNewsInput(f.store,f.dir,{now,dryRun:false}),/TEST_DISK_FAILURE/);
 assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM sources').get().n,0);
 assert.equal(f.store.getCheckpoint('score-news-input-last-run-r1'),null);
});
test('approved original R3 hosts use the same positive/negative rules and reject speculation',t=>{
 const {store}=fixture(t);
 const rows=[make('Iran and Saudi officials held peace talks in Tehran','tasnim','https://www.tasnimnews.ir/en/news/2026/10/28/456/test1'),
  make('Iran fired missiles at Saudi base','govuk','https://www.gov.uk/government/news/iran-fires-missiles'),
  make('Iran could hold peace talks with Saudi Arabia','bbc-middle-east','https://www.bbc.co.uk/news/articles/test')];
 const plan=planScoreNewsInput(store,cache(rows),status,{now});
 assert.equal(plan.planned.length,2);assert.equal(plan.counts.unmatched,1);
 assert.deepEqual(plan.planned.map(r=>classifyR3Article(r.article).delta),[8,-12]);
});
