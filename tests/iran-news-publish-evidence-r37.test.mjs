import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {R36_ACTIVE_SOURCE_IDS} from '../scripts/iran-progress/news-display-coverage-readonly-r36.mjs';
import {loadR37CandidateCache,prepareR37Review,runR37ArticleEvidence}
 from '../scripts/iran-progress/news-display-publish-evidence-r37.mjs';

const now=Date.parse('2026-10-28T12:00:00.000Z');
const urls={
 tasnim:'https://www.tasnimnews.ir/en/news/2026/10/27/1234/iran-diplomacy',
 govuk:'https://www.gov.uk/government/news/iran-diplomacy',
 'guardian-iran':'https://www.theguardian.com/world/2026/oct/27/iran-diplomacy',
 'dw-world':'https://www.dw.com/en/iran-diplomacy/a-79776122',
 'bbc-middle-east':'https://www.bbc.com/news/articles/c9p8g7e4k2xjo',
 aljazeera:'https://www.aljazeera.com/news/2026/10/27/iran-diplomacy',
 'un-middle-east':'https://news.un.org/en/story/2026/10/1168654',
};
const item=(sourceId,sourceUrl,date='2026-10-27T10:00:00.000Z')=>({
 id:createHash('sha256').update(sourceUrl).digest('hex'),sourceId,sourceUrl,
 originalTitle:`Article by ${sourceId}`,
 publisherDeclaredPublishedAt:date,reviewStatus:'ARTICLE_METADATA_REVIEWED',
 rightsVerified:false,displayEligible:false,
});
const cache=()=>({version:'IRAN_NEWS_COLLECTION_R26',updatedAt:now-1000,
 items:R36_ACTIVE_SOURCE_IDS.map(id=>item(id,urls[id]))});
const approvedAudit=async({feedReport})=>({version:'IRAN_ARTICLE_DETAIL_AUDIT_R25',
 articles:feedReport.candidates.map(c=>({sourceId:c.sourceId,sourceUrl:c.sourceUrl,
  status:'ARTICLE_METADATA_REVIEWED',articleBodyAccessible:true,
  originalTitleVerified:true,bodyCharacterCount:700,
  publicationDateEvidence:'PUBLISHER_JSON_LD',
  publisherDeclaredPublishedAt:c.publisherDeclaredPublishedAt}))});

test('R37 prepares a seven-source publisher-body audit without changing any rights flags',()=>{
 const original=cache(),before=JSON.stringify(original);
 const result=prepareR37Review(original,{now});
 assert.equal(result.privateCount,7);
 assert.equal(result.inDisplayWindow,7);
 assert.equal(result.feedReport.candidates.length,7);
 assert.deepEqual(result.feedReport.sources.map(s=>s.sourceId),R36_ACTIVE_SOURCE_IDS);
 assert.ok(result.feedReport.candidates.every(c=>c.rightsVerified===false));
 assert.equal(JSON.stringify(original),before);
});

test('R37 counts out-of-window metadata separately and never publishes a read-only review',async()=>{
 const input=cache();
 input.items[6].publisherDeclaredPublishedAt='2026-10-05T10:00:00.000Z';
 const report=await runR37ArticleEvidence({cache:input,now,auditor:approvedAudit});
 assert.equal(report.status,'PUBLIC_REVIEW_INPUT_PENDING');
 assert.equal(report.privateCandidateCount,7);
 assert.equal(report.in14DayDisplayWindow,6);
 assert.equal(report.outsideDisplayWindow,1);
 assert.equal(report.articleBodyAndDateVerified,6);
 assert.equal(report.approvedPublicationItems,0);
 assert.equal(report.bySource.find(s=>s.sourceId==='un-middle-east').bodyAndDateVerified,0);
 for(const key of ['pcCacheWritten','d1Written','schedulerModified','scoreLedgerModified',
  'publicCacheModified'])assert.equal(report[key],false);
 assert.ok(report.articles.every(a=>!('body' in a)&&!('articleText' in a)));
});

test('R37 rejects duplicates, unsafe feed identity, fabricated rights approval and malformed audit',async()=>{
 const duplicated=cache();duplicated.items.push({...duplicated.items[0]});
 assert.throws(()=>prepareR37Review(duplicated,{now}),/R37_DUPLICATE_CANDIDATE/);
 const modified=cache();modified.items[0].rightsVerified=true;
 assert.throws(()=>prepareR37Review(modified,{now}),/R37_CANDIDATE_CONTRACT_INVALID/);
 const injected=cache();injected.items[0].sourceUrl='https://example.com/not-the-source';
 assert.throws(()=>prepareR37Review(injected,{now}),/R37_CANDIDATE_CONTRACT_INVALID/);
 await assert.rejects(()=>runR37ArticleEvidence({cache:cache(),now,
  auditor:async()=>({version:'IRAN_ARTICLE_DETAIL_AUDIT_R25',articles:[]})}),
 /R37_ARTICLE_AUDIT_CONTRACT_INVALID/);
});

test('R37 loads an existing cache unchanged and rejects relative or symbolic links',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-r37-'));
 try{
  const file=path.join(dir,'cache.json'),bytes=JSON.stringify(cache());
  fs.writeFileSync(file,bytes);
  const loaded=loadR37CandidateCache(file);
  assert.equal(loaded.cache.items.length,7);
  assert.equal(loaded.inputSha256,createHash('sha256').update(bytes).digest('hex'));
  assert.equal(fs.readFileSync(file,'utf8'),bytes);
  assert.throws(()=>loadR37CandidateCache('cache.json'),/R37_ABSOLUTE_INPUT_REQUIRED/);
  const link=path.join(dir,'symlink.json');fs.symlinkSync(file,link);
  assert.throws(()=>loadR37CandidateCache(link),/R37_UNSAFE_CANDIDATE_FILE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
