// W03 stage 13: SHA-attested saved GMH 7x252 -> R178-shaped PRIVATE draft.
// No provider/SQLite/D1/public API calls, publishing approval or rights change.
// Reuse existing 7-theme immutable-seed parity and existing R178 reader schema.
import {createHash} from 'node:crypto';
import {prepareGmhSevenPrivateSeed} from './theme-seven-gmh-private-seed-r1.mjs';
import {THEME_ETF_ROLLING_VERSION,validRollingPublic}
 from '../../worker/theme-etf-rolling-public.mjs';

const HEX=/^[a-f0-9]{64}$/;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Object.assign(Error('W03_R178_'+code),{
 code:'W03_R178_'+code});};
const need=(yes,code)=>{if(!yes)fail(code);};

// SHA expectations must originate from a separately verified PC manifest and
// immutable private-artifact receipt, not from this object or the user's GET.
export async function prepareGmhSevenR178PrivateDraft({
 privateArtifactBytes,privateArtifactSha256,expectedManifestSha256,
 legacySeed,sourceStoredAt,now=Date.now()
}={}){
 need(Buffer.isBuffer(privateArtifactBytes)&&
  privateArtifactBytes.length>0&&privateArtifactBytes.length<=1_000_000&&
  HEX.test(privateArtifactSha256??'')&&
  HEX.test(expectedManifestSha256??'')&&
  sha(privateArtifactBytes)===privateArtifactSha256,
  'PRIVATE_ARTIFACT_SHA_MISMATCH');
 const text=privateArtifactBytes.toString('utf8');
 need(!text.includes('\0')&&Buffer.from(text,'utf8').equals(privateArtifactBytes),
  'PRIVATE_ARTIFACT_ENCODING');
 let candidate;
 try{candidate=JSON.parse(text);}catch{fail('PRIVATE_ARTIFACT_JSON');}
 need(candidate?.rawManifestSha256===expectedManifestSha256,
  'MANIFEST_LINEAGE_MISMATCH');
 const checked=prepareGmhSevenPrivateSeed(candidate,{
  legacySeed,sourceStoredAt,now});
 const {draft,reconciliation}=checked;
 // Source recency MUST remain the attested provider-storage timestamp.
 // Neither this draft's creation time nor publication time refreshes it.
 need(Number.isSafeInteger(now)&&Number.isFinite(Date.parse(sourceStoredAt))&&
  Date.parse(sourceStoredAt)<=now,'SOURCE_STORED_AT_INVALID');
 const baseHash=sha(Buffer.from(JSON.stringify(legacySeed.themes.map(t=>({
  theme:t.theme,etfs:t.etfs,history:t.history
 })))));
 const rolling={
  status:'CANDIDATE_GMH_ONLY_PRIVATE_NOT_APPROVED',
  version:THEME_ETF_ROLLING_VERSION,
  phase:'CONFIRMED',methodologyVersion:draft.methodologyVersion,
  publicationAuthorized:false,
  upstreamCommercialRightsVerified:false,
  derivedLicenseVerified:false,sourcePriceReconciled:false,
  individualStocksUsed:0,baseObservationDate:legacySeed.observationDate,
  baseHash,coverage:{etfs:13,benchmark:'SPY',complete:true},
  observationDate:draft.observationDate,
  confirmedObservationDate:draft.observationDate,
  sourceVersion:draft.sourceVersion,
  sourceStoredAt,asOf:sourceStoredAt,
  themes:draft.themes.map(t=>({
   theme:t.theme,etfs:[...t.etfs],
   score:t.latestScore,
   history:t.history.map(p=>({date:p.date,score:p.score}))
  })),
  provisional:{points:[]},
  lineage:{confirmedPrimaryCount:252,secondaryPendingCount:0,
   latestCompletedSession:draft.observationDate,
   primarySource:'GETMARKETHISTORY_1H_CLOSE',secondarySource:null}
 };
 need(await validRollingPublic(rolling,legacySeed,{now})===false,
  'DRAFT_MUST_NOT_BECOME_PUBLIC_READY');
 return Object.freeze({
  status:'R178_GMH_ONLY_PRIVATE_DRAFT_NOT_PUBLISHED',
  rolling,provenance:{
   inputManifestSha256:expectedManifestSha256,
   privateArtifactSha256,legacySeedHistorySha256:baseHash,
   sourceStoredAtIsCallerSupplied:true,
   sourceStoredAtAttestedByManifest:false,
   rawFilesRehashedNow:false,providerOnlyGmh:true,
   rightsVerified:false,publicationAuthorized:false,
   d1CasVerified:false,r32NonRegressionVerified:false
  },
  reconciliation:{
   legacyObservationDate:reconciliation.legacyObservationDate,
   candidateObservationDate:reconciliation.candidateObservationDate,
   overlapDates:reconciliation.overlapDates,
   matchedScores:reconciliation.matchedScores,
   mismatchedScores:reconciliation.mismatchedScores
  },
  providerCalls:0,sqliteOpened:false,sqliteWrites:0,d1Writes:0,
  publicWrites:0,schedulerWrites:0
 });
}
