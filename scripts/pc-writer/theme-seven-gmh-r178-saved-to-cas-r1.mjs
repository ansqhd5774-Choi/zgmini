// W03: exact previously proved PC GMH 7x252 saved source -> approved R178 CAS.
// This is an import-only adapter for the *existing approved Writer*. It cannot
// grant rights, install to PC, request a provider or schedule a job on its own.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readPcSavedGmhSeven} from './theme-gmh-seven-pc-parity-r1.mjs';
import {prepareGmhSevenR178AttestedDraft}
 from './theme-seven-gmh-r178-private-draft.mjs';
import {publishApprovedGmhSevenR178}
 from './theme-seven-gmh-r178-authorized-cas.mjs';

// Previous successful PC #2166, #2185. These are single-snapshot pins, NOT
// authorizations for new observations, future data or publication.
export const W03_GMH_SOURCE_PINS=Object.freeze({
 manifestSha256:'82f380e346e350c276c4b532353ddc3112dbfa5f90c8d1590c25e22ec064bc0a',
 checkpointSha256:'3ddc25440fe93a8301f0f6f9d6d82dc34867fc6852198f4ac90a03828eba0336',
 privateArtifactSha256:'9f5fa50f294224b273b0eee6e4d1ad96afc1b37a61774d8bf74d1543ffa1f62a',
 observationDate:'2026-11-13',
 sourceStoredAt:'2026-11-16T11:47:59.532Z'
});
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Object.assign(Error('W03_GMH_R178_ONCE_'+code),{
 code:'W03_GMH_R178_ONCE_'+code});};
const need=(ok,code)=>{if(!ok)fail(code);};

export function readPinnedPrivateGmhSeven({dataRoot}={}){
 need(typeof dataRoot==='string'&&path.isAbsolute(dataRoot),
  'PC_DATA_ROOT_REQUIRED');
 const root=fs.realpathSync.native(dataRoot);
 const folder=path.join(root,'themes','theme-legacy-seven','derived');
 const canonical=fs.realpathSync.native(folder);
 const rel=path.relative(root,canonical);
 need(rel!==''&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&
  !path.isAbsolute(rel),
  'PRIVATE_DIR_SCOPE_STOP');
 const file=path.join(canonical,'seven-gmh-'+
  W03_GMH_SOURCE_PINS.privateArtifactSha256.slice(0,16)+'.json');
 const stat=fs.lstatSync(file),real=fs.realpathSync.native(file);
 const fromFolder=path.relative(canonical,real);
 need(stat.isFile()&&!stat.isSymbolicLink()&&
  fromFolder!==''&&fromFolder!=='..'&&
  !fromFolder.startsWith('..'+path.sep)&&
  !path.isAbsolute(fromFolder)&&stat.size>100&&stat.size<=1_000_000,
  'PRIVATE_FILE_SCOPE_STOP');
 const original=fs.readFileSync(file),next=fs.readFileSync(file);
 const after=fs.lstatSync(file);
 need(original.equals(next)&&
  original.length===stat.size&&after.size===stat.size&&
  after.mtimeMs===stat.mtimeMs&&!after.isSymbolicLink()&&
  sha(original)===W03_GMH_SOURCE_PINS.privateArtifactSha256,
  'PRIVATE_IMMUTABLE_SHA_STOP');
 return original;
}

// This inner projection is READ ONLY, with caller-pinned hashes for synthetic
// test fixtures. It never approves a publication or mutates any destination.
// The operational wrapper below always supplies the exact prior-PC evidence.
export async function preparePinnedGmhSevenR178({
 dataRoot,storage,readSaved=readPcSavedGmhSeven,
 readPrivate=readPinnedPrivateGmhSeven,
 pins=W03_GMH_SOURCE_PINS,now=Date.now()
}={}){
 need(typeof dataRoot==='string'&&path.isAbsolute(dataRoot)&&
  Number.isSafeInteger(now)&&typeof readSaved==='function'&&
  typeof readPrivate==='function'&&
  storage&&typeof storage.readSeed==='function'&&
  /^[a-f0-9]{64}$/.test(pins?.manifestSha256??'')&&
  /^[a-f0-9]{64}$/.test(pins?.checkpointSha256??'')&&
  /^[a-f0-9]{64}$/.test(pins?.privateArtifactSha256??''),
  'PC_SOURCE_INPUT_UNAVAILABLE');
 const saved=readSaved({dataRoot});
 need(saved?.manifestSha256===pins.manifestSha256&&
  saved.checkpointSha256===pins.checkpointSha256,
  'SAVED_MANIFEST_CHECKPOINT_PIN_STOP');
 const bytes=readPrivate({dataRoot});
 need(Buffer.isBuffer(bytes)&&sha(bytes)===pins.privateArtifactSha256,
  'SAVED_PRIVATE_SHA_STOP');
 const seed=await storage.readSeed();
 const prepared=await prepareGmhSevenR178AttestedDraft({
  saved,privateArtifactBytes:bytes,
  privateArtifactSha256:pins.privateArtifactSha256,
  expectedManifestSha256:pins.manifestSha256,
  expectedCheckpointSha256:pins.checkpointSha256,
  legacySeed:seed,now
 });
 need(prepared.rolling.observationDate===pins.observationDate&&
  prepared.rolling.sourceStoredAt===pins.sourceStoredAt&&
  prepared.rolling.lineage.secondarySource===null&&
  prepared.rolling.provisional.points.length===0,
  'OBSERVATION_OR_SOURCE_TIME_PIN_STOP');
 return prepared;
}

