// BEA NIPA T11500/Q immutable private raw JSON archive, library only.
// No entrypoint, auto collector, new Task, D1 or public raw exposure.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {beaUnitNipaRequestSpec,inspectBeaUnitNipaRawJson}
  from './EARNINGS_BEA_UNIT_NIPA_EQUIVALENCE_R1.mjs';

export const BEA_UNIT_NIPA_RAW_SCHEMA='earnings-bea-unit-nipa-raw-r1-v1';
const ROOT_PARTS=['raw','earnings-bea-unit-nipa-r1'];
const ENDPOINT='https://apps.bea.gov/api/data';
const SHA=/^[a-f0-9]{64}$/;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const bad=code=>{throw Error('BEA_UNIT_NIPA_'+code);};

function checkedRoot(pcBase){
  if(typeof pcBase!=='string'||!path.isAbsolute(pcBase))bad('ROOT_INVALID');
  const root=fs.realpathSync(pcBase);
  if(path.basename(root).toLowerCase()!=='pc-writer'||
     path.basename(path.dirname(root)).toLowerCase()!=='data'||
     path.basename(path.dirname(path.dirname(root))).toLowerCase()!=='zgmini')
    bad('ROOT_INVALID');
  if(!fs.statSync(root).isDirectory())bad('ROOT_INVALID');
  return root;
}
function archiveDir(root,{create=false}={}){
  let current=root;
  for(const segment of ROOT_PARTS){
    current=path.join(current,segment);
    let s;
    try{s=fs.lstatSync(current);}
    catch(e){
      if(e?.code!=='ENOENT')throw e;
      if(!create)return null;
      fs.mkdirSync(current);
      s=fs.lstatSync(current);
    }
    if(!s.isDirectory()||s.isSymbolicLink())bad('PATH_UNSAFE');
  }
  return current;
}
function checkedFile(file,max){
  let s;
  try{s=fs.lstatSync(file);}catch(e){
    if(e?.code==='ENOENT')bad('SOURCE_MISSING');
    throw e;
  }
  if(!s.isFile()||s.isSymbolicLink())bad('PATH_UNSAFE');
  if(s.size<20||s.size>max)bad('FILE_SIZE_INVALID');
}
export function beaUnitNipaRawPaths({pcBase,sourceSha}={}){
  if(!SHA.test(sourceSha??''))bad('SOURCE_PIN_INVALID');
  const root=checkedRoot(pcBase);
  const dir=path.join(root,...ROOT_PARTS);
  return Object.freeze({root,dir,raw:path.join(dir,sourceSha+'.json'),
    meta:path.join(dir,sourceSha+'.meta.json')});
}
export function readBeaUnitNipaRawArchive({pcBase,sourceSha}={}){
  const files=beaUnitNipaRawPaths({pcBase,sourceSha});
  if(!archiveDir(files.root))bad('SOURCE_MISSING');
  checkedFile(files.raw,2_000_000);
  checkedFile(files.meta,10_000);
  const bytes=fs.readFileSync(files.raw);
  if(digest(bytes)!==sourceSha)bad('SHA_MISMATCH');
  let meta;
  try{meta=JSON.parse(fs.readFileSync(files.meta,'utf8'));}
  catch{bad('META_INVALID');}
  if(!meta||meta.schemaVersion!==BEA_UNIT_NIPA_RAW_SCHEMA||
    meta.sourceVersion!==sourceSha||meta.filename!==sourceSha+'.json'||
    meta.sourceByteLength!==bytes.length||meta.sourceUrl!==ENDPOINT||
    meta.dataset!=='NIPA'||meta.tableName!=='T11500'||
    meta.seriesCode!=='A463RD'||meta.lineNumber!=='7'||
    meta.frequency!=='Q'||!Number.isSafeInteger(meta.sourceStoredAt)||
    meta.sourceStoredAt<=0||meta.sourceStoredAt>Date.now()||
    meta.sourceRetrievedAt!==new Date(meta.sourceStoredAt).toISOString())
    bad('META_MISMATCH');
  const result=inspectBeaUnitNipaRawJson({rawBytes:bytes,
    sourceStoredAt:meta.sourceStoredAt});
  if(result.sourceVersion!==sourceSha||result.observedThrough!==meta.observedThrough)
    bad('META_MISMATCH');
  return Object.freeze({status:'SOURCE_STORED_READBACK_VERIFIED',
    sourceSha,sourceStoredAt:meta.sourceStoredAt,observedThrough:result.observedThrough,
    verifiedQuarters:result.recent.length,transport:'BEA_API_JSON'});
}

