import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
 W03_GMH_SOURCE_PINS,readPinnedPrivateGmhSeven,
 preparePinnedGmhSevenR178,runApprovedGmhSevenR178SavedOnce
} from '../scripts/pc-writer/theme-seven-gmh-r178-saved-to-cas-r1.mjs';
import {GMH_SEVEN_SYMBOLS}
 from '../scripts/pc-writer/theme-gmh-seven-private-bridge.mjs';
import {THEME_ETF_ONLY_PAIRS,THEME_ETF_ONLY_PUBLIC_VERSION,
 THEME_ETF_ONLY_METHOD}
 from '../worker/theme-etf-only-public.mjs';
import {validRollingPublic}
 from '../worker/theme-etf-rolling-public.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const NOW=Date.parse('2026-11-18T06:30:00Z');
const STORED='2026-11-14T03:00:00.000Z';
const MANIFEST='a'.repeat(64);
const datesTo=last=>Array.from({length:252},(_,i)=>new Date(
 Date.parse(last+'T00:00:00Z')-(251-i)*86_400_000).toISOString().slice(0,10));
const themes=last=>THEME_ETF_ONLY_PAIRS.map(pair=>({
 theme:pair.theme,etfs:[...pair.etfs],
 history:datesTo(last).map(date=>({date,score:40}))
}));
const seed=()=>{
 const x=themes('2026-10-16');
 return {status:'READY',version:THEME_ETF_ONLY_PUBLIC_VERSION,
  methodologyVersion:THEME_ETF_ONLY_METHOD,
  observationDate:'2026-10-16',
  publicationAuthorized:true,upstreamCommercialRightsVerified:true,
  derivedLicenseVerified:true,individualStocksUsed:0,
  scoreMethod:'ETF_ONLY_PROXY',
  sourcePriceMode:'UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED',
  sourceStoredAt:'2026-10-17T01:00:00Z',
  publishedAt:'2026-10-17T01:00:00Z',
  sourceVersion:'legacy-seed',weights:{trend:0.4,relativeStrength:0.2,volatility:0.4},
  pairWeight:0.5,
  themes:x.map(t=>({...t,latestScore:40}))};
};
const privateCandidate=()=>{
 const x=themes('2026-11-13');
 return {schema:'ZGMINI_W03_GMH_SEVEN_PRIVATE_252_V1',
  status:'PRIVATE_GMH_ONLY_7X252_NOT_PUBLISHED',
  methodologyVersion:THEME_ETF_ONLY_METHOD,
  scoreMethod:'ETF_ONLY_PROXY',
  priceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
  inputProvider:'GETMARKETHISTORY_FREE_HOURLY_ONLY',
  observationDate:'2026-11-13',firstHistoryDate:x[0].history[0].date,
  sourceWindow:{from:'2024-03-04',through:'2026-11-13'},
  rawManifestSha256:MANIFEST,scorerSha256:'b'.repeat(64),
  commonSessionCount:679,
  themes:x.map(t=>({...t,history:t.history.map(p=>({...p,rawClose:123}))})),
  publicationAuthorized:false,upstreamCommercialRightsVerified:false,
  derivedLicenseVerified:false,providerCalls:0,d1Writes:0,publicWrites:0};
};
function input(candidate=privateCandidate()){
 const bytes=Buffer.from(JSON.stringify(candidate)+'\n');
 return {privateArtifactBytes:bytes,privateArtifactSha256:sha(bytes),
  expectedManifestSha256:MANIFEST,legacySeed:seed(),
  sourceStoredAt:STORED,now:NOW};
}


