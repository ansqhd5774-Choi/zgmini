// Immutable BEA/FRED unit-profit CSV archive. Collection is separate from D1 publication.
// This module is a library; no capture operation is installed or run by importing it.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildBeaUnitProfitSource,UNIT_PROFIT_CSV,UNIT_PROFIT_SERIES}
  from '../../lib/market-score/earnings-bea-unit-profit-source-r1.mjs';

export const BEA_UNIT_RAW_SCHEMA='earnings-bea-unit-raw-r1-v1';
const SHA=/^[a-f0-9]{64}$/;
const digest=x=>createHash('sha256').update(x).digest('hex');

// Bound all raw archive reads/writes to the approved PC data root.
// A symlinked archive directory or CSV/meta file must not redirect the
// immutable source lookup outside that root.
function checkArchivePath(files,{create=false}={}){
  const root=fs.realpathSync(files.pcBase);
  if(!fs.statSync(root).isDirectory())throw Error('BEA_UNIT_STORED_PATH_UNSAFE');
  let directory=files.pcBase;
  for(const name of ['raw','earnings-bea-unit-profit-r1']){
    directory=path.join(directory,name);
    try{
      const entry=fs.lstatSync(directory);
      if(entry.isSymbolicLink()||!entry.isDirectory())
        throw Error('BEA_UNIT_STORED_PATH_UNSAFE');
    }catch(error){
      if(error.code!=='ENOENT')throw error;
      if(!create)throw Error('BEA_UNIT_STORED_SOURCE_MISSING');
      fs.mkdirSync(directory);
    }
    const real=fs.realpathSync(directory);
    const relative=path.relative(root,real);
    if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))
      throw Error('BEA_UNIT_STORED_PATH_UNSAFE');
  }
}
function checkExistingFile(file){
  let entry;
  try{entry=fs.lstatSync(file);}
  catch(error){
    if(error.code==='ENOENT')throw Error('BEA_UNIT_STORED_SOURCE_MISSING');
    throw error;
  }
  if(entry.isSymbolicLink()||!entry.isFile())
    throw Error('BEA_UNIT_STORED_PATH_UNSAFE');
}

export function beaUnitRawPaths({pcBase,sourceSha}={}){
  if(typeof pcBase!=='string'||!path.isAbsolute(pcBase)||!SHA.test(sourceSha??''))
    throw Error('BEA_UNIT_STORED_SOURCE_PIN_INVALID');
  const archive=path.join(pcBase,'raw','earnings-bea-unit-profit-r1');
  return {pcBase,archive,csv:path.join(archive,sourceSha+'.csv'),
    meta:path.join(archive,sourceSha+'.json')};
}

export function readBeaUnitArchivedSource({pcBase,sourceSha}={}){
  const files=beaUnitRawPaths({pcBase,sourceSha});
  checkArchivePath(files);
  // lstat sees dangling links, unlike existsSync which follows and hides them.
  checkExistingFile(files.csv);
  checkExistingFile(files.meta);
  const bytes=fs.readFileSync(files.csv);
  if(bytes.length<20||bytes.length>100_000||digest(bytes)!==sourceSha)
    throw Error('BEA_UNIT_STORED_SOURCE_HASH_MISMATCH');
  let metadata;
  try{metadata=JSON.parse(fs.readFileSync(files.meta,'utf8'));}
  catch{throw Error('BEA_UNIT_STORED_SOURCE_META_INVALID');}
  if(!metadata||metadata.schemaVersion!==BEA_UNIT_RAW_SCHEMA
    ||metadata.sourceVersion!==sourceSha
    ||metadata.seriesId!==UNIT_PROFIT_SERIES
    ||metadata.sourceUrl!==UNIT_PROFIT_CSV
    ||metadata.filename!==sourceSha+'.csv'
    ||metadata.byteLength!==bytes.length
    ||!Number.isSafeInteger(metadata.sourceStoredAt)||metadata.sourceStoredAt<=0
    ||metadata.sourceRetrievedAt!==new Date(metadata.sourceStoredAt).toISOString())
    throw Error('BEA_UNIT_STORED_SOURCE_META_MISMATCH');
  const payload=buildBeaUnitProfitSource(bytes.toString('utf8'),{
    sourceVersion:sourceSha,sourceStoredAt:metadata.sourceStoredAt});
  return {payload,sourceSha,sourceStoredAt:metadata.sourceStoredAt,files};
}

