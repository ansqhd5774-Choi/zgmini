// W03 R178: approved GMH-only private projection -> existing D1 CAS publisher.
// No entrypoint, scheduler, credential acquisition, supplier GET or new SQL.
// Caller owns the separately approved publisher/license attestation. Fail closed
// until it is supplied by that approved control path; this is NOT an approval.
import {createHash} from 'node:crypto';
import {validRollingPublic,THEME_ETF_ROLLING_KEY}
 from '../../worker/theme-etf-rolling-public.mjs';
import {THEME_ETF_ONLY_PUBLIC_KEY,validateThemeEtfOnlyPublic}
 from '../../worker/theme-etf-only-public.mjs';

export const R32_KEY='theme-legacy-nine-r37';
const R32_VERSION='THEME_LEGACY_NINE_R37_PUBLIC_V1';
const R32_METHOD='ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32';
const HEX=/^[a-f0-9]{64}$/;
const sha=s=>createHash('sha256').update(s).digest('hex');
const fail=code=>{throw Object.assign(Error('W03_R178_PUBLISH_'+code),{
 code:'W03_R178_PUBLISH_'+code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const own=(a,b)=>Object.hasOwn(a,b);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;

// The approved writer must provide verification bound to the exact saved
// manifest/private-artifact hashes, output bytes and approved rights basis.
// An arbitrary boolean in a candidate JSON or Issue is NOT this verifier.
export async function publishApprovedGmhSevenR178({
 prepared,record,storage,verifyApprovedEffect,now=Date.now()
}={}){
 need(prepared?.status==='R178_GMH_ONLY_PRIVATE_DRAFT_NOT_PUBLISHED'&&
  prepared?.provenance?.sourceStoredAtAttestedByManifest===true&&
  prepared.provenance.rawFilesRehashedNow===true&&
  prepared.provenance.providerOnlyGmh===true&&
  prepared.provenance.rightsVerified===false&&
  prepared.provenance.publicationAuthorized===false&&
  prepared.provenance.d1CasVerified===false&&
  prepared.provenance.r32NonRegressionVerified===false&&
  HEX.test(prepared.provenance.inputManifestSha256??'')&&
  HEX.test(prepared.provenance.privateArtifactSha256??'')&&
  HEX.test(prepared.provenance.checkpointSha256??''),
  'PRIVATE_SHA_ATTESTATION_REQUIRED');
 const draft=prepared.rolling;
 need(draft?.status==='CANDIDATE_GMH_ONLY_PRIVATE_NOT_APPROVED'&&
  draft.publicationAuthorized===false&&
  draft.upstreamCommercialRightsVerified===false&&
  draft.derivedLicenseVerified===false&&draft.sourcePriceReconciled===false&&
  draft.phase==='CONFIRMED'&&draft.provisional?.points?.length===0&&
  draft.lineage?.primarySource==='GETMARKETHISTORY_1H_CLOSE'&&
  draft.lineage?.secondarySource===null&&
  draft.lineage?.secondaryPendingCount===0&&
  draft.lineage?.latestCompletedSession===draft.observationDate,
  'RETIRED_SUPPLIER_OR_PRIVATE_CONTRACT');
 need(record&&typeof record==='object'&&!Array.isArray(record),
  'APPROVED_RECORD_REQUIRED');
 const editable=new Set(['status','publicationAuthorized',
  'upstreamCommercialRightsVerified','derivedLicenseVerified',
  'sourcePriceReconciled','asOf','publishedAt']);
 const fields=[...Object.keys(draft),'publishedAt'];
 need(Object.keys(record).length===fields.length&&
  fields.every(k=>own(record,k))&&
  Object.entries(draft).every(([k,v])=>editable.has(k)||
   same(record[k],v))&&
  record.status==='READY'&&record.publicationAuthorized===true&&
  record.upstreamCommercialRightsVerified===true&&
  record.derivedLicenseVerified===true&&record.sourcePriceReconciled===true&&
  typeof record.publishedAt==='string'&&
  Number.isFinite(Date.parse(record.publishedAt))&&
  record.asOf===record.publishedAt&&
  Date.parse(record.asOf)<=now&&
  record.sourceStoredAt===draft.sourceStoredAt,
  'NO_UNVERIFIED_RIGHTS_OR_OUTPUT_MUTATION');
 need(typeof verifyApprovedEffect==='function'&&
  storage&&typeof storage.readSeed==='function'&&
  typeof storage.read==='function'&&
  typeof storage.replace==='function'&&
  Number.isSafeInteger(now),
  'APPROVED_WRITER_REQUIRED');
 const encoded=JSON.stringify(record);
 const evidence=Object.freeze({
  operation:'R178_GMH_ONLY_SINGLE_D1_OUTPUT',
  manifestSha256:prepared.provenance.inputManifestSha256,
  checkpointSha256:prepared.provenance.checkpointSha256,
  privateArtifactSha256:prepared.provenance.privateArtifactSha256,
  projectionSha256:sha(encoded),
  sourceStoredAt:record.sourceStoredAt,
  observationDate:record.observationDate,
  feedKey:THEME_ETF_ROLLING_KEY
 });
 need(await verifyApprovedEffect(evidence)===true,
  'OPERATOR_LICENSE_AND_PRICE_POLICY_NOT_APPROVED');
 // Use the *existing* D1 authenticated writer; it owns the exact UPDATE
 // WHERE stored_at=? CAS and byte-exact readback. Never write to R32/seed.
 const seed=await storage.readSeed();
 need(seed&&validateThemeEtfOnlyPublic(seed)&&
  seed.version==='THEME_ETF_ONLY_R144_252_PUBLIC_V1'&&
  await validRollingPublic(record,seed,{now}),
  'READER_OR_IMMUTABLE_SEED_REJECTED');
 const r32Before=await storage.read(R32_KEY);
 need(r32Before?.body?.status==='READY'&&
  r32Before.body.version===R32_VERSION&&
  r32Before.body.methodologyVersion===R32_METHOD&&
  Array.isArray(r32Before.body.themes)&&
  r32Before.body.themes.length===9&&
  r32Before.body.themes.every(t=>Array.isArray(t.history)&&
   t.history.length===252&&t.history.every(p=>score(p?.score)))&&
  Number.isSafeInteger(r32Before.storedAt),
  'R32_BASELINE_UNVERIFIED');
 const r32Fingerprint=sha(JSON.stringify(r32Before.body));
 const before=await storage.read(THEME_ETF_ROLLING_KEY);
 need(before&&Number.isSafeInteger(before.storedAt)&&
  before.body?.version===record.version&&
  typeof before.body.observationDate==='string'&&
  before.body.observationDate<=record.observationDate,
  'R178_PREIMAGE_OR_DATE_INVALID');
 // An equivalent approved result might already be present after a prior
 // ambiguous CAS outcome. Do not refresh its stored_at or issue another write.
 // Check the protected R32 row again before returning a readback-only result.
 if(same(before.body,record)){
  const r32After=await storage.read(R32_KEY);
  need(r32After?.storedAt===r32Before.storedAt&&
   sha(JSON.stringify(r32After.body))===r32Fingerprint,
   'R32_CHANGED_DURING_NOOP_READBACK');
  return Object.freeze({
   status:'R178_GMH_ONLY_ALREADY_PUBLISHED_READBACK_VERIFIED',
   observationDate:record.observationDate,
   sourceStoredAt:record.sourceStoredAt,
   manifestSha256:evidence.manifestSha256,
   privateArtifactSha256:evidence.privateArtifactSha256,
   publishedBodySha256:evidence.projectionSha256,
   r32BodySha256:r32Fingerprint,
   r32StoredAt:r32Before.storedAt,
   d1StoredAt:before.storedAt,
   outputKey:THEME_ETF_ROLLING_KEY,
   d1Writes:0,providerCalls:0,seedWrites:0,r32Writes:0,
   publicApiVerified:false,uiVerified:false
  });
 }
 // No detached historical storedAt or secondary-provider rights are copied
 // into the new, GMH-only 252-point public result.
 let changed;
 try{
  changed=await storage.replace(THEME_ETF_ROLLING_KEY,record,before.storedAt);
 }catch(error){
  // The CAS may have committed even when its response was lost or reported
  // a collision. One readback distinguishes observed effect from conflict;
  // no second write, and no unsupported claim about the writer's ownership.
  const uncertainCodes=new Set([
   'W03_GMH_WRITER_D1_CAS_OUTCOME_UNKNOWN_NO_RETRY',
   'W03_GMH_WRITER_D1_CAS_NOT_APPLIED_NO_RETRY',
   'W03_GMH_WRITER_D1_CAS_READBACK_MISMATCH_NO_RETRY',
   'D1_COMPARE_AND_SWAP_FAILED'
  ]);
  if(!uncertainCodes.has(error?.code))throw error;
  let observed;
  try{observed=await storage.read(THEME_ETF_ROLLING_KEY);}
  catch{throw error;}
  if(observed?.storedAt>before.storedAt&&same(observed.body,record)){
   let protectedAfter;
   try{protectedAfter=await storage.read(R32_KEY);}
   catch{throw error;}
   need(protectedAfter?.storedAt===r32Before.storedAt&&
    sha(JSON.stringify(protectedAfter.body))===r32Fingerprint,
    'R32_CHANGED_AFTER_UNCERTAIN_CAS_NO_RETRY');
   return Object.freeze({
    status:'R178_GMH_ONLY_EFFECT_OBSERVED_AFTER_UNCERTAIN_CAS',
    observationDate:record.observationDate,
    sourceStoredAt:record.sourceStoredAt,
    manifestSha256:evidence.manifestSha256,
    privateArtifactSha256:evidence.privateArtifactSha256,
    publishedBodySha256:evidence.projectionSha256,
    r32BodySha256:r32Fingerprint,
    r32StoredAt:r32Before.storedAt,
    d1StoredAt:observed.storedAt,
    outputKey:THEME_ETF_ROLLING_KEY,
    d1Writes:null,effectOwnerVerified:false,
    providerCalls:0,seedWrites:0,r32Writes:0,
    publicApiVerified:false,uiVerified:false
   });
  }
  throw error; // A different body, unchanged timestamp or failed readback.
 }
 need(Number.isSafeInteger(changed?.storedAt)&&
  changed.storedAt>before.storedAt,
  'D1_WRITE_OUTCOME_UNKNOWN_NO_RETRY');
 const [after,r32After]=await Promise.all([
  storage.read(THEME_ETF_ROLLING_KEY),storage.read(R32_KEY)
 ]);
 need(after?.storedAt===changed.storedAt&&same(after.body,record),
  'D1_READBACK_MISMATCH_NO_RETRY');
 need(r32After?.storedAt===r32Before.storedAt&&
  sha(JSON.stringify(r32After.body))===r32Fingerprint,
  'R32_CHANGED_AFTER_PUBLICATION_NO_RETRY');
 return Object.freeze({
  status:'R178_GMH_ONLY_D1_CAS_AND_R32_READBACK_VERIFIED',
  observationDate:record.observationDate,
  sourceStoredAt:record.sourceStoredAt,
  manifestSha256:evidence.manifestSha256,
  privateArtifactSha256:evidence.privateArtifactSha256,
  publishedBodySha256:evidence.projectionSha256,
  r32BodySha256:r32Fingerprint,
  r32StoredAt:r32Before.storedAt,
  d1StoredAt:changed.storedAt,
  outputKey:THEME_ETF_ROLLING_KEY,
  d1Writes:1,providerCalls:0,seedWrites:0,r32Writes:0,
  publicApiVerified:false,uiVerified:false
 });
}
