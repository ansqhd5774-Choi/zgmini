import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareGmhSevenR178PrivateDraft,prepareGmhSevenR178AttestedDraft}
 from '../scripts/pc-writer/theme-seven-gmh-r178-private-draft.mjs';
import {GMH_SEVEN_SYMBOLS,} from '../scripts/pc-writer/theme-gmh-seven-private-bridge.mjs';
import {THEME_ETF_ONLY_PAIRS,THEME_ETF_ONLY_PUBLIC_VERSION,
 THEME_ETF_ONLY_METHOD} from '../worker/theme-etf-only-public.mjs';
import {immutableBaseHash,validRollingPublic}
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

test('actual 7x252 contract: SHA input + parity -> exactly-shaped but unpublishable R178 draft',async()=>{
 const x=input();
 const v=await prepareGmhSevenR178PrivateDraft(x);
 assert.equal(v.status,'R178_GMH_ONLY_PRIVATE_DRAFT_NOT_PUBLISHED');
 assert.equal(v.rolling.phase,'CONFIRMED');
 assert.equal(v.rolling.version,'THEME_ETF_ROLLING_R178');
 assert.equal(v.rolling.observationDate,'2026-11-13');
 assert.equal(v.rolling.asOf,STORED);
 assert.equal(v.rolling.sourceStoredAt,STORED);
 assert.equal(v.rolling.sourceVersion,'GMH_MANIFEST_SHA256_'+MANIFEST);
 assert.equal(v.rolling.baseHash,await immutableBaseHash(x.legacySeed));
 assert.equal(v.rolling.themes.length,7);
 assert.equal(v.rolling.themes.reduce((n,t)=>n+t.history.length,0),1764);
 assert.equal(v.rolling.lineage.primarySource,'GETMARKETHISTORY_1H_CLOSE');
 assert.equal(v.rolling.lineage.secondarySource,null);
 assert.equal(v.rolling.lineage.secondaryPendingCount,0);
 assert.equal(v.rolling.lineage.latestCompletedSession,'2026-11-13');
 assert.equal(v.rolling.provisional.points.length,0);
 assert.equal(v.reconciliation.overlapDates,224);
 assert.equal(v.reconciliation.matchedScores,1568);
 assert.equal(v.reconciliation.mismatchedScores,0);
 assert.equal(v.provenance.sourceStoredAtAttestedByManifest,false);
 assert.equal(v.provenance.rightsVerified,false);
 assert.equal(v.provenance.d1CasVerified,false);
 assert.equal(v.provenance.r32NonRegressionVerified,false);
 assert.equal(v.rolling.publicationAuthorized,false);
 assert.equal(v.rolling.upstreamCommercialRightsVerified,false);
 assert.equal(v.rolling.derivedLicenseVerified,false);
 assert.equal(v.rolling.sourcePriceReconciled,false);
 assert.equal(v.providerCalls,0);
 assert.equal(v.sqliteWrites,0);
 assert.equal(v.d1Writes,0);
 assert.equal(v.publicWrites,0);
 assert.equal(await validRollingPublic(v.rolling,x.legacySeed,{now:NOW}),false);
 assert.doesNotMatch(JSON.stringify(v),/rawClose|volume|rawBars|rawPrices/);
 // Only in-memory test values emulate a separately approved publication. This
 // MUST NOT set real rights flags or produce an operational D1 write.
 const syntheticApproved={...v.rolling,status:'READY',
  publicationAuthorized:true,upstreamCommercialRightsVerified:true,
  derivedLicenseVerified:true,sourcePriceReconciled:true};
 assert.equal(await validRollingPublic(syntheticApproved,x.legacySeed,{now:NOW}),true);
});
test('tampered, unpinned and mismatched GMH artifacts cannot form a R178 draft',async()=>{
 const x=input();
 const bad=[{...x,privateArtifactSha256:'f'.repeat(64)},
  {...x,expectedManifestSha256:'e'.repeat(64)},
  {...x,privateArtifactBytes:Buffer.from('not json')},
  {...x,privateArtifactBytes:Buffer.from('{"a":1}')},
  {...x,privateArtifactBytes:Buffer.concat([x.privateArtifactBytes,Buffer.from([0])])}];
 for(const y of bad)await assert.rejects(
  prepareGmhSevenR178PrivateDraft(y),/W03_R178_/);
 const invalid=privateCandidate();
 invalid.inputProvider='MARKETPARQUET_FREE_SAMPLE';
 await assert.rejects(prepareGmhSevenR178PrivateDraft(input(invalid)),
  /W03_SEVEN_SEED_PRIVATE_GMH_CONTRACT/);
 const drift=privateCandidate();
 const overlap=datesTo('2026-10-16')[30];
 drift.themes[0].history.find(p=>p.date===overlap).score=45;
 await assert.rejects(prepareGmhSevenR178PrivateDraft(input(drift)),
  /HISTORICAL_SCORE_RECONCILIATION_FAILED/);
});
test('cannot refresh stale observation using a fresh draft creation timestamp',async()=>{
 const x=input(),t=Date.parse('2026-12-10T00:00:00Z');
 const result=await prepareGmhSevenR178PrivateDraft({...x,now:t});
 assert.equal(result.rolling.asOf,STORED);
 assert.equal(result.rolling.sourceStoredAt,STORED);
 const forced={...result.rolling,status:'READY',
  publicationAuthorized:true,upstreamCommercialRightsVerified:true,
  derivedLicenseVerified:true,sourcePriceReconciled:true};
 assert.equal(await validRollingPublic(forced,x.legacySeed,{now:t}),false);
});