// The caller is an already authorized Windows Writer with a separately
// reviewed operator license/price-policy effect. The caller supplies an
// approved READY record and trusted verifier; this function never promotes
// the SHA-checked private draft's rights flags or creates a rights receipt.
export async function runApprovedGmhSevenR178SavedOnce({
 dataRoot,storage,approvedRecord,verifyApprovedEffect,
 readSaved=readPcSavedGmhSeven,readPrivate=readPinnedPrivateGmhSeven,
 now=Date.now()
}={}){
 // No PC source read or D1 query without the approved Writer contract.
 need(typeof verifyApprovedEffect==='function'&&
  approvedRecord&&typeof approvedRecord==='object'&&
  !Array.isArray(approvedRecord)&&
  storage&&typeof storage.readSeed==='function'&&
  typeof storage.read==='function'&&
  typeof storage.replace==='function',
  'NO_APPROVED_WRITER_OR_RECORD');
 const prepared=await preparePinnedGmhSevenR178({
  dataRoot,storage,readSaved,readPrivate,now,
  pins:W03_GMH_SOURCE_PINS
 });
 return publishApprovedGmhSevenR178({
  prepared,record:approvedRecord,storage,verifyApprovedEffect,now
 });
}

// Read-only audit entry: the caller supplies a previously verified legacy seed.
// Deliberately exposes no D1 client, CAS operation, approval flag or provider GET.
// The pinned production snapshot is mandatory; synthetic pins are not accepted.
export async function auditPinnedGmhSevenR178ReadOnly({
 dataRoot,legacySeed,now=Date.now(),
 readSaved=readPcSavedGmhSeven,
 readPrivate=readPinnedPrivateGmhSeven
}={}){
 need(legacySeed&&typeof legacySeed==='object'&&
  !Array.isArray(legacySeed),'READONLY_SEED_REQUIRED');
 const storage=Object.freeze({async readSeed(){return legacySeed;}});
 const prepared=await preparePinnedGmhSevenR178({
  dataRoot,storage,readSaved,readPrivate,now,pins:W03_GMH_SOURCE_PINS
 });
 need(prepared.status==='R178_GMH_ONLY_PRIVATE_DRAFT_NOT_PUBLISHED'&&
  prepared.rolling.publicationAuthorized===false&&
  prepared.rolling.upstreamCommercialRightsVerified===false&&
  prepared.rolling.derivedLicenseVerified===false,
  'READONLY_PRIVATE_STATUS_STOP');
 return Object.freeze({
  status:'PRIVATE_READONLY_AUDIT_NOT_PUBLISHED',
  observationDate:prepared.rolling.observationDate,
  sourceStoredAt:prepared.rolling.sourceStoredAt,
  manifestSha256:W03_GMH_SOURCE_PINS.manifestSha256,
  checkpointSha256:W03_GMH_SOURCE_PINS.checkpointSha256,
  privateArtifactSha256:W03_GMH_SOURCE_PINS.privateArtifactSha256,
  rawFilesRehashedNow:prepared.provenance.rawFilesRehashedNow,
  sourceStoredAtAttestedByManifest:
   prepared.provenance.sourceStoredAtAttestedByManifest,
  verifiedSymbols:prepared.provenance.verifiedSymbols,
  rawPagesVerified:prepared.provenance.rawPagesVerified,
  themeCount:prepared.rolling.themes.length,
  historyPoints:prepared.rolling.themes.reduce(
   (sum,theme)=>sum+theme.history.length,0),
  publicationAuthorized:false
 });
}
