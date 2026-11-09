// Optional single-use writer for an APPROVED, already-held Writer-B maintenance
// lease. It is intentionally not a CLI, scheduled job, or Core retry adapter.
// The caller must verify the B manifest and own the shared lane before invoking.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {
  parseOfficialBlsHousingFlatfile,parseOfficialCensusInventoryWorkbook,
  planOfficialManualCandidateDocuments,
} from './inflation-causal-candidate-manual-official-r1.mjs';

export const MANUAL_STORE_OPERATION='inflation-causal-candidate-manual-official-store-r1';
const DIRECTORY='inflation-causal-candidates-r1';
const TARGETS={
  bls:'bls-cpi-ppi3.json',
  census:'census-m3-manufacturing-inventories.json',
};
const fail=code=>{const error=new Error(code);error.code=code;throw error;};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const safeDirectory=dir=>{try{const s=fs.lstatSync(dir);return s.isDirectory()&&!s.isSymbolicLink();}catch{return false;}};
const safeFile=file=>{try{const s=fs.lstatSync(file);return s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<=24_000_000;}catch{return false;}};

function approvedBase(base){
  if(typeof base!=='string'||!path.isAbsolute(base)||
    path.basename(path.resolve(base)).toLowerCase()!=='pc-writer'||
    !safeDirectory(base))fail('INFL_MANUAL_STORE_PC_BASE_DENIED');
  return fs.realpathSync.native(base);
}
function existingSource(directory,name){
  if(!fs.existsSync(directory))return null;
  if(!safeDirectory(directory))fail('INFL_MANUAL_STORE_SOURCE_DIRECTORY_UNSAFE');
  const file=path.join(directory,name);
  if(!fs.existsSync(file))return null;
  if(!safeFile(file))fail('INFL_MANUAL_STORE_EXISTING_FILE_UNSAFE');
  try{return JSON.parse(fs.readFileSync(file,'utf8'));}
  catch{fail('INFL_MANUAL_STORE_EXISTING_JSON_INVALID');}
}
function childDirectory(parent,name){
  const child=path.join(parent,name);
  if(fs.existsSync(child)&&!safeDirectory(child))fail('INFL_MANUAL_STORE_DIRECTORY_UNSAFE');
  if(!fs.existsSync(child))fs.mkdirSync(child);
  if(!safeDirectory(child))fail('INFL_MANUAL_STORE_DIRECTORY_UNSAFE');
  return child;
}
function readback(file,expectedHash){
  if(!safeFile(file)||sha(fs.readFileSync(file))!==expectedHash)
    fail('INFL_MANUAL_STORE_READBACK_FAILED');
}
function writeArchive(directory,relative,bytes){
  const raw=childDirectory(directory,'raw');
  const file=path.join(raw,path.basename(relative));
  const expected=sha(bytes);
  if(!fs.existsSync(file)){
    try{fs.writeFileSync(file,bytes,{flag:'wx'});}
    catch(error){if(error.code!=='EEXIST')throw error;}
  }
  readback(file,expected);
  return {file,hash:expected};
}
function createBackup(directory,name){
  const original=path.join(directory,name);
  if(!fs.existsSync(original))return null;
  if(!safeFile(original))fail('INFL_MANUAL_STORE_EXISTING_FILE_UNSAFE');
  const backupDir=childDirectory(directory,'manual-official-backups');
  const backup=path.join(backupDir,`${name}.${randomUUID()}.bak`);
  fs.copyFileSync(original,backup,fs.constants.COPYFILE_EXCL);
  readback(backup,sha(fs.readFileSync(original)));
  return backup;
}
function writeDocument(directory,name,doc){
  const destination=path.join(directory,name);
  if(fs.existsSync(destination)&&!safeFile(destination))
    fail('INFL_MANUAL_STORE_EXISTING_FILE_UNSAFE');
  const backup=createBackup(directory,name);
  const bytes=Buffer.from(JSON.stringify(doc)),expected=sha(bytes);
  const temp=path.join(directory,`${name}.next-${randomUUID()}`);
  fs.writeFileSync(temp,bytes,{flag:'wx'});
  try{
    readback(temp,expected);
    fs.renameSync(temp,destination);
    readback(destination,expected);
  }catch(error){
    // A failed rename/readback is reported with the backup location; never
    // silently roll back another feature's concurrent operation or delete data.
    if(fs.existsSync(temp))try{fs.unlinkSync(temp);}catch{}
    fail('INFL_MANUAL_STORE_DOCUMENT_WRITE_FAILED');
  }
  return {sha256:expected,backup};
}