// To be called only by an approved existing PC source owner / collector.
// A pinned archive returns offline without contacting the provider.
export async function captureBeaUnitNipaOnce({
  pcBase,fetchImpl,beaApiKey,observationYear,storedAt=Date.now(),sourceSha
}={}){
  if(sourceSha!==undefined){
    const old=readBeaUnitNipaRawArchive({pcBase,sourceSha});
    return Object.freeze({status:'ALREADY_CAPTURED',sourceSha,
      sourceStoredAt:old.sourceStoredAt,providerCalls:0,operationalWrites:0});
  }
  if(typeof fetchImpl!=='function'||typeof beaApiKey!=='string'||
    !/^[a-fA-F0-9-]{36}$/.test(beaApiKey)||
    !Number.isSafeInteger(storedAt)||storedAt<=0||storedAt>Date.now())
    bad('CAPTURE_ARGUMENT_INVALID');
  const root=checkedRoot(pcBase);
  // Validate pre-existing dirs before any approved GET. Missing dirs are normal.
  archiveDir(root);
  const spec=beaUnitNipaRequestSpec({observationYear});
  const url=new URL(ENDPOINT);
  for(const [key,val] of Object.entries({UserID:beaApiKey,...spec}))
    url.searchParams.set(key,String(val));
  let response,bytes;
  try{
    response=await fetchImpl(url.toString(),{headers:{accept:'application/json'},
      signal:AbortSignal.timeout(25_000)});
    if(!response?.ok||typeof response.arrayBuffer!=='function')
      bad('SOURCE_HTTP_FAILED');
    const length=response.headers?.get?.('content-length');
    const declared=length==null?null:Number(length);
    const encoding=String(response.headers?.get?.('content-encoding')??'').toLowerCase().trim();
    if(!['','identity','gzip','br','deflate'].includes(encoding)||
      declared!==null&&(!Number.isSafeInteger(declared)||declared<0||
        declared>2_000_000))bad('SOURCE_HEADER_INVALID');
    bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length<20||bytes.length>2_000_000||
      declared!==null&&(!encoding||encoding==='identity')&&bytes.length!==declared)
      bad('SOURCE_SIZE_INVALID');
  }catch{bad('SOURCE_HTTP_FAILED');} // Never emit a credential-bearing URL.
  const inspected=inspectBeaUnitNipaRawJson({rawBytes:bytes,sourceStoredAt:storedAt});
  const files=beaUnitNipaRawPaths({pcBase,sourceSha:inspected.sourceVersion});
  archiveDir(files.root,{create:true});
  let present=false;
  for(const file of [files.raw,files.meta]){
    try{fs.lstatSync(file);present=true;}
    catch(e){if(e?.code!=='ENOENT')throw e;}
  }
  if(present){
    const previous=readBeaUnitNipaRawArchive({pcBase,
      sourceSha:inspected.sourceVersion});
    return Object.freeze({status:'ALREADY_CAPTURED',
      sourceSha:inspected.sourceVersion,sourceStoredAt:previous.sourceStoredAt,
      providerCalls:1,operationalWrites:0});
  }
  // Exclusive creates; partial files are never silently overwritten or removed.
  fs.writeFileSync(files.raw,bytes,{flag:'wx'});
  const meta={
    schemaVersion:BEA_UNIT_NIPA_RAW_SCHEMA,
    sourceVersion:inspected.sourceVersion,
    filename:path.basename(files.raw),
    sourceByteLength:bytes.length,
    sourceUrl:ENDPOINT,
    dataset:'NIPA',tableName:'T11500',seriesCode:'A463RD',lineNumber:'7',
    frequency:'Q',observedThrough:inspected.observedThrough,
    sourceStoredAt:storedAt,sourceRetrievedAt:new Date(storedAt).toISOString()
  };
  fs.writeFileSync(files.meta,JSON.stringify(meta)+'\n',{flag:'wx'});
  const verified=readBeaUnitNipaRawArchive({pcBase,sourceSha:inspected.sourceVersion});
  if(verified.sourceStoredAt!==storedAt)bad('READBACK_MISMATCH');
  return Object.freeze({...verified,providerCalls:1,operationalWrites:2});
}
