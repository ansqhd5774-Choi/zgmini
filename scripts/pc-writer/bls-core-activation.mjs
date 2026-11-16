// Optional Core/CLI activation of the shared BLS-unregistered protection.
// The ordinary installed Task remains unchanged until an independently
// approved Windows B host seals this exact-source grant in the existing base.
// A grant is NOT an approval: the B host must first verify the immutable B
// effect manifest, all caller coverage and the seeded physical journal. The
// local hashes bind records to one another; they do not authenticate who wrote
// them. The trusted B host must authenticate reviewer-pinned manifest bytes,
// real Writer B provenance and protected file ownership/ACL BEFORE installing
// the seal. No Issue/env/config/locally fabricated file self-authorizes it.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectUnregisteredBlsSlots} from './bls-unregistered-reservation.mjs';

export const BLS_CORE_ACTIVATION_SCHEMA='ZGMINI_BLS_UNREGISTERED_CORE_ACTIVATION_V1';
export const BLS_CORE_ACTIVATION_FILE='bls-unregistered-activation.json';
export const BLS_CORE_APPROVAL_FILE='bls-unregistered-activation-approval.json';
const EXPECTED_WINDOWS_BASE=String.raw`E:\ZGmini\data\pc-writer`;
const EXPECTED_CORE_DB=String.raw`E:\ZGmini\data\pc-writer\storage\core.sqlite`;
const SHA40=/^[a-f0-9]{40}$/;
const SHA256=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CALLERS=['CORE','GROWTH_MONTHLY','R4_ONE_YEAR'];
const KEYS=['schema','candidateSourceSha','installedPreparedSha','writerBRequestId',
 'writerBProvenanceSha256','approvedBase','approvalManifestSha256',
 'seedSha256','coverageAttested','callers','limit24h'];
const APPROVAL_KEYS=['schema','approvalState','scope','sourceRepository','sourceSha',
 'controlSha','coreDatabasePath','runCount','maxBlsRequests','maxDolRequests',
 'maxTotalRequests','blsUnregistered24hLimit','allowProviderCalls',
 'allowLocalRawDbWrites','allowD1Writes','allowSchedulerChanges',
 'allowCoreSourceChanges','maxAutomaticRetries'];
const fail=code=>{const error=Error(code);error.code=code;throw error;};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const isExact=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
  Object.keys(obj).sort().join('|')===[...keys].sort().join('|');
const samePhysical=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;

