// Source-owner-only immutable BEA NIPA JSON archive. No network, CLI or D1 entrypoint.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
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
     !PIN.test(meta.sourceHttpSha256??'')||
     meta.storageScope!=='BEA_RESULTS_DATA_ONLY'||
     meta.sourceVersion!==sourceSha||meta.transport!=='BEA_API_JSON'||
     meta.dataset!=='NIPA'||meta.tableName!=='T11500'||
     meta.seriesCode!=='A463RD'||meta.lineNumber!=='7'||
     meta.frequency!=='Q'||meta.file!==sourceSha+'.json'||
     meta.sourceByteLength!==rawBytes.length||
     !Number.isSafeInteger(meta.sourceStoredAt)||meta.sourceStoredAt<=0||
     meta.sourceRetrievedAt!==new Date(meta.sourceStoredAt).toISOString())
    err('METADATA_MISMATCH');
  // Persistent bytes must contain public statistical results only. The BEA
  // response's Request.RequestParam can echo the credential-bearing USERID.
  let stored;
  try{stored=JSON.parse(rawBytes.toString('utf8'));}
  catch{err('SOURCE_MISMATCH');}
  if(!stored?.BEAAPI||Object.keys(stored.BEAAPI).length!==1||
     !stored.BEAAPI.Results||Object.keys(stored.BEAAPI.Results).length!==1||
     !Array.isArray(stored.BEAAPI.Results.Data))err('SOURCE_MISMATCH');
  const preview=inspectBeaUnitNipaRawJson({
    rawBytes,sourceStoredAt:meta.sourceStoredAt});
  if(preview.sourceVersion!==sourceSha||
     preview.observedThrough!==meta.observedThrough)
    err('SOURCE_MISMATCH');
  return {status:'SOURCE_READBACK_VERIFIED',
    sourceVersion:sourceSha,sourceStoredAt:meta.sourceStoredAt,
    observedThrough:preview.observedThrough,sourceHttpSha256:meta.sourceHttpSha256,preview};
}

// Offline calculation only from the exact persisted source SHA. This is not the
// approved FRED_CSV public projection and never calls a D1 writer or provider.
export function computeBeaUnitNipaStoredPreview({pcBase,sourceSha}={}){
  const archive=readBeaUnitNipaArchive({pcBase,sourceSha});
  const recent=archive.preview.recent;
  const current=recent.at(-1),previous=recent.at(-2);
  const history=Object.freeze(recent.map(point=>Object.freeze({
    period:point.quarter,value:point.value
  })));
  return Object.freeze({
    status:'STORED_SOURCE_CALCULATED',transport:'BEA_API_JSON',
    schemaVersion:'earnings-bea-unit-nipa-stored-preview-r1-v1',
    sourceVersion:archive.sourceVersion,
    sourceStoredAt:archive.sourceStoredAt,
    observationPeriodEnd:archive.observedThrough,
    unit:'USD_PER_REAL_GVA_UNIT',
    currentValue:current.value,previousValue:previous.value,
    change:current.value-previous.value,history
  });
}

// Caller supplies already acquired bytes under its own approved source-owner contract.
// No implicit HTTP call, retries, directory reset or D1 publication.
export function saveBeaUnitNipaArchive({pcBase,rawBytes,sourceStoredAt}={}){
  // Validate the source response first, then persist ONLY statistical rows.
  // BEA echoes USERID in Request.RequestParam: never store raw response or
  // return its body. Preserve the HTTP bytes' SHA independently as evidence.
  inspectBeaUnitNipaRawJson({rawBytes,sourceStoredAt});
  const original=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(rawBytes));
  const sourceHttpSha256=createHash('sha256').update(rawBytes).digest('hex');
  const storedBytes=Buffer.from(JSON.stringify({BEAAPI:{Results:{
    Data:original.BEAAPI.Results.Data
  }}}),'utf8');
  const preview=inspectBeaUnitNipaRawJson({rawBytes:storedBytes,sourceStoredAt});
  const sourceSha=preview.sourceVersion;
  const files=beaUnitNipaArchivePaths({pcBase,sourceSha});
  guardFolder(pcBase,{create:true});
  if(present(files.raw)||present(files.meta)){
    const existing=readBeaUnitNipaArchive({pcBase,sourceSha});
    return {status:'ALREADY_CAPTURED',sourceVersion:sourceSha,
      sourceStoredAt:existing.sourceStoredAt,observedThrough:existing.observedThrough,
      sourceHttpSha256:existing.sourceHttpSha256};
  }
  const meta={
    schemaVersion:BEA_NIPA_ARCHIVE_SCHEMA,transport:'BEA_API_JSON',
    storageScope:'BEA_RESULTS_DATA_ONLY',sourceHttpSha256,
    dataset:'NIPA',tableName:'T11500',seriesCode:'A463RD',
    lineNumber:'7',frequency:'Q',sourceVersion:sourceSha,
    sourceStoredAt,sourceRetrievedAt:new Date(sourceStoredAt).toISOString(),
    observedThrough:preview.observedThrough,sourceByteLength:storedBytes.byteLength,
    file:sourceSha+'.json'
  };
  // Exclusive create. If second write fails, preserve partial archive for diagnosis.
  fs.writeFileSync(files.raw,storedBytes,{flag:'wx'});
  fs.writeFileSync(files.meta,JSON.stringify(meta)+'\n',{flag:'wx'});
  const readback=readBeaUnitNipaArchive({pcBase,sourceSha});
  if(readback.sourceStoredAt!==sourceStoredAt)err('READBACK_MISMATCH');
  return {status:'SOURCE_STORED_READBACK_VERIFIED',sourceVersion:sourceSha,
    sourceStoredAt,observedThrough:readback.observedThrough,sourceHttpSha256};
}
