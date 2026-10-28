import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {R36_ACTIVE_SOURCE_IDS,inspectR36Coverage,inspectInstalledR36,
 readR36ScheduledStatus}
 from '../scripts/iran-progress/news-display-coverage-readonly-r36.mjs';

const now=Date.parse('2026-10-28T12:00:00Z');
const recent='2026-10-27T10:30:00.000Z';
const old='2026-09-01T10:30:00.000Z';
const item=(sourceId,index,date=recent)=>{
 const sourceUrl=`https://example.invalid/${sourceId}/${index}`;
 return {id:createHash('sha256').update(sourceUrl).digest('hex'),
  sourceId,sourceUrl,originalTitle:`Original ${sourceId} article ${index}`,
  publisherDeclaredPublishedAt:date,
  reviewStatus:'ARTICLE_METADATA_REVIEWED',rightsVerified:false,displayEligible:false};
};
const cacheFor=(counts,retired=0)=>({version:'IRAN_NEWS_COLLECTION_R26',
 updatedAt:Date.parse('2026-10-28T11:00:00Z'),
 items:[...R36_ACTIVE_SOURCE_IDS.flatMap((id,i)=>Array.from({length:counts[i]},
  (_,j)=>item(id,j))),...Array.from({length:retired},(_,j)=>item('iaea-news',j,old))]});
const status={state:'R29_STATUS_FILE_OBSERVED',
 completedEpoch:Date.parse('2026-10-28T06:00:00Z'),
 completedAtKst:'2026-10-28 15:00:00',status:'PRIVATE_COLLECTION_PARTIAL',
 sourcesFailed:0,articleFailures:0};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('R36 counts 59 real private-cache rows across 7 active and retired sources without publication',()=>{
 const result=inspectR36Coverage({cache:cacheFor([11,8,5,1,7,17,9],1),now,
  taskPresent:true,scheduledStatus:status});
 assert.equal(result.status,'PASS_R36_SEVEN_SOURCE_PRIVATE_COVERAGE');
 assert.equal(result.totalPrivateCandidateCount,59);
 assert.equal(result.activeStoredCandidateCount,58);
 assert.equal(result.retiredHistoricalCandidateCount,1);
 assert.equal(result.sourcesWithRetained30DayCandidates,7);
 assert.equal(result.sourceCoverage.length,7);
 assert.equal(result.sourceCoverage.find(x=>x.sourceId==='dw-world').retained30DayCandidates,1);
 assert.equal(result.sourceCoverage.find(x=>x.sourceId==='guardian-iran').retained30DayCandidates,5);
 assert.equal(result.sourceCoverage.find(x=>x.sourceId==='dw-world').latestArticle.publishedAtKst,
  '2026-10-27 19:30:00');
 assert.deepEqual(result.missingActiveSources,[]);
 assert.equal(result.scheduledRun.cacheNewerThanLastSchedule,true);
 assert.equal(result.scheduledRun.twoNormalCyclesVerified,false);
 for(const key of ['pcCacheWritten','operationalFilesWritten','collectionExecuted',
  'schedulerModified','d1Written','scoreLedgerModified','publicCacheModified',
  'rightsVerified','displayEligible'])assert.equal(result[key],false);
});

test('R36 never reports seven-source success when DW only has an expired article',()=>{
 const cache=cacheFor([2,2,2,1,2,2,2]);
 const dw=cache.items.find(x=>x.sourceId==='dw-world');
 dw.publisherDeclaredPublishedAt=old;
 const result=inspectR36Coverage({cache,now});
 assert.equal(result.status,'PARTIAL_R36_SEVEN_SOURCE_PRIVATE_COVERAGE');
 assert.deepEqual(result.missingActiveSources,['dw-world']);
 assert.equal(result.sourceCoverage.find(x=>x.sourceId==='dw-world').storedCandidateCount,1);
 assert.equal(result.sourceCoverage.find(x=>x.sourceId==='dw-world').retained30DayCandidates,0);
 assert.equal(result.sourceCoverage.find(x=>x.sourceId==='dw-world').olderOrOutOfWindowCandidates,1);
});

test('R36 forbids private rights drift, future dates and malformed registry',()=>{
 const cache=cacheFor([1,1,1,1,1,1,1]);
 cache.items[0].rightsVerified=true;
 assert.throws(()=>inspectR36Coverage({cache,now}),/R36_PRIVATE_METADATA_CONTRACT_DRIFT/);
 cache.items[0].rightsVerified=false;
 cache.items[0].publisherDeclaredPublishedAt='2030-10-27T10:30:00.000Z';
 assert.throws(()=>inspectR36Coverage({cache,now}),/R36_PUBLISHER_DATE_INVALID/);
 assert.throws(()=>inspectR36Coverage({cache:cacheFor([1,1,1,1,1,1,1]),now,
  activeIds:R36_ACTIVE_SOURCE_IDS.slice(1)}),/R36_COVERAGE_INPUT_INVALID/);
});