// Pure contract check shared with the real reader and isolated fixtures.
// Returning a valid grant here alone NEVER authorizes provider I/O.
export function validateBlsCoreActivationRecord({grant,config,sourceSha,seedBytes,approvalBytes,
 provenanceBytes,
  realBase,realApprovedBase}={}){
 if(!isExact(grant,KEYS)||grant.schema!==BLS_CORE_ACTIVATION_SCHEMA||
  !SHA40.test(grant.candidateSourceSha)||
  !SHA40.test(grant.installedPreparedSha)||grant.installedPreparedSha!==sourceSha||
  !UUID.test(grant.writerBRequestId)||!SHA256.test(grant.writerBProvenanceSha256)||
  !Buffer.isBuffer(provenanceBytes)||
  digest(provenanceBytes)!==grant.writerBProvenanceSha256||
  config?.source!==sourceSha||!SHA256.test(grant.approvalManifestSha256)||
  !SHA256.test(grant.seedSha256)||!Buffer.isBuffer(seedBytes)||
  !Buffer.isBuffer(approvalBytes)||digest(approvalBytes)!==grant.approvalManifestSha256||
  digest(seedBytes)!==grant.seedSha256||grant.coverageAttested!==true||
  grant.limit24h!==25||!Array.isArray(grant.callers)||
  JSON.stringify([...grant.callers].sort())!==JSON.stringify(CALLERS)||
  typeof grant.approvedBase!=='string'||!path.isAbsolute(grant.approvedBase)||
  !realBase||!realApprovedBase||!samePhysical(realBase,realApprovedBase))
  fail('BLS_CORE_ACTIVATION_SCOPE_INVALID');
 try{
  const seed=JSON.parse(seedBytes.toString('utf8'));
  if(seed?.schema!=='ZGMINI_BLS_UNREGISTERED_RESERVATIONS_V1'||
    seed.coverageAttested!==true)fail('BLS_CORE_ACTIVATION_SEED_INVALID');
 }catch{fail('BLS_CORE_ACTIVATION_SEED_INVALID');}
 try{
  const approved=JSON.parse(approvalBytes.toString('utf8'));
  if(!isExact(approved,APPROVAL_KEYS)||
    approved.schema!=='ZGMINI_EMPLOYMENT_R6_BACKFILL_B_APPROVAL_V1'||
    approved.approvalState!=='APPROVED_B_ONE_SHOT'||
    approved.scope!=='PC_LOCAL_R6_BACKFILL_RAW_APPEND_ONLY'||
    approved.sourceRepository!=='ansqhd5774-Choi/zgmini'||
    approved.coreDatabasePath!==EXPECTED_CORE_DB||
    approved.sourceSha!==grant.candidateSourceSha||!SHA40.test(approved.controlSha)||
    approved.runCount!==1||approved.maxBlsRequests!==18||
    approved.maxDolRequests!==2||approved.maxTotalRequests!==20||
    approved.blsUnregistered24hLimit!==25||
    approved.allowProviderCalls!==true||approved.allowLocalRawDbWrites!==true||
    approved.allowD1Writes!==false||approved.allowSchedulerChanges!==false||
    approved.allowCoreSourceChanges!==false||approved.maxAutomaticRetries!==0)
   fail('BLS_CORE_ACTIVATION_APPROVAL_SCOPE');
 }catch{fail('BLS_CORE_ACTIVATION_APPROVAL_SCOPE');}
 try{
  const provenance=JSON.parse(provenanceBytes.toString('utf8'));
  if(provenance?.schema!=='ZGMINI_PC_WRITER_B_LOCAL_OVERLAY_PROVENANCE_V1'||
    provenance.mode!=='LOCAL_OVERLAY'||provenance.localOnly!==true||
    provenance.requestId!==grant.writerBRequestId||
    provenance.candidateSourceSha!==grant.candidateSourceSha||
    provenance.preparedLocalSha!==grant.installedPreparedSha||
    provenance.localRef!==`refs/heads/writer-b/${grant.writerBRequestId}`||
    !SHA256.test(provenance.manifestSha)||
    !Array.isArray(provenance.changedPaths)||!Array.isArray(provenance.fileHashes)||
    provenance.changedPaths.length!==provenance.fileHashes.length)
   fail('BLS_CORE_ACTIVATION_PROVENANCE_SCOPE');
 }catch{fail('BLS_CORE_ACTIVATION_PROVENANCE_SCOPE');}
 return grant;
}

function readRegular(base,filename,maxBytes){
 if(typeof filename!=='string'||!filename||path.isAbsolute(filename)||
  filename.split(/[\\/]/).some(x=>!x||x==='.'||x==='..'))
  fail('BLS_CORE_ACTIVATION_FILE_INVALID');
 const file=path.join(base,filename);
 let stat,actual,expected;
 try{
  stat=fs.lstatSync(file);
  const physicalBase=fs.realpathSync.native(base);
  actual=fs.realpathSync.native(file);
  expected=path.join(physicalBase,filename);
  // A parent directory alias/junction would otherwise make lstat(file) look
  // regular while reading bytes from an unrelated trusted-looking location.
  const segments=filename.split(/[\\/]/);
  let parent=base;
  for(const segment of segments.slice(0,-1)){
   parent=path.join(parent,segment);
   const p=fs.lstatSync(parent);
   if(!p.isDirectory()||p.isSymbolicLink())
    fail('BLS_CORE_ACTIVATION_FILE_INVALID');
  }
 }catch(error){
  if(error?.code==='BLS_CORE_ACTIVATION_FILE_INVALID')throw error;
  fail('BLS_CORE_ACTIVATION_FILE_MISSING');
 }
 if(stat.isSymbolicLink()||!stat.isFile()||stat.size<1||stat.size>maxBytes)
  fail('BLS_CORE_ACTIVATION_FILE_INVALID');
 if(!samePhysical(actual,expected))fail('BLS_CORE_ACTIVATION_FILE_INVALID');
 return fs.readFileSync(file);
}

