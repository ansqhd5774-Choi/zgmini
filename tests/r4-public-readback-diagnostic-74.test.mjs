// W06 R4 #74 — PUBLIC GET ONLY, isolated GitHub CI candidate.
// Deliberately NOT merged as a recurring build gate: this probe depends
// on a live external deployment and cannot attest private D1 rows.
import test from 'node:test';
import assert from 'node:assert/strict';

const ORIGIN='https://zgmini.kr';
const EXPECTED_LOCAL_CALC='2026-11-17T00:05:37.162Z';

async function getPublic(path){
 const url=ORIGIN+path;
 const response=await fetch(url,{
  method:'GET',
  headers:{accept:'application/json','cache-control':'no-cache',
   'user-agent':'ZGMINI-W06-R4-public-readback-74'},
  signal:AbortSignal.timeout(12000),
  cache:'no-store',
 });
 const status=response.status;
 const source=response.headers.get('x-data-source');
 const contentType=response.headers.get('content-type')??'';
 console.log('W06_74_HTTP',JSON.stringify({path,status,source,contentType:contentType.split(';')[0]}));
 assert.equal(status,200,path+' requires public GET 200 (no POST or mutation)');
 assert.match(contentType,/application\/json/,path+' must deliver JSON');
 const body=await response.json();
 assert.equal(typeof body,'object',path+' JSON object');
 return {body,source};
}

test('W06 #74 public GET checks a locally observed historical point without D1 credentials or writes', {timeout:30000},async()=>{
 const [market,archive]=await Promise.all([
  getPublic('/api/market-score'),
  getPublic('/api/market-score/observations?period=1D')
 ]);
 const current=market.body;
 const obs=archive.body;
 const points=Array.isArray(obs?.points)?obs.points:[];
 const dates=points.map(p=>p?.observedAt).filter(d=>typeof d==='string').sort();
 const latest=dates.at(-1)??null;
 const containsLocal=dates.includes(EXPECTED_LOCAL_CALC);
 const publicSummary={
  currentStatus:current?.status??null,
  modelVersion:typeof current?.modelVersion==='string'?current.modelVersion:null,
  currentScore:typeof current?.overall?.score==='number'?current.overall.score:null,
  currentScoreStatus:current?.overall?.status??null,
  currentUpdatedAt:typeof current?.updatedAt==='string'?current.updatedAt:null,
  archiveStatus:obs?.status??null,
  archivePeriod:obs?.period??null,
  archiveDataSource:archive.source,
  archiveTimeMeaning:obs?.timeMeaning??null,
  archivePoints:points.length,
  archiveLastAt:latest,
  actualLocalCheckpointAt:EXPECTED_LOCAL_CALC,
  archivedCheckpointPubliclyVisible:containsLocal
 };
 console.log('W06_74_PUBLIC_SUMMARY',JSON.stringify(publicSummary));
 assert.equal(current?.status,'SUCCESS','Stored market score must be published successfully');
 assert.equal(obs?.status,'READY','1D public archive must have a published point');
 assert.equal(obs?.period,'1D');
 assert.equal(obs?.timeMeaning,'PC_CALCULATED_AT');
 assert.equal(archive.source,'STORED');
 assert.ok(points.every(p=>
  typeof p?.score==='number'&&Number.isFinite(p.score)
  &&p.score>=0&&p.score<=100
  &&typeof p?.observedAt==='string'
  &&Number.isFinite(Date.parse(p.observedAt))
 ),'No invalid or fabricated public archive points');
 assert.ok(containsLocal,
  'PUBLISHED_ARCHIVE_CHECKPOINT_NOT_VISIBLE: actual PC 2026-11-17 00:05:37.162 UTC sample absent from 1D GET');
 // This test can prove public GET presence; only an approved Writer/D1
 // owner readback can prove the private body/stored_at equality.
});