test('R36 reads R29 status without updating or executing an operation',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'iran-r36-status-'));
 try{
  const file=path.join(dir,'news-display-candidates-auto-r29-status.json');
  const record={version:'IRAN_NEWS_PRIVATE_AUTO_R29',
   completedAtKst:'2026-10-28 15:00:00',status:'PRIVATE_COLLECTION_PARTIAL',
   candidatesSaved:59,sourcesFailed:0,articleFailures:0};
  const bytes=JSON.stringify(record);
  writeFileSync(file,bytes);
  const got=readR36ScheduledStatus(dir);
  assert.equal(got.state,'R29_STATUS_FILE_OBSERVED');
  assert.equal(got.completedAtKst,record.completedAtKst);
  assert.equal(got.candidatesSaved,59);
  assert.equal(readFileSync(file,'utf8'),bytes);
  writeFileSync(file,'{bad');
  assert.throws(()=>readR36ScheduledStatus(dir),/R36_R29_STATUS_JSON_INVALID/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('R36 validates installed R35 module identities and reads the real R26 cache contract',async()=>{
 const pc=mkdtempSync(path.join(tmpdir(),'iran-r36-installed-'));
 try{
  const modules=['news-display-multisource-audit-r24.mjs',
   'news-display-source-registry-r26.mjs','news-display-article-audit-r25.mjs',
   'news-display-collection-r26.mjs','news-display-discover-r1.mjs','sources.mjs'];
  mkdirSync(path.join(pc,'scripts','iran-progress'),{recursive:true});
  mkdirSync(path.join(pc,'lib','iran-progress'),{recursive:true});
  for(const file of modules)copyFileSync(path.join(root,'scripts','iran-progress',file),
   path.join(pc,'scripts','iran-progress',file));
  copyFileSync(path.join(root,'lib','iran-progress','news-display-r1.mjs'),
   path.join(pc,'lib','iran-progress','news-display-r1.mjs'));
  const urls=[
   'https://www.tasnimnews.ir/en/news/2026/10/27/123/iran-talks',
   'https://www.gov.uk/government/news/iran-talks',
   'https://www.theguardian.com/world/2026/oct/27/iran-talks',
   'https://www.dw.com/en/iran-talks/a-79776122',
   'https://www.bbc.com/news/articles/iran-talks',
   'https://www.aljazeera.com/news/2026/10/27/iran-talks',
   'https://news.un.org/en/story/2026/10/iran-talks',
  ];
  const items=R36_ACTIVE_SOURCE_IDS.map((sourceId,index)=>{
   const sourceUrl=urls[index];
   return {...item(sourceId,index),sourceUrl,
    id:createHash('sha256').update(sourceUrl).digest('hex')};
  });
  const before=JSON.stringify({version:'IRAN_NEWS_COLLECTION_R26',
   updatedAt:Date.parse('2026-10-28T11:00:00Z'),items});
  const cacheFile=path.join(pc,'news-display-candidates-r26.json');
  writeFileSync(cacheFile,before);
  const result=await inspectInstalledR36({projectRoot:pc,dataDirectory:pc,now,
   taskPresent:false});
  assert.equal(result.status,'PASS_R36_SEVEN_SOURCE_PRIVATE_COVERAGE');
  assert.equal(result.totalPrivateCandidateCount,7);
  assert.equal(result.sourceCoverage.length,7);
  assert.ok(/^[a-f0-9]{64}$/.test(result.candidateCacheSha256));
  assert.equal(result.scheduledRun.recordState,'R29_STATUS_NOT_FOUND');
  assert.equal(readFileSync(cacheFile,'utf8'),before);
 }finally{rmSync(pc,{recursive:true,force:true});}
});

test('R36 CMD snapshot is portable, read-only and may be repeated after a new normal cycle',()=>{
 const bytes=readFileSync(path.join(root,'IRAN_NEWS_R36_COVERAGE_READONLY.cmd'));
 const cmd=bytes.toString('ascii');
 assert.ok(bytes.every(byte=>byte<128));
 assert.equal(cmd.replace(/\r\n/g,'').includes('\n'),false);
 assert.match(cmd,/--snapshot/);
 assert.doesNotMatch(cmd,/--collect|--install|\bschtasks\b|\bwrangler\b|PowerShell/i);
 assert.match(cmd,/IRAN_NEWS_R36_SOURCE_COVERAGE_\*\.txt/);
});