test('private-seed tolerance cannot mask a stricter existing R178 reader rejection',async()=>{
 const p=privateCandidate();
 const overlap=datesTo('2026-10-16')[44];
 p.themes[1].history.find(x=>x.date===overlap).score=40.000005;
 await assert.rejects(prepareGmhSevenR178PrivateDraft(input(p)),
  {code:'W03_R178_R178_READER_OVERLAP_MISMATCH'});
});

function attestedInput(mutate=()=>{}){
 const manifest={schema:'GMH_SEVEN_1H_SAVED_RAW_V1',version:1,
  start:'2024-03-04',end:'2026-11-13',files:[]};
 const checkpoint={schema:manifest.schema,version:1,start:manifest.start,
  end:manifest.end,symbols:{}};
 const rawPages=[];
 for(const [i,symbol] of GMH_SEVEN_SYMBOLS.entries()){
  const bytes=Buffer.from(JSON.stringify({symbol,
   timestamp:'2026-11-13T20:00:00.000Z',close:100+i,is_gap:false})+'\\n');
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
 const bytes=Buffer.from(JSON.stringify(candidate)+'\\n');
 return {privateArtifactBytes:bytes,privateArtifactSha256:sha(bytes),
  expectedManifestSha256:manifestSha256,expectedCheckpointSha256:checkpointSha256,
  legacySeed:seed(),now:NOW,
  saved:{manifestBytes,manifestSha256,
   checkpointBytes,checkpointSha256,rawPages}};
}

test('attested GMH-only R178 uses the oldest of 14 latest-session request receipts',async()=>{
 const x=attestedInput(),v=await prepareGmhSevenR178AttestedDraft(x);
 assert.equal(v.status,'R178_GMH_ONLY_PRIVATE_DRAFT_NOT_PUBLISHED');
 assert.equal(v.rolling.sourceStoredAt,'2026-11-14T03:00:00.000Z');
 assert.equal(v.rolling.asOf,'2026-11-14T03:00:00.000Z');
 assert.equal(v.provenance.sourceTimestampBasis,'MANIFEST_GET_REQUEST_AT');
 assert.equal(v.provenance.sourceTimestampIsFileCommitTime,false);
 assert.equal(v.provenance.sourceStoredAtIsCallerSupplied,false);
 assert.equal(v.provenance.sourceStoredAtAttestedByManifest,true);
 assert.equal(v.provenance.rawFilesRehashedNow,true);
 assert.equal(v.provenance.rawPagesVerified,14);
 assert.equal(v.provenance.verifiedSymbols,14);
 assert.equal(v.provenance.checkpointSha256,x.expectedCheckpointSha256);
 assert.equal(v.provenance.rightsVerified,false);
 assert.equal(v.provenance.publicationAuthorized,false);
 assert.equal(v.provenance.d1CasVerified,false);
 assert.equal(v.rolling.publicationAuthorized,false);
 assert.equal(v.d1Writes,0);
 assert.equal(v.publicWrites,0);
 assert.equal(v.providerCalls,0);
 assert.doesNotMatch(JSON.stringify(v),/rawClose|close":|rawBars|volume/);
});
test('fake collection dates, source pins or raw-page changes stop before a R178 attestation',async()=>{
 const bad=[
  attestedInput(m=>{m.files[0].collectedAt='2026-11-19T00:00:00.000Z';}),
  attestedInput(m=>{m.files[0].collectedAt='2026-11-12T00:00:00.000Z';}),
  attestedInput(m=>{m.files[0].observationThrough='2026-11-12';}),
 ];
 for(const x of bad)await assert.rejects(
  prepareGmhSevenR178AttestedDraft(x),/W03_SAVED_/);
 const verified=attestedInput();
 for(const x of [
  {...verified,expectedManifestSha256:'f'.repeat(64)},
  {...verified,expectedCheckpointSha256:'f'.repeat(64)},
  {...verified,privateArtifactSha256:'f'.repeat(64)},
  {...verified,saved:{...verified.saved,
   rawPages:verified.saved.rawPages.map((p,i)=>i?p:{
    ...p,bytes:Buffer.from('{}\\n')})}},
 ]){
  await assert.rejects(prepareGmhSevenR178AttestedDraft(x),/W03_/);
 }
});
