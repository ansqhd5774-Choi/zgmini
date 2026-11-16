import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {BLS_CORE_ACTIVATION_FILE,BLS_CORE_APPROVAL_FILE,
 validateBlsCoreActivationRecord,resolveBlsCoreActivation} from
 '../scripts/pc-writer/bls-core-activation.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceSha='a'.repeat(40);
const installedPreparedSha='c'.repeat(40);
const controlSha='b'.repeat(40);
const writerBRequestId='11111111-1111-4111-8111-111111111111';
const seedBytes=Buffer.from(JSON.stringify({schema:'ZGMINI_BLS_UNREGISTERED_RESERVATIONS_V1',
 coverageAttested:true,requestTimes:[],leases:{}})+'\n');
const approvalBytes=Buffer.from(JSON.stringify({
 schema:'ZGMINI_EMPLOYMENT_R6_BACKFILL_B_APPROVAL_V1',
 approvalState:'APPROVED_B_ONE_SHOT',scope:'PC_LOCAL_R6_BACKFILL_RAW_APPEND_ONLY',
 sourceRepository:'ansqhd5774-Choi/zgmini',sourceSha,controlSha,
 coreDatabasePath:String.raw`E:\ZGmini\data\pc-writer\storage\core.sqlite`,
 runCount:1,maxBlsRequests:18,maxDolRequests:2,maxTotalRequests:20,
 blsUnregistered24hLimit:25,allowProviderCalls:true,allowLocalRawDbWrites:true,
 allowD1Writes:false,allowSchedulerChanges:false,allowCoreSourceChanges:false,
 maxAutomaticRetries:0,
})+'\n');
const provenanceBytes=Buffer.from(JSON.stringify({
 schema:'ZGMINI_PC_WRITER_B_LOCAL_OVERLAY_PROVENANCE_V1',
 mode:'LOCAL_OVERLAY',localOnly:true,requestId:writerBRequestId,
 candidateSourceSha:sourceSha,preparedLocalSha:installedPreparedSha,
 localRef:`refs/heads/writer-b/${writerBRequestId}`,manifestSha:'d'.repeat(64),
 changedPaths:['scripts/pc-writer/collect-local.mjs'],
 fileHashes:[{path:'scripts/pc-writer/collect-local.mjs',change:'M',
  beforeSha256:'e'.repeat(64),afterSha256:'f'.repeat(64)}],
})+'\n');
const makeGrant=base=>({
 schema:'ZGMINI_BLS_UNREGISTERED_CORE_ACTIVATION_V1',
 candidateSourceSha:sourceSha,installedPreparedSha,writerBRequestId,
 writerBProvenanceSha256:digest(provenanceBytes),
 approvedBase:base,approvalManifestSha256:digest(approvalBytes),
 seedSha256:digest(seedBytes),coverageAttested:true,
 callers:['CORE','GROWTH_MONTHLY','R4_ONE_YEAR'],limit24h:25,
});
const fixture=base=>({grant:makeGrant(base),config:{source:installedPreparedSha},
 sourceSha:installedPreparedSha,seedBytes,approvalBytes,provenanceBytes,
 realBase:base,realApprovedBase:base});
const mustStop=code=>error=>error?.code===code;

test('absent sealed grant keeps ordinary CLI inactive, not self-enabled by env',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r6-bls-seal-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const old=process.env.ZGMINI_BLS_UNREGISTERED_ENABLED;
 try{
  process.env.ZGMINI_BLS_UNREGISTERED_ENABLED='true';
  assert.equal(resolveBlsCoreActivation(dir),undefined);
  assert.equal(fs.existsSync(path.join(dir,BLS_CORE_APPROVAL_FILE)),false);
 }finally{
  if(old===undefined)delete process.env.ZGMINI_BLS_UNREGISTERED_ENABLED;
  else process.env.ZGMINI_BLS_UNREGISTERED_ENABLED=old;
 }
});