function attestedInput(mutate=()=>{}){
 const manifest={schema:'GMH_SEVEN_1H_SAVED_RAW_V1',version:1,
  start:'2024-03-04',end:'2026-11-13',files:[]};
 const checkpoint={schema:manifest.schema,version:1,start:manifest.start,
  end:manifest.end,symbols:{}};
 const rawPages=[];
 for(const [i,symbol] of GMH_SEVEN_SYMBOLS.entries()){
  const bytes=Buffer.from(JSON.stringify({symbol,
   timestamp:'2026-11-13T20:00:00.000Z',close:100+i,is_gap:false})+String.fromCharCode(10));
  const digest=sha(bytes),path='raw/'+symbol+'_'+digest+'.jsonl';
  manifest.files.push({symbol,path,sha256:digest,
   source:'GETMARKETHISTORY_FREE_1H',
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
   rowCount:1,observationFrom:'2026-11-13',
   observationThrough:'2026-11-13',
   collectedAt:i<7?'2026-11-14T03:00:00.000Z':'2026-11-14T05:00:00.000Z'});
  checkpoint.symbols[symbol]={complete:true,cursor:null,pages:1,
   files:[{path,sha256:digest}]};
  rawPages.push({path,bytes});
 }
 mutate(manifest,checkpoint,rawPages);
 const manifestBytes=Buffer.from(JSON.stringify(manifest)),
  checkpointBytes=Buffer.from(JSON.stringify(checkpoint));
 const manifestSha256=sha(manifestBytes),checkpointSha256=sha(checkpointBytes);
 const candidate=privateCandidate();
 candidate.rawManifestSha256=manifestSha256;
 const bytes=Buffer.from(JSON.stringify(candidate)+String.fromCharCode(10));
 return {privateArtifactBytes:bytes,privateArtifactSha256:sha(bytes),
  expectedManifestSha256:manifestSha256,expectedCheckpointSha256:checkpointSha256,
  legacySeed:seed(),now:NOW,
  saved:{manifestBytes,manifestSha256,
   checkpointBytes,checkpointSha256,rawPages}};
}


