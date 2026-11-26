import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {GMH_SEVEN_SYMBOLS} from '../scripts/pc-writer/theme-gmh-seven-private-bridge.mjs';
import {calculateFromSavedGmhSeven,attestSavedGmhSevenCollectionTime,GMH_SEVEN_SAVED_SCHEMA}
 from '../scripts/pc-writer/theme-gmh-seven-saved-input-r1.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const rows=[];
for(let d=new Date('2022-01-03T00:00:00Z');rows.length<628;
 d=new Date(d.getTime()+86_400_000)){
 if(d.getUTCDay()===0||d.getUTCDay()===6)continue;
 rows.push(d.toISOString().slice(0,10));
}
const localHour=new Intl.DateTimeFormat('en-US',{
 timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'});
function hour(day){
 for(const h of ['19','20']){
  const t=day+'T'+h+':00:00Z';
  if(localHour.format(new Date(t))==='15')return t;
 }
 throw Error('TEST_NY_HOUR');
}
function fixture(){
 const manifest={schema:GMH_SEVEN_SAVED_SCHEMA,version:1,
  start:'2022-01-03',end:'2024-06-01',files:[]};
 const checkpoint={schema:GMH_SEVEN_SAVED_SCHEMA,version:1,
  start:manifest.start,end:manifest.end,symbols:{}};
 const rawPages=[];
 for(const [offset,symbol] of GMH_SEVEN_SYMBOLS.entries()){
  const bars=rows.map((day,i)=>JSON.stringify({
   symbol,timestamp:hour(day),
   close:Number((120+offset*3+i*.081+Math.sin(i/19+offset)*2).toFixed(6)),
   is_gap:false
  })).join('\n')+'\n';
  const bytes=Buffer.from(bars),sum=sha(bytes);
  const path='raw/'+symbol+'_'+sum+'.jsonl';
  manifest.files.push({symbol,path,sha256:sum,
   source:'GETMARKETHISTORY_FREE_1H',
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
   rowCount:628,observationFrom:rows[0],observationThrough:rows.at(-1)});
  checkpoint.symbols[symbol]={
   complete:true,cursor:null,pages:1,files:[{path,sha256:sum}]};
  rawPages.push({path,bytes});
 }
 const manifestBytes=Buffer.from(JSON.stringify(manifest));
 const checkpointBytes=Buffer.from(JSON.stringify(checkpoint));
 return {manifestBytes,manifestSha256:sha(manifestBytes),
  checkpointBytes,checkpointSha256:sha(checkpointBytes),
  rawPages,asOf:'2024-06-01T00:00:00Z'};
}
function mutateManifest(input,fn){
 const m=JSON.parse(input.manifestBytes.toString());
 fn(m);
 const bytes=Buffer.from(JSON.stringify(m));
 return {...input,manifestBytes:bytes,manifestSha256:sha(bytes)};
}
function mutateCheckpoint(input,fn){
 const cp=JSON.parse(input.checkpointBytes.toString());
 fn(cp);
 const bytes=Buffer.from(JSON.stringify(cp));
 return {...input,checkpointBytes:bytes,checkpointSha256:sha(bytes)};
}
test('stored PC GMH 14 SHA pages reconcile into 7x252 private scores, never public',()=>{
 const input=fixture();
 const out=calculateFromSavedGmhSeven(input);
 assert.equal(out.status,'PRIVATE_252_RESEARCH_READY_NO_PUBLICATION');
 assert.equal(out.commonSessions,628);
 assert.equal(out.themes.length,7);
 assert.ok(out.themes.every(t=>t.days.length===252));
 assert.equal(out.checkedRawPages,14);
 assert.equal(out.rawManifestSha256,input.manifestSha256);
 assert.equal(out.checkpointSha256,input.checkpointSha256);
 assert.equal(out.providerCalls,0);
 assert.equal(out.d1Writes,0);
 assert.equal(out.schedulerWrites,0);
 assert.equal(out.publicationAuthorized,false);
 assert.equal(out.upstreamCommercialRightsVerified,false);
 assert.equal(out.derivedLicenseVerified,false);
 assert.doesNotMatch(JSON.stringify(out),/"(?:timestamp|close|volume|rawPages)"/);
});
test('manifest/checkpoint SHA drift and incomplete checkpoint are always blocked',()=>{
 const input=fixture();
 assert.throws(()=>calculateFromSavedGmhSeven({
  ...input,manifestSha256:'f'.repeat(64)}),
  {code:'W03_SAVED_MANIFEST_SHA_OR_BYTES'});
 assert.throws(()=>calculateFromSavedGmhSeven({
  ...input,checkpointSha256:'f'.repeat(64)}),
  {code:'W03_SAVED_CHECKPOINT_SHA_OR_BYTES'});
 assert.throws(()=>calculateFromSavedGmhSeven(mutateCheckpoint(input,
  cp=>{cp.symbols.SPY.complete=false;})),
  {code:'W03_SAVED_CHECKPOINT_NOT_COMPLETE'});
 assert.throws(()=>calculateFromSavedGmhSeven(mutateCheckpoint(input,
  cp=>{cp.failedAt='2026-11-18T00:00:00Z';})),
  {code:'W03_SAVED_CHECKPOINT_IDENTITY_OR_FAILURE'});
});
test('tampered raw pages, page mismatch and new provider fail closed',()=>{
 const input=fixture(),pages=input.rawPages.slice();
 pages[0]={...pages[0],bytes:Buffer.from('{"close":1}\n')};
 assert.throws(()=>calculateFromSavedGmhSeven({...input,rawPages:pages}),
  {code:'W03_SAVED_SAVED_PAGE_SHA_OR_IDENTITY'});
 assert.throws(()=>calculateFromSavedGmhSeven({...input,
  rawPages:[...input.rawPages,input.rawPages[0]]}),
  {code:'W03_SAVED_SAVED_PAGES_REQUIRED'});
 assert.throws(()=>calculateFromSavedGmhSeven(mutateManifest(input,
  m=>{m.files[0].source='MARKETPARQUET_FREE_SAMPLE';})),
  {code:'W03_SAVED_MANIFEST_FILE_CONTRACT'});
});
test('manifest file identity and checkpoint page binding cannot be redirected',()=>{
 const input=fixture();
 assert.throws(()=>calculateFromSavedGmhSeven(mutateManifest(input,
  m=>{m.files[0].path='../raw/escape.jsonl';})),
  {code:'W03_SAVED_MANIFEST_FILE_CONTRACT'});
 assert.throws(()=>calculateFromSavedGmhSeven(mutateCheckpoint(input,
  cp=>{cp.symbols.SPY.files[0].sha256='b'.repeat(64);})),
  {code:'W03_SAVED_CHECKPOINT_PAGE_REFERENCE'});
});

test('GMH request time comes from all 14 SHA-verified latest-session receipts, not current time',()=>{
 const fixed=fixture(),last=rows.at(-1);
 const present=mutateManifest(fixed,m=>m.files.forEach((e,i)=>{
  e.collectedAt=i===0?'2024-06-01T03:00:00.000Z':
   '2024-06-01T05:00:00.000Z';
 }));
 const out=attestSavedGmhSevenCollectionTime({
  ...present,observationDate:last,now:Date.parse('2024-06-05T00:00:00Z')
 });
 assert.equal(out.status,'GMH_SEVEN_SOURCE_REQUEST_TIME_ATTESTED_READONLY');
 assert.equal(out.sourceStoredAt,'2024-06-01T03:00:00.000Z');
 assert.equal(out.sourceTimestampBasis,'MANIFEST_GET_REQUEST_AT');
 assert.equal(out.sourceTimestampIsFileCommitTime,false);
 assert.equal(out.checkedRawPages,14);
 assert.equal(out.verifiedSymbols,14);
 assert.equal(out.coveringPages,14);
 assert.equal(out.rawFilesRehashedInMemory,true);
 assert.equal(out.d1Writes,0);
 assert.equal(out.publicWrites,0);
 assert.equal(out.providerCalls,0);
 assert.equal(out.publicationAuthorized,false);
 assert.doesNotMatch(JSON.stringify(out),/close|rawPrices|volume|credentials/);
});
test('request receipts cannot be invented, future-dated, omitted or detached from raw SHA',()=>{
 const input=fixture(),last=rows.at(-1),now=Date.parse('2024-06-05T00:00:00Z');
 const att=i=>attestSavedGmhSevenCollectionTime({
  ...i,observationDate:last,now
 });
 assert.throws(()=>att(input),
  {code:'W03_SAVED_COLLECTION_REQUEST_TIME_INVALID'});
 const valid=mutateManifest(input,m=>m.files.forEach(e=>{
  e.collectedAt='2024-06-01T03:00:00.000Z';
 }));
 assert.equal(att(valid).verifiedSymbols,14);
 for(const alteration of [
  m=>{m.files[0].collectedAt='2024-06-06T03:00:00.000Z';},
  m=>{m.files[0].collectedAt='2024-05-01T03:00:00.000Z';},
  m=>{m.files[0].collectedAt='2024-06-01T03:00:00';},
  m=>{m.files[0].observationThrough=rows[0];}
 ]){
  const v=mutateManifest(valid,alteration);
  assert.throws(()=>att(v),/W03_SAVED_/);
 }
 assert.throws(()=>att({...valid,manifestSha256:'f'.repeat(64)}),
  {code:'W03_SAVED_MANIFEST_SHA_OR_BYTES'});
 assert.throws(()=>att({...valid,checkpointSha256:'f'.repeat(64)}),
  {code:'W03_SAVED_CHECKPOINT_SHA_OR_BYTES'});
 const pages=valid.rawPages.map((p,i)=>i? p:{...p,bytes:Buffer.from('{}\\n')});
 assert.throws(()=>att({...valid,rawPages:pages}),
  {code:'W03_SAVED_SAVED_PAGE_SHA_OR_IDENTITY'});
 assert.throws(()=>attestSavedGmhSevenCollectionTime({
  ...valid,observationDate:'2025-01-01',now
 }),{code:'W03_SAVED_COLLECTION_WINDOW_MISMATCH'});
});