function parseJson(bytes){
 try{return JSON.parse(bytes.toString('utf8'));}
 catch{fail('BLS_CORE_ACTIVATION_JSON_INVALID');}
}

// This is the only production-facing grant resolver. It accepts no Issue JSON,
// environment option, caller-supplied source SHA, mock inspector or arbitrary
// callback. The active Core Task and both backfill CLIs call it internally.
// With no sealed activation file it is a strict legacy no-op; with any present
// but invalid file it fails before database/provider work.
export function resolveBlsCoreActivation(base){
 if(typeof base!=='string'||!base)
  fail('BLS_CORE_ACTIVATION_BASE_INVALID');
 const sealPath=path.join(base,BLS_CORE_ACTIVATION_FILE);
 // existsSync() conflates permission/storage failures with a genuinely absent
 // file. Only ENOENT is legacy OFF; other I/O errors must stop the caller.
 try{fs.lstatSync(sealPath);}
 catch(error){
  if(error?.code==='ENOENT')return undefined;
  fail('BLS_CORE_ACTIVATION_PROOF_UNVERIFIED');
 }
 if(!path.isAbsolute(base))fail('BLS_CORE_ACTIVATION_BASE_INVALID');
 let realBase,realApprovedBase,grant;
 try{
  const grantBytes=readRegular(base,BLS_CORE_ACTIVATION_FILE,16384);
  grant=parseJson(grantBytes);
  const config=parseJson(readRegular(base,'config.json',65536));
  if(typeof grant.approvedBase!=='string'||!path.isAbsolute(grant.approvedBase))
   fail('BLS_CORE_ACTIVATION_BASE_INVALID');
  realBase=fs.realpathSync.native(base);
  realApprovedBase=fs.realpathSync.native(grant.approvedBase);
  if(process.platform==='win32'&&
    path.win32.normalize(realApprovedBase).toLowerCase()!==
    path.win32.normalize(EXPECTED_WINDOWS_BASE).toLowerCase())
   fail('BLS_CORE_ACTIVATION_BASE_INVALID');
  const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const sourceSha=execFileSync('git',['rev-parse','HEAD'],{
   cwd:sourceRoot,encoding:'utf8',windowsHide:true}).trim();
  if(!SHA40.test(sourceSha))fail('BLS_CORE_ACTIVATION_SOURCE_INVALID');
  execFileSync('git',['diff','--quiet','HEAD','--','lib','worker','scripts/pc-writer'],{
   cwd:sourceRoot,stdio:'pipe',windowsHide:true});
  const seedBytes=readRegular(realBase,'bls-unregistered-reservations.json',1024*1024);
  const approvalBytes=readRegular(realBase,BLS_CORE_APPROVAL_FILE,65536);
  if(!UUID.test(grant.writerBRequestId??''))
   fail('BLS_CORE_ACTIVATION_PROVENANCE_SCOPE');
  const provenanceBytes=readRegular(realBase,
   path.join('writer-b-install-once',grant.writerBRequestId,'provenance.json'),65536);
  validateBlsCoreActivationRecord({grant,config,sourceSha,seedBytes,
   approvalBytes,provenanceBytes,realBase,realApprovedBase});
  // The physical reservation inspector validates the immutable seed digest,
  // journal hash, sequence anchor and durable slots under its own lock.
  inspectUnregisteredBlsSlots({base:realBase,approvedBase:realApprovedBase,now:Date.now()});
  return {enabled:true,approvedBase:realApprovedBase};
 }catch(error){
  // Never proceed unprotected after an activation file is observed. Keep the
  // error code bounded; no paths, tokens or raw manifest bytes in the report.
  if(error?.code?.startsWith('BLS_CORE_ACTIVATION_'))throw error;
  fail('BLS_CORE_ACTIVATION_PROOF_UNVERIFIED');
 }
}