function synthetic(){
 const f=attestedInput();
 return {f,pins:{
  manifestSha256:f.expectedManifestSha256,
  checkpointSha256:f.expectedCheckpointSha256,
  privateArtifactSha256:f.privateArtifactSha256,
  observationDate:'2026-11-13',
  sourceStoredAt:'2026-11-14T03:00:00.000Z'
 }};
}
function inject(f,pins,changes={}){
 let reads=0,writes=0;
 const storage={
  async readSeed(){reads++;return f.legacySeed;},
  async read(){throw Error('UNEXPECTED_D1_READ')},
  async replace(){writes++;throw Error('UNEXPECTED_D1_WRITE')}
 };
 return {
  dataRoot:'/synthetic/readonly',pins,storage,
  readSaved:()=>f.saved,readPrivate:()=>f.privateArtifactBytes,
  now:NOW,counts:()=>({reads,writes}),
  ...changes
 };
}
test('real verified Nov13 GMH pinned SHA are immutable, not an operator license',()=>{
 for(const key of ['manifestSha256','checkpointSha256',
  'privateArtifactSha256'])assert.match(W03_GMH_SOURCE_PINS[key],
   /^[a-f0-9]{64}$/);
 assert.equal(W03_GMH_SOURCE_PINS.observationDate,'2026-11-13');
 assert.equal(W03_GMH_SOURCE_PINS.sourceStoredAt,'2026-11-16T11:47:59.532Z');
 assert.throws(()=>readPinnedPrivateGmhSeven({dataRoot:'relative-path'}),
  {code:'W03_GMH_R178_ONCE_PC_DATA_ROOT_REQUIRED'});
});
test('saved 14-symbol/complete checkpoint SHA to R178 PRIVATE draft; no provider or D1 writes',async()=>{
 const {f,pins}=synthetic(),opts=inject(f,pins);
 const prepared=await preparePinnedGmhSevenR178(opts);
 assert.equal(prepared.status,'R178_GMH_ONLY_PRIVATE_DRAFT_NOT_PUBLISHED');
 assert.equal(prepared.provenance.sourceStoredAtAttestedByManifest,true);
 assert.equal(prepared.provenance.rawFilesRehashedNow,true);
 assert.equal(prepared.provenance.verifiedSymbols,14);
 assert.equal(prepared.provenance.rawPagesVerified,14);
 assert.equal(prepared.rolling.observationDate,'2026-11-13');
 assert.equal(prepared.rolling.sourceStoredAt,pins.sourceStoredAt);
 assert.equal(prepared.rolling.lineage.secondarySource,null);
 assert.equal(prepared.rolling.provisional.points.length,0);
 assert.equal(prepared.rolling.publicationAuthorized,false);
 assert.equal(prepared.rolling.upstreamCommercialRightsVerified,false);
 assert.equal(prepared.rolling.derivedLicenseVerified,false);
 assert.equal(prepared.rolling.sourcePriceReconciled,false);
 assert.equal(prepared.rolling.themes.reduce((n,t)=>n+t.history.length,0),1764);
 assert.deepEqual(opts.counts(),{reads:1,writes:0});
 const hypothetical={...prepared.rolling,status:'READY',
  publicationAuthorized:true,upstreamCommercialRightsVerified:true,
  derivedLicenseVerified:true,sourcePriceReconciled:true,
  asOf:'2026-11-18T06:00:00Z',
  publishedAt:'2026-11-18T06:00:00Z'};
 assert.equal(await validRollingPublic(hypothetical,f.legacySeed,{now:NOW}),true);
 // These hypothetical four flags are never assigned in the real wrapper.
 assert.equal(prepared.rolling.publicationAuthorized,false);
});
test('source/manifest/private SHA or observation-time drift stops before any write',async()=>{
 const {f,pins}=synthetic();
 const cases=[
  {pins:{...pins,manifestSha256:'e'.repeat(64)}},
  {pins:{...pins,checkpointSha256:'e'.repeat(64)}},
  {pins:{...pins,privateArtifactSha256:'e'.repeat(64)}},
  {pins:{...pins,sourceStoredAt:'2026-11-18T06:00:00Z'}},
  {pins:{...pins,observationDate:'2026-11-14'}},
  {readPrivate:()=>Buffer.from('{"tampered":true}')},
  {readSaved:()=>({...f.saved,manifestSha256:'e'.repeat(64)})}
 ];
 for(const c of cases){
  const opts=inject(f,c.pins??pins,c);
  await assert.rejects(preparePinnedGmhSevenR178(opts),/W03_/);
  assert.equal(opts.counts().writes,0);
 }
});
test('actual operational entry denies missing approval before PC reads and cannot accept synthetic SHA',async()=>{
 const {f,pins}=synthetic();
 let savedReads=0,privateReads=0,seedReads=0,writeAttempts=0;
 const storage={
  async readSeed(){seedReads++;return f.legacySeed;},
  async read(){throw Error('DO_NOT_READ_D1')},
  async replace(){writeAttempts++;}
 };
 const args={
  dataRoot:'/synthetic/readonly',storage,
  approvedRecord:{status:'READY'},now:NOW,
  readSaved:()=>{savedReads++;return f.saved;},
  readPrivate:()=>{privateReads++;return f.privateArtifactBytes;}
 };
 await assert.rejects(runApprovedGmhSevenR178SavedOnce(args),
  {code:'W03_GMH_R178_ONCE_NO_APPROVED_WRITER_OR_RECORD'});
 assert.deepEqual([savedReads,privateReads,seedReads,writeAttempts],[0,0,0,0]);
 await assert.rejects(runApprovedGmhSevenR178SavedOnce({
  ...args,verifyApprovedEffect:async()=>true
 }),{code:'W03_GMH_R178_ONCE_SAVED_MANIFEST_CHECKPOINT_PIN_STOP'});
 assert.deepEqual([savedReads,privateReads,seedReads,writeAttempts],[1,0,0,0]);
 assert.notDeepEqual(pins,W03_GMH_SOURCE_PINS);
});
