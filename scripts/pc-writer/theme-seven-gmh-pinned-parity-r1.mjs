// W03 12/68 — verify SHA-pinned saved inputs before the existing GMH-only
// private/legacy seven-theme reconciliation. This is an in-memory READ-ONLY
// bridge; the caller must separately authenticate PC filesystem and D1 reads.
import {createHash} from 'node:crypto';
import {prepareGmhSevenPrivateSeed} from './theme-seven-gmh-private-seed-r1.mjs';

const HEX64=/^[a-f0-9]{64}$/;
const fail=reason=>{throw Object.assign(new Error('W03_PINNED_PARITY_'+reason),
 {code:'W03_PINNED_PARITY_'+reason});};
const need=(condition,reason)=>{if(!condition)fail(reason);};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
// An immutable private seed is permitted to carry derived scores only.
// Prevent accidentally attaching source bars/volumes to an otherwise valid
// SHA-pinned artifact. A checksum is integrity, not a redistribution licence.
const PRIVATE_THEME_FIELDS=new Set(['theme','etfs','history']);
const HISTORY_POINT_FIELDS=new Set(['date','score']);
function assertPrivateDerivedOnly(value){
 need(Array.isArray(value?.themes)&&value.themes.length===7,
  'PRIVATE_THEME_FIELD_SCOPE');
 for(const theme of value.themes){
  need(theme&&typeof theme==='object'&&!Array.isArray(theme)&&
   Object.keys(theme).length===3&&
   Object.keys(theme).every(k=>PRIVATE_THEME_FIELDS.has(k))&&
   Array.isArray(theme.history),'PRIVATE_THEME_FIELD_SCOPE');
  for(const point of theme.history){
   need(point&&typeof point==='object'&&!Array.isArray(point)&&
    Object.keys(point).length===2&&
    Object.keys(point).every(k=>HISTORY_POINT_FIELDS.has(k)),
    'PRIVATE_HISTORY_FIELD_SCOPE');
  }
 }
}
const safeBytes=(value,max,reason)=>{
 need(Buffer.isBuffer(value)&&value.length>0&&value.length<=max,reason);
 return value;
};
const readJson=(bytes,reason)=>{
 try{
  const v=JSON.parse(bytes.toString('utf8'));
  need(v!==null&&typeof v==='object'&&!Array.isArray(v),reason);
  return v;
 }catch{fail(reason);}
};

// expected SHA-256 values must originate from separately authenticated
// immutable PC/D1 receipts, not from the untrusted buffers themselves.
// Returns NO price/score history and NEVER marks D1 publication approved.
export function reconcilePinnedGmhSeven({
 privateArtifactBytes,legacySeedBodyBytes,
 expectedPrivateSha256,expectedLegacySeedBodySha256,
 expectedRawManifestSha256,sourceStoredAt,now=Date.now()
}={}){
 need(HEX64.test(expectedPrivateSha256??'')&&
  HEX64.test(expectedLegacySeedBodySha256??'')&&
  HEX64.test(expectedRawManifestSha256??''),'EXPECTED_SHA_REQUIRED');
 const privateBytes=safeBytes(privateArtifactBytes,500_000,'PRIVATE_BYTES_SCOPE');
 const seedBytes=safeBytes(legacySeedBodyBytes,700_000,'LEGACY_BYTES_SCOPE');
 need(digest(privateBytes)===expectedPrivateSha256,'PRIVATE_SHA_MISMATCH');
 need(digest(seedBytes)===expectedLegacySeedBodySha256,'LEGACY_SHA_MISMATCH');
 const privateResult=readJson(privateBytes,'PRIVATE_JSON_INVALID');
 const legacySeed=readJson(seedBytes,'LEGACY_JSON_INVALID');
 assertPrivateDerivedOnly(privateResult);
 need(privateResult.rawManifestSha256===expectedRawManifestSha256,
  'RAW_MANIFEST_REFERENCE_MISMATCH');
 need(typeof sourceStoredAt==='string'&&
  Number.isFinite(Date.parse(sourceStoredAt))&&
  Number.isSafeInteger(now)&&Date.parse(sourceStoredAt)<=now&&
  typeof privateResult.observationDate==='string'&&
  Date.parse(sourceStoredAt)>=Date.parse(privateResult.observationDate+'T00:00:00Z'),
  'SOURCE_STORED_AT_INVALID');
 const result=prepareGmhSevenPrivateSeed(privateResult,{
  legacySeed,sourceStoredAt,now
 });
 need(result.status==='PRIVATE_GMH_SEVEN_SEED_RECONCILED_NOT_PUBLISHED'&&
  result.draft?.publicationAuthorized===false&&
  result.draft?.upstreamCommercialRightsVerified===false&&
  result.draft?.derivedLicenseVerified===false&&
  result.d1Writes===0&&result.publicWrites===0,
  'PRIVATE_ONLY_CONTRACT_DRIFT');
 return {
  schema:'ZGMINI_W03_GMH_PINNED_SEVEN_PARITY_V1',
  status:'PRIVATE_PINNED_PARITY_VERIFIED_NOT_PUBLISHED',
  privateArtifactSha256:expectedPrivateSha256,
  legacySeedBodySha256:expectedLegacySeedBodySha256,
  rawManifestReferenceSha256:expectedRawManifestSha256,
  observationDate:result.reconciliation.candidateObservationDate,
  legacyObservationDate:result.reconciliation.legacyObservationDate,
  overlapDates:result.reconciliation.overlapDates,
  matchedScores:result.reconciliation.matchedScores,
  mismatchedScores:result.reconciliation.mismatchedScores,
  privateArtifactBytesRehashed:true,legacySeedBodyBytesRehashed:true,
  rawFilesRehashedNow:false,sourceStoredAtIsCallerSupplied:true,
  pcFilesystemReadAuthenticatedHere:false,d1ReadAuthenticatedHere:false,
  upstreamRightsAttested:false,approvedD1Write:false,
  providerCalls:0,sqliteWrites:0,d1Writes:0,publicWrites:0
 };
}
