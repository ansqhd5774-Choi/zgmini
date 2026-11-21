// W03 immutable PC GMH manifest/checkpoint -> existing pure 14-symbol scorer.
// Inputs are caller-supplied authenticated Buffer bytes from an APPROVED reader.
// No filesystem, network, publisher, scheduling, or source-rights changes.
import {createHash} from 'node:crypto';
import {GMH_SEVEN_SYMBOLS,calculateGmhSevenPrivate252}
 from './theme-gmh-seven-private-bridge.mjs';

export const GMH_SEVEN_SAVED_SCHEMA='GMH_SEVEN_1H_SAVED_RAW_V1';
const SHA=/^[a-f0-9]{64}$/;
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Object.assign(Error('W03_SAVED_'+code),
 {code:'W03_SAVED_'+code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
function decode(bytes,expected,limit,code){
 need(Buffer.isBuffer(bytes)&&bytes.length>1&&bytes.length<=limit&&
  SHA.test(expected??'')&&hash(bytes)===expected,code);
 try{return JSON.parse(bytes.toString('utf8'));}
 catch{fail(code);}
}
function checkedManifest(m){
 need(m?.schema===GMH_SEVEN_SAVED_SCHEMA&&m.version===1&&
  day(m.start)&&day(m.end)&&m.start<=m.end&&
  Array.isArray(m.files)&&m.files.length>=GMH_SEVEN_SYMBOLS.length&&
  m.files.length<=256,'MANIFEST_CONTRACT');
 const entries=new Map();
 for(const e of m.files){
  need(e&&GMH_SEVEN_SYMBOLS.includes(e.symbol)&&
   SHA.test(e.sha256??'')&&
   e.path==='raw/'+e.symbol+'_'+e.sha256+'.jsonl'&&
   e.source==='GETMARKETHISTORY_FREE_1H'&&
   e.priceMode==='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'&&
   Number.isSafeInteger(e.rowCount)&&e.rowCount>0&&e.rowCount<=5000&&
   day(e.observationFrom)&&day(e.observationThrough)&&
   !entries.has(e.path),'MANIFEST_FILE_CONTRACT');
  entries.set(e.path,e);
 }
 need(GMH_SEVEN_SYMBOLS.every(s=>m.files.some(f=>f.symbol===s)),
  'FOURTEEN_SYMBOL_MANIFEST_INCOMPLETE');
 return entries;
}
function checkedState(cp,manifest,entries){
 need(cp?.schema===GMH_SEVEN_SAVED_SCHEMA&&cp.version===1&&
  cp.start===manifest.start&&cp.end===manifest.end&&
  !cp.failedAt&&cp.symbols&&
  Object.keys(cp.symbols).length===GMH_SEVEN_SYMBOLS.length,
  'CHECKPOINT_IDENTITY_OR_FAILURE');
 const refs=new Set();
 for(const symbol of GMH_SEVEN_SYMBOLS){
  const v=cp.symbols[symbol];
  need(v?.complete===true&&Array.isArray(v.files)&&v.files.length>0&&
   v.files.length<=256&&
   Number.isSafeInteger(v.pages)&&v.pages>=v.files.length&&
   (v.cursor===null||v.cursor===undefined),
   'CHECKPOINT_NOT_COMPLETE');
  for(const ref of v.files){
   const file=entries.get(ref?.path);
   need(file&&file.symbol===symbol&&file.sha256===ref.sha256&&
    !refs.has(ref.path),'CHECKPOINT_PAGE_REFERENCE');
   refs.add(ref.path);
  }
 }
 need(refs.size===entries.size,'CHECKPOINT_MANIFEST_PAGE_MISMATCH');
}
function combinePages(entries,pages){
 need(Array.isArray(pages)&&pages.length===entries.size&&
  pages.every(p=>p&&typeof p.path==='string'&&Buffer.isBuffer(p.bytes)),
  'SAVED_PAGES_REQUIRED');
 const supplied=new Map();
 for(const page of pages){
  const ref=entries.get(page.path);
  need(ref&&!supplied.has(page.path)&&
   page.bytes.length>0&&page.bytes.length<=6_000_000&&
   hash(page.bytes)===ref.sha256,'SAVED_PAGE_SHA_OR_IDENTITY');
  const text=page.bytes.toString('utf8');
  need(!text.includes('\0')&&Buffer.from(text,'utf8').equals(page.bytes)&&
   text.split(/\r?\n/).filter(Boolean).length===ref.rowCount,
   'SAVED_PAGE_ROWS');
  supplied.set(page.path,page.bytes);
 }
 const result=[];
 for(const symbol of GMH_SEVEN_SYMBOLS){
  const blobs=[...entries.values()].filter(e=>e.symbol===symbol)
   .map(e=>supplied.get(e.path));
  const joined=Buffer.concat(blobs.flatMap((b,i)=>i===0?[b]:[
   blobs[i-1].at(-1)===10?Buffer.alloc(0):Buffer.from('\n'),b]));
  need(joined.length>0&&joined.length<=20_000_000,
   'COMBINED_SOURCE_LIMIT');
  result.push({symbol,format:'jsonl',
   provider:'GETMARKETHISTORY_STOCKS_US_1H',
   bytes:joined,sha256:hash(joined)});
 }
 return result;
}
// Bind source time to the immutable collector's actual request-time receipts.
// The same manifest, completed checkpoint and all page SHA bytes accepted by
// the existing saved-score input are verified before a timestamp is trusted.
// collectedAt is the provider GET request start, not the later file commit.
export function attestSavedGmhSevenCollectionTime({
 manifestBytes,manifestSha256,checkpointBytes,checkpointSha256,
 rawPages,observationDate,now=Date.now()
}={}){
 need(day(observationDate)&&Number.isSafeInteger(now),
  'COLLECTION_OBSERVATION_OR_CLOCK');
 const manifest=decode(manifestBytes,manifestSha256,4_000_000,
  'MANIFEST_SHA_OR_BYTES');
 const checkpoint=decode(checkpointBytes,checkpointSha256,2_000_000,
  'CHECKPOINT_SHA_OR_BYTES');
 const entries=checkedManifest(manifest);
 checkedState(checkpoint,manifest,entries);
 // This reuses the existing SHA+page-row verifier; the function does not
 // recalculate 1764 scores or call a provider.
 combinePages(entries,rawPages);
 need(observationDate>=manifest.start&&observationDate<=manifest.end,
  'COLLECTION_WINDOW_MISMATCH');
 const perSymbol=[];
 let latestSessionPages=0;
 for(const symbol of GMH_SEVEN_SYMBOLS){
  const covering=manifest.files.filter(e=>e.symbol===symbol&&
   e.observationFrom<=observationDate&&e.observationThrough>=observationDate);
  need(covering.length>0,'LATEST_OBSERVATION_NOT_COVERED');
  const requestTimes=covering.map(e=>{
   const t=Date.parse(e.collectedAt);
   need(typeof e.collectedAt==='string'&&Number.isFinite(t)&&
    e.collectedAt===new Date(t).toISOString()&&t<=now&&
    t>=Date.parse(observationDate+'T00:00:00Z'),
    'COLLECTION_REQUEST_TIME_INVALID');
   return t;
  });
  // Latest SHA-verified covering receipt per symbol, then oldest receipt
  // across all 14 symbols: conservative time at which all were requested.
  perSymbol.push(Math.max(...requestTimes));
  latestSessionPages+=covering.length;
 }
 const timestamp=Math.min(...perSymbol);
 need(Number.isSafeInteger(timestamp)&&timestamp<=now,
  'COLLECTION_REQUEST_TIME_INVALID');
 return Object.freeze({
  status:'GMH_SEVEN_SOURCE_REQUEST_TIME_ATTESTED_READONLY',
  observationDate,
  sourceStoredAt:new Date(timestamp).toISOString(),
  sourceTimestampBasis:'MANIFEST_GET_REQUEST_AT',
  sourceTimestampIsFileCommitTime:false,
  rawManifestSha256:manifestSha256,checkpointSha256,
  checkedRawPages:entries.size,verifiedSymbols:GMH_SEVEN_SYMBOLS.length,
  coveringPages:latestSessionPages,
  rawFilesRehashedInMemory:true,
  providerCalls:0,sqliteOpened:false,sqliteWrites:0,d1Writes:0,
  publicWrites:0,schedulerWrites:0,
  publicationAuthorized:false,upstreamCommercialRightsVerified:false,
  derivedLicenseVerified:false
 });
}

// This is not a PC execution entrypoint. The approved reader owns all I/O and
// independently attests the expected manifest and checkpoint hashes.
export function calculateFromSavedGmhSeven({
 manifestBytes,manifestSha256,checkpointBytes,checkpointSha256,
 rawPages,asOf
}={}){
 const manifest=decode(manifestBytes,manifestSha256,4_000_000,
  'MANIFEST_SHA_OR_BYTES');
 const checkpoint=decode(checkpointBytes,checkpointSha256,2_000_000,
  'CHECKPOINT_SHA_OR_BYTES');
 const entries=checkedManifest(manifest);
 checkedState(checkpoint,manifest,entries);
 const saved=combinePages(entries,rawPages);
 const result=calculateGmhSevenPrivate252(saved,{asOf});
 return Object.freeze({...result,
  rawManifestSha256:manifestSha256,checkpointSha256,
  checkedRawPages:entries.size,
  inputSource:'PC_STORED_GMH_SEVEN_SHA_VERIFIED_ONLY',
  // Never turn private historical provenance into commercial authorization.
  publicationAuthorized:false,upstreamCommercialRightsVerified:false,
  derivedLicenseVerified:false,providerCalls:0,d1Writes:0,
  dbWrites:0,schedulerWrites:0});
}
