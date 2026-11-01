import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,webcrypto} from 'node:crypto';
import {publishIranNewsAnalysisR1,runIranNewsAnalysisPublicationR1}
 from '../scripts/iran-progress/news-analysis-publication-r1.mjs';
import {IRAN_NEWS_ANALYSIS_PUBLIC_KEY_R1} from '../lib/iran-progress/news-analysis-public-r1.mjs';

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const NOW=Date.parse('2026-10-29T08:00:00.000Z');
const URL='https://www.gov.uk/government/news/iran-news-update';
const id=createHash('sha256').update(URL).digest('hex');
const record=()=>({version:'IRAN_NEWS_ANALYSIS_R1',publishedAt:NOW-1000,
 items:[{id,sourceUrl:URL,titleKo:'이란 관련 외교 협의에 관한 발표',
  summaryKo:'공식 발표에는 해당 지역의 외교적 협의 진행 사실이 포함됐다고 설명했다.',
  interpretationKo:'외교적 협의에 대한 언급은 있으나 실제 합의가 완료됐다는 증거는 제시되지 않았다.',
  impact:'neutral',analysisStatus:'READY',analyzedAt:NOW-2000,
  evidenceUrls:[URL],model:'gemma3:4b'}],pending:[]});
const fake=({stored=null,throwAfterWrite=false}={})=>{
 const writes=[],queries=[];
 let row=stored;
 return {writes,queries,client:{
  async query(db,sql,params){queries.push({db,sql,params});
   return {results:row?[row]:[]};},
  async request(db,batch){writes.push({db,batch});
   const args=batch[0].params;
   row={body:args[1],stored_at:args[2]};
   if(throwAfterWrite)throw Error('simulated transport timeout');
   return [{success:true}];
  },
 }};
};

test('publishes only the separate key into CORE D1, with exact read-back',async()=>{
 const {client,writes,queries}=fake();
 const result=await publishIranNewsAnalysisR1(client,'core-d1-id',record(),{now:NOW});
 assert.equal(result.status,'VERIFIED');
 assert.equal(writes.length,1);
 assert.equal(writes[0].db,'core-d1-id');
 assert.equal(writes[0].batch[0].params[0],IRAN_NEWS_ANALYSIS_PUBLIC_KEY_R1);
 assert.match(writes[0].batch[0].sql,/INSERT INTO market_public_snapshots_v1/);
 assert.match(writes[0].batch[0].sql,/excluded\.stored_at>market_public_snapshots_v1\.stored_at/);
 assert.equal(queries.length,2);
 assert(queries.every(q=>q.params[0]===IRAN_NEWS_ANALYSIS_PUBLIC_KEY_R1));
 assert(queries.every(q=>/^SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=\?$/.test(q.sql)));
});

test('preserves newer row and treats unchanged identical publish as no-op',async()=>{
 const input=record();
 const newer=fake({stored:{body:'{}',stored_at:input.publishedAt+1}});
 assert.equal((await publishIranNewsAnalysisR1(newer.client,'core',input,{now:NOW})).status,
  'REMOTE_NEWER_PRESERVED');
 assert.equal(newer.writes.length,0);
 const same=fake({stored:{body:JSON.stringify(input),stored_at:input.publishedAt}});
 assert.equal((await publishIranNewsAnalysisR1(same.client,'core',input,{now:NOW})).status,'UNCHANGED');
 assert.equal(same.writes.length,0);
});

test('D1 write transport failure is resolved through authoritative read-back',async()=>{
 const {client}=fake({throwAfterWrite:true});
 assert.equal((await publishIranNewsAnalysisR1(client,'core',record(),{now:NOW})).status,'VERIFIED');
});

test('invalid item fails before D1 access; timestamps cannot go backward',async()=>{
 const broken=record();broken.items[0].id='0'.repeat(64);
 const f=fake();
 await assert.rejects(publishIranNewsAnalysisR1(f.client,'core',broken,{now:NOW}),
  /ANALYSIS_PUBLICATION_PAYLOAD_INVALID/);
 assert.equal(f.queries.length,0);
 const collision=fake({stored:{body:'{}',stored_at:record().publishedAt}});
 await assert.rejects(publishIranNewsAnalysisR1(collision.client,'core',record(),{now:NOW}),
  /ANALYSIS_PUBLICATION_SAME_TIME_CONFLICT/);
});

test('staged dry-run validates without D1 config/credentials or any write',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'news-analysis-pub-'));
 const input=path.join(directory,'staged.json');
 try{
  fs.writeFileSync(input,JSON.stringify(record()));
  const result=await runIranNewsAnalysisPublicationR1({file:input,mode:'dry-run',now:NOW});
  assert.equal(result.status,'DRY_RUN_VALIDATED');
  assert.equal(result.itemCount,1);
  assert.equal(result.d1WriteAttempted,false);
  await assert.rejects(runIranNewsAnalysisPublicationR1({file:'relative.json',mode:'dry-run',now:NOW}),
   /ANALYSIS_STAGE_PATH_NOT_ABSOLUTE/);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