test('exact approved scope binds source, seed, all three caller IDs and physical base',()=>{
 const base=path.resolve(os.tmpdir(),'r6-physical-base');
 assert.equal(validateBlsCoreActivationRecord(fixture(base)).candidateSourceSha,sourceSha);
 assert.equal(validateBlsCoreActivationRecord(fixture(base)).installedPreparedSha,installedPreparedSha);
 assert.throws(()=>validateBlsCoreActivationRecord({...fixture(base),
  sourceSha:'f'.repeat(40)}),mustStop('BLS_CORE_ACTIVATION_SCOPE_INVALID'));
 assert.throws(()=>validateBlsCoreActivationRecord({...fixture(base),
  seedBytes:Buffer.from('{}')}),mustStop('BLS_CORE_ACTIVATION_SCOPE_INVALID'));
 assert.throws(()=>validateBlsCoreActivationRecord({...fixture(base),
  approvalBytes:Buffer.from('{}')}),mustStop('BLS_CORE_ACTIVATION_SCOPE_INVALID'));
 assert.throws(()=>validateBlsCoreActivationRecord({...fixture(base),
  provenanceBytes:Buffer.from('{}')}),mustStop('BLS_CORE_ACTIVATION_SCOPE_INVALID'));
 assert.throws(()=>validateBlsCoreActivationRecord({...fixture(base),
  grant:{...makeGrant(base),callers:['CORE']}}),mustStop('BLS_CORE_ACTIVATION_SCOPE_INVALID'));
 assert.throws(()=>validateBlsCoreActivationRecord({...fixture(base),
  realApprovedBase:path.resolve(os.tmpdir(),'other')}
 ),mustStop('BLS_CORE_ACTIVATION_SCOPE_INVALID'));
});

test('rejects a correctly-hashed but out-of-scope B approval, including writes',()=>{
 const base=path.resolve(os.tmpdir(),'r6-physical-base');
 const manifest=JSON.parse(approvalBytes.toString('utf8'));
 manifest.allowSchedulerChanges=true;
 const unsafeBytes=Buffer.from(JSON.stringify(manifest)+'\n');
 const grant={...makeGrant(base),approvalManifestSha256:digest(unsafeBytes)};
 assert.throws(()=>validateBlsCoreActivationRecord({...fixture(base),
  approvalBytes:unsafeBytes,grant}),mustStop('BLS_CORE_ACTIVATION_APPROVAL_SCOPE'));
});

test('rejects a correctly-hashed Writer B provenance that maps the wrong candidate',()=>{
 const base=path.resolve(os.tmpdir(),'r6-physical-base');
 const record=JSON.parse(provenanceBytes.toString('utf8'));
 record.candidateSourceSha='e'.repeat(40);
 const wrongBytes=Buffer.from(JSON.stringify(record)+'\n');
 const grant={...makeGrant(base),writerBProvenanceSha256:digest(wrongBytes)};
 assert.throws(()=>validateBlsCoreActivationRecord({...fixture(base),
  provenanceBytes:wrongBytes,grant}),mustStop('BLS_CORE_ACTIVATION_PROVENANCE_SCOPE'));
});

test('a partial or symlinked seal is a STOP before Git, provider or DB',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r6-bls-partial-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const seal=path.join(dir,BLS_CORE_ACTIVATION_FILE);
 fs.writeFileSync(seal,JSON.stringify(makeGrant(dir)));
 assert.throws(()=>resolveBlsCoreActivation(dir),mustStop('BLS_CORE_ACTIVATION_FILE_MISSING'));
 fs.unlinkSync(seal);
 const outside=path.join(dir,'outside.json');
 fs.writeFileSync(outside,JSON.stringify(makeGrant(dir)));
 fs.symlinkSync(outside,seal);
 assert.throws(()=>resolveBlsCoreActivation(dir),mustStop('BLS_CORE_ACTIVATION_FILE_INVALID'));
});

