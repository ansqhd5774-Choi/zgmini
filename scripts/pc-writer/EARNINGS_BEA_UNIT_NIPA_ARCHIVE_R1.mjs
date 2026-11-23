// Source-owner-only immutable BEA NIPA JSON archive. No network, CLI or D1 entrypoint.
import fs from 'node:fs';
import path from 'node:path';
import {inspectBeaUnitNipaRawJson} from './EARNINGS_BEA_UNIT_NIPA_EQUIVALENCE_R1.mjs';

export const BEA_NIPA_ARCHIVE_SCHEMA='earnings-bea-unit-nipa-raw-r1-v1';
const PIN=/^[a-f0-9]{64}$/;
const PARTS=['raw','earnings-bea-unit-nipa-r1'];
const err=code=>{throw Error('BEA_UNIT_NIPA_ARCHIVE_'+code);};

export function beaUnitNipaArchivePaths({pcBase,sourceSha}={}){
  if(typeof pcBase!=='string'||!path.isAbsolute(pcBase)||!PIN.test(sourceSha??''))
    err('PIN_INVALID');
  const archive=path.join(pcBase,...PARTS);
  return {archive,raw:path.join(archive,sourceSha+'.json'),
    meta:path.join(archive,sourceSha+'.meta.json')};
}

function guardFolder(pcBase,{create=false}={}){
  if(typeof pcBase!=='string'||!path.isAbsolute(pcBase))err('ROOT_INVALID');
  const root=fs.realpathSync(pcBase);
  if(!fs.statSync(root).isDirectory())err('ROOT_INVALID');
  let folder=pcBase;
  for(const name of PARTS){
    folder=path.join(folder,name);
    let info;
    try{info=fs.lstatSync(folder);}
    catch(e){
      if(e.code!=='ENOENT')throw e;
      if(!create)err('MISSING');
      fs.mkdirSync(folder);
      info=fs.lstatSync(folder);
    }
    if(info.isSymbolicLink()||!info.isDirectory())err('PATH_UNSAFE');
    const resolved=fs.realpathSync(folder);
    const relative=path.relative(root,resolved);
    if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))
      err('PATH_UNSAFE');
  }
}
function statRaw(file,maxBytes){
  let info;
  try{info=fs.lstatSync(file);}
  catch(e){if(e.code==='ENOENT')err('MISSING');throw e;}
  if(info.isSymbolicLink()||!info.isFile())err('PATH_UNSAFE');
  if(!Number.isSafeInteger(info.size)||info.size>maxBytes)err('TOO_LARGE');
}
function present(file){
  try{fs.lstatSync(file);return true;}
  catch(e){if(e.code==='ENOENT')return false;throw e;}
}

export function readBeaUnitNipaArchive({pcBase,sourceSha}={}){
  const files=beaUnitNipaArchivePaths({pcBase,sourceSha});
  guardFolder(pcBase);
  statRaw(files.raw,2_000_000);
  statRaw(files.meta,10_000);
  const rawBytes=fs.readFileSync(files.raw);
  let meta;
  try{meta=JSON.parse(fs.readFileSync(files.meta,'utf8'));}
  catch{err('METADATA_INVALID');}
  if(meta?.schemaVersion!==BEA_NIPA_ARCHIVE_SCHEMA||
     meta.sourceVersion!==sourceSha||meta.transport!=='BEA_API_JSON'||
     meta.dataset!=='NIPA'||meta.tableName!=='T11500'||
     meta.seriesCode!=='A463RD'||meta.lineNumber!=='7'||
     meta.frequency!=='Q'||meta.file!==sourceSha+'.json'||
     meta.sourceByteLength!==rawBytes.length||
     !Number.isSafeInteger(meta.sourceStoredAt)||meta.sourceStoredAt<=0||
     meta.sourceRetrievedAt!==new Date(meta.sourceStoredAt).toISOString())
    err('METADATA_MISMATCH');
  const preview=inspectBeaUnitNipaRawJson({
    rawBytes,sourceStoredAt:meta.sourceStoredAt});
  if(preview.sourceVersion!==sourceSha||
     preview.observedThrough!==meta.observedThrough)
    err('SOURCE_MISMATCH');
  return {status:'SOURCE_READBACK_VERIFIED',
    sourceVersion:sourceSha,sourceStoredAt:meta.sourceStoredAt,
    observedThrough:preview.observedThrough,preview};
}

// Caller supplies already acquired bytes under its own approved source-owner contract.
// No implicit HTTP call, retries, directory reset or D1 publication.
export function saveBeaUnitNipaArchive({pcBase,rawBytes,sourceStoredAt}={}){
  const preview=inspectBeaUnitNipaRawJson({rawBytes,sourceStoredAt});
  const sourceSha=preview.sourceVersion;
  const files=beaUnitNipaArchivePaths({pcBase,sourceSha});
  guardFolder(pcBase,{create:true});
  if(present(files.raw)||present(files.meta)){
    const existing=readBeaUnitNipaArchive({pcBase,sourceSha});
    return {status:'ALREADY_CAPTURED',sourceVersion:sourceSha,
      sourceStoredAt:existing.sourceStoredAt,observedThrough:existing.observedThrough};
  }
  const meta={
    schemaVersion:BEA_NIPA_ARCHIVE_SCHEMA,transport:'BEA_API_JSON',
    dataset:'NIPA',tableName:'T11500',seriesCode:'A463RD',
    lineNumber:'7',frequency:'Q',sourceVersion:sourceSha,
    sourceStoredAt,sourceRetrievedAt:new Date(sourceStoredAt).toISOString(),
    observedThrough:preview.observedThrough,sourceByteLength:rawBytes.byteLength,
    file:sourceSha+'.json'
  };
  // Exclusive create. If second write fails, preserve partial archive for diagnosis.
  fs.writeFileSync(files.raw,rawBytes,{flag:'wx'});
  fs.writeFileSync(files.meta,JSON.stringify(meta)+'\n',{flag:'wx'});
  const readback=readBeaUnitNipaArchive({pcBase,sourceSha});
  if(readback.sourceStoredAt!==sourceStoredAt)err('READBACK_MISMATCH');
  return {status:'SOURCE_STORED_READBACK_VERIFIED',sourceVersion:sourceSha,
    sourceStoredAt,observedThrough:readback.observedThrough};
}