// Read-only against PC state. Also returns exact proposed archive/file names.
export async function prepareOfficialManualStore({base,blsBytes,censusBytes,
  now=new Date(),readWorkbook}={}){
  const home=approvedBase(base),directory=path.join(home,DIRECTORY);
  const [bls,census]=await Promise.all([
    Promise.resolve().then(()=>parseOfficialBlsHousingFlatfile(blsBytes)),
    parseOfficialCensusInventoryWorkbook(censusBytes,{readWorkbook}),
  ]);
  const plan=planOfficialManualCandidateDocuments({bls,census,
    previousBls:existingSource(directory,TARGETS.bls),
    previousCensus:existingSource(directory,TARGETS.census),now});
  return {status:plan.status,sourceSha256s:{bls:bls.sourceSha256,census:census.sourceSha256},
    latest:{bls:bls.latestBySeries,census:census.latest},
    targets:Object.fromEntries(Object.entries(TARGETS).map(([key,name])=>[key,path.join(directory,name)])),
    plan};
}

// The approved Controller/Writer B integration supplies an actual maintenance
// lease handler; a plain permission flag is intentionally insufficient.
export async function applyOfficialManualStore({base,blsBytes,censusBytes,
  now=new Date(),readWorkbook,withApprovedWriterB}={}){
  if(typeof withApprovedWriterB!=='function')fail('INFL_MANUAL_STORE_WRITER_B_LEASE_REQUIRED');
  const home=approvedBase(base);
  let entered=false;
  const outcome=await withApprovedWriterB({operation:MANUAL_STORE_OPERATION,
    targets:Object.values(TARGETS).map(name=>path.join(home,DIRECTORY,name))},async lease=>{
    if(entered||lease?.scope!=='APPROVED_WRITER_B'||
      typeof lease.requestId!=='string'||!lease.requestId.trim())
      fail('INFL_MANUAL_STORE_WRITER_B_LEASE_INVALID');
    entered=true;
    // Re-read existing state and plan INSIDE the shared write lease.
    const prepared=await prepareOfficialManualStore({base:home,blsBytes,censusBytes,now,readWorkbook});
    if(prepared.status==='UNCHANGED')return {status:'UNCHANGED',stored:false,
      requestId:lease.requestId,latest:prepared.latest};
    const directory=childDirectory(home,DIRECTORY);
    const archives={
      bls:writeArchive(directory,prepared.plan.expectedRawArchives.bls.archive,blsBytes),
      census:writeArchive(directory,prepared.plan.expectedRawArchives.census.archive,censusBytes),
    };
    const writes={};
    for(const key of ['bls','census']){
      if(!prepared.plan.writes[key])continue;
      writes[key]=writeDocument(directory,TARGETS[key],prepared.plan.documents[key]);
    }
    return {status:'SAVED_READBACK',stored:true,requestId:lease.requestId,
      sourceStoredAt:Object.fromEntries(Object.entries(writes).map(([key])=>[
        key,prepared.plan.documents[key].sourceStoredAt])),
      archives,writes,latest:prepared.latest,
      apiCalls:0,dbWrites:0,d1Writes:0,coreCheckpointWrites:0};
  });
  if(!entered)fail('INFL_MANUAL_STORE_WRITER_B_LEASE_NOT_ENTERED');
  return outcome;
}