test('all three direct CLIs load the sealed grant; in-process default remains off',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const script=file=>fs.readFileSync(path.join(root,'scripts','pc-writer',file),'utf8');
 const core=script('collect-local.mjs');
 const r4=script('backfill-one-year.mjs');
 const monthly=script('backfill-monthly-one-year.mjs');
 assert.match(core,/blsUnregistered=process\.argv\.includes\('--import-only'\)\?undefined:resolveBlsCoreActivation\(base\)/);
 assert.match(r4,/blsUnregistered:resolveBlsCoreActivation\(base\)/);
 assert.match(monthly,/blsUnregistered:resolveBlsCoreActivation\(base\)/);
 for(const s of [core,r4,monthly]){
  assert.match(s,/blsUnregistered=undefined/);
  assert.doesNotMatch(s,/ZGMINI_BLS_UNREGISTERED_ENABLED/);
 }
 assert.match(script('bls-core-activation.mjs'),/inspectUnregisteredBlsSlots\(/);
});

test('isolated source-verified CLI reader accepts only a fully linked local overlay grant',
 {skip:process.platform==='win32'},async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'r6-bls-core-source-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const dir=path.join(root,'scripts','pc-writer');
  const base=path.join(root,'pc-data');
  fs.mkdirSync(dir,{recursive:true});
  fs.mkdirSync(base);
  const implementation=fs.readFileSync(new URL('../scripts/pc-writer/bls-core-activation.mjs',import.meta.url));
  fs.writeFileSync(path.join(dir,'bls-core-activation.mjs'),implementation);
  fs.writeFileSync(path.join(dir,'bls-unregistered-reservation.mjs'),
   'export const inspectUnregisteredBlsSlots=()=>{globalThis.__r6SealProbe=(globalThis.__r6SealProbe??0)+1;return {used24h:0}};\n');
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  git('init','-q');
  git('add','--','scripts/pc-writer');
  git('-c','user.email=test@example.invalid','-c','user.name=R6Fixture',
   'commit','-qm','sealed-source-fixture');
  const preparedSha=git('rev-parse','HEAD');
  const request='11111111-1111-4111-8111-111111111111';
  const provenance={...JSON.parse(provenanceBytes.toString()),preparedLocalSha:preparedSha};
  const localProvenanceBytes=Buffer.from(JSON.stringify(provenance)+'\n');
  const localGrant={...makeGrant(base),installedPreparedSha:preparedSha,
   writerBProvenanceSha256:digest(localProvenanceBytes)};
  fs.writeFileSync(path.join(base,'config.json'),JSON.stringify({source:preparedSha}));
  fs.writeFileSync(path.join(base,'bls-unregistered-reservations.json'),seedBytes);
  fs.writeFileSync(path.join(base,BLS_CORE_APPROVAL_FILE),approvalBytes);
  fs.mkdirSync(path.join(base,'writer-b-install-once',request),{recursive:true});
  const storedProvenance=path.join(base,'writer-b-install-once',request,'provenance.json');
  fs.writeFileSync(storedProvenance,localProvenanceBytes);
  fs.writeFileSync(path.join(base,BLS_CORE_ACTIVATION_FILE),JSON.stringify(localGrant));
  const imported=await import(pathToFileURL(path.join(dir,'bls-core-activation.mjs')).href);
  try{
   const resolved=imported.resolveBlsCoreActivation(base);
   assert.deepEqual(resolved,{enabled:true,approvedBase:base});
   assert.equal(globalThis.__r6SealProbe,1);
   // A changed local Writer B provenance is never treated as valid activation.
   fs.appendFileSync(storedProvenance,'\n');
   assert.throws(()=>imported.resolveBlsCoreActivation(base),
    mustStop('BLS_CORE_ACTIVATION_SCOPE_INVALID'));
   fs.writeFileSync(storedProvenance,localProvenanceBytes);
   const originalDir=path.join(base,'writer-b-install-once');
   const movedDir=path.join(base,'moved-provenance');
   fs.renameSync(originalDir,movedDir);
   fs.symlinkSync(movedDir,originalDir,'dir');
   assert.throws(()=>imported.resolveBlsCoreActivation(base),
    mustStop('BLS_CORE_ACTIVATION_FILE_INVALID'));
  }finally{delete globalThis.__r6SealProbe;}
 });
