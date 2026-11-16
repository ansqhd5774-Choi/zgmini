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

export function beaUnitRawPaths({pcBase,sourceSha}={}){
  if(typeof pcBase!=='string'||!path.isAbsolute(pcBase)||!SHA.test(sourceSha??''))
    throw Error('BEA_UNIT_STORED_SOURCE_PIN_INVALID');
  const archive=path.join(pcBase,'raw','earnings-bea-unit-profit-r1');
  return {archive,csv:path.join(archive,sourceSha+'.csv'),
    meta:path.join(archive,sourceSha+'.json')};
}

export function readBeaUnitArchivedSource({pcBase,sourceSha}={}){
  const files=beaUnitRawPaths({pcBase,sourceSha});
  if(!fs.existsSync(files.csv)||!fs.existsSync(files.meta))
    throw Error('BEA_UNIT_STORED_SOURCE_MISSING');
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
  const size=Number(response.headers?.get?.('content-length')??0);
  if(!Number.isSafeInteger(size)||size>100_000)throw Error('BEA_UNIT_SOURCE_TOO_LARGE');
  const content=await response.text();
  const bytes=Buffer.from(content,'utf8');
  if(bytes.length<20||bytes.length>100_000)throw Error('BEA_UNIT_SOURCE_TOO_LARGE');
  const sourceSha=digest(bytes);
  const files=beaUnitRawPaths({pcBase,sourceSha});
  // Reject incompatible provider changes before adding any local artifact.
  buildBeaUnitProfitSource(content,{sourceVersion:sourceSha,sourceStoredAt:storedAt});
  if(fs.existsSync(files.csv)||fs.existsSync(files.meta)){
    const previous=readBeaUnitArchivedSource({pcBase,sourceSha});
    return {status:'ALREADY_CAPTURED',sourceSha,
      sourceStoredAt:previous.sourceStoredAt};
  }
  fs.mkdirSync(files.archive,{recursive:true});
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