// Source-owner-only building block for an existing approved collector.
// No executable entrypoint, new CMD, scheduler, D1 call or automatic provider fetch.
export async function captureBeaUnitSourceOnce({pcBase,fetchImpl,storedAt}={}){
  if(typeof fetchImpl!=='function'||!Number.isSafeInteger(storedAt)||storedAt<=0)
    throw Error('BEA_UNIT_CAPTURE_ARGUMENT_INVALID');
  const response=await fetchImpl(UNIT_PROFIT_CSV,{
    headers:{accept:'text/csv'},signal:AbortSignal.timeout(25_000)});
  if(!response?.ok||!response.body)throw Error('BEA_UNIT_SOURCE_HTTP_FAILED');
  // Hash and archive the exact provider response bytes, not a decoded/re-encoded text copy.
  const lengthHeader=response.headers?.get?.('content-length');
  const size=lengthHeader===null||lengthHeader===undefined?null:Number(lengthHeader);
  if(size!==null&&(!Number.isSafeInteger(size)||size<0||size>100_000))
    throw Error('BEA_UNIT_SOURCE_TOO_LARGE');
  if(typeof response.arrayBuffer!=='function')throw Error('BEA_UNIT_SOURCE_HTTP_FAILED');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<20||bytes.length>100_000)throw Error('BEA_UNIT_SOURCE_TOO_LARGE');
  if(size!==null&&size!==bytes.length)throw Error('BEA_UNIT_SOURCE_LENGTH_MISMATCH');
  let content;
  try{content=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}
  catch{throw Error('BEA_UNIT_SOURCE_ENCODING_INVALID');}
  const sourceSha=digest(bytes);
  const files=beaUnitRawPaths({pcBase,sourceSha});
  // Reject incompatible provider changes before adding any local artifact.
  buildBeaUnitProfitSource(content,{sourceVersion:sourceSha,sourceStoredAt:storedAt});
  // Check (or create) each archive directory without following unapproved
  // filesystem links before the first source byte can be written.
  checkArchivePath(files,{create:true});
  // Inspect both names without following links; preserve half-written archives.
  const sourcePresent=[files.csv,files.meta].some(file=>{
    try{fs.lstatSync(file);return true;}
    catch(error){if(error.code==='ENOENT')return false;throw error;}
  });
  if(sourcePresent){
    const previous=readBeaUnitArchivedSource({pcBase,sourceSha});
    return {status:'ALREADY_CAPTURED',sourceSha,
      sourceStoredAt:previous.sourceStoredAt};
  }
  // Exclusive create: never overwrite or silently heal a half-written archive.
  fs.writeFileSync(files.csv,bytes,{flag:'wx'});
  const metadata={schemaVersion:BEA_UNIT_RAW_SCHEMA,sourceVersion:sourceSha,
    seriesId:UNIT_PROFIT_SERIES,sourceUrl:UNIT_PROFIT_CSV,
    filename:sourceSha+'.csv',byteLength:bytes.length,
    sourceStoredAt:storedAt,sourceRetrievedAt:new Date(storedAt).toISOString()};
  fs.writeFileSync(files.meta,JSON.stringify(metadata)+'\n',{flag:'wx'});
  const check=readBeaUnitArchivedSource({pcBase,sourceSha});
  if(check.sourceStoredAt!==storedAt)throw Error('BEA_UNIT_CAPTURE_READBACK_MISMATCH');
  return {status:'SOURCE_STORED_READBACK_VERIFIED',sourceSha,sourceStoredAt:storedAt};
}
