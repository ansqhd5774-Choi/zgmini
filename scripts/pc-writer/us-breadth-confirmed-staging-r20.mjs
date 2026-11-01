/** R20: source-SHA-gated staging candidate. Not wired into PC cycles or public API. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {calculateFullMarketConfirmedCandidate} from '../../lib/market-breadth/us-marketparquet-confirmed-r2.mjs';
import {
 US_FULL_MARKET_STAGING_KEY,US_FULL_MARKET_SOURCE,US_FULL_MARKET_UNIVERSE,
 US_FULL_MARKET_PRICE_MODE,validFullMarketStagingRecord,
} from '../../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const SOURCE='MarketParquet';
const isDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);

async function decodeStoredParquet(bytes){
 const {parquetReadObjects}=await import('hyparquet');
 const arrayBuffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 try{return await parquetReadObjects({file:arrayBuffer,columns:['date','symbol','asset_type','close','volume']});}
 catch(error){
  if(!/parquet column not found: date/i.test(String(error?.message??error)))throw error;
  return parquetReadObjects({file:arrayBuffer,columns:['timestamp','symbol','asset_type','close','volume']});
 }
}

function contained(root,file){
 const actualRoot=fs.realpathSync(root),actualFile=fs.realpathSync(file);
 if(!actualFile.startsWith(actualRoot+path.sep))throw Error('SOURCE_OUTSIDE_APPROVED_ROOT');
 return actualFile;
}

async function loadVerifiedStoredDate({root,entry,readParquet}){
 if(!entry||!isDay(entry.date)||entry.provider!==SOURCE||entry.feed!=='stock_daily'
   ||entry.priceMode!==US_FULL_MARKET_PRICE_MODE||entry.complete!==true
   ||typeof entry.path!=='string'||!/^[a-f0-9]{64}$/.test(entry.sha256))
  throw Error('STORED_SOURCE_MANIFEST_NOT_APPROVED');
 const sourceFile=contained(root,entry.path);
 if(!/\.parquet$/i.test(sourceFile)||!path.basename(sourceFile).includes(entry.date))
  throw Error('SOURCE_FILE_IDENTITY_MISMATCH');
 const bytes=fs.readFileSync(sourceFile);
 if(bytes.byteLength<12||bytes.byteLength>30_000_000
   ||bytes.toString('ascii',0,4)!=='PAR1'||bytes.toString('ascii',bytes.length-4)!=='PAR1')
  throw Error('SAVED_PARQUET_INVALID');
 if(digest(bytes)!==entry.sha256)throw Error('SAVED_PARQUET_SHA_MISMATCH');
 const rows=await readParquet(bytes);
 if(!Array.isArray(rows)||rows.length===0)throw Error('SAVED_PARQUET_ROWS_INVALID');
 if(entry.rowCount!=null&&entry.rowCount!==rows.length)throw Error('SAVED_PARQUET_ROWCOUNT_MISMATCH');
 return {rows,evidence:{date:entry.date,sha256:entry.sha256,bytes:bytes.byteLength,sourceRows:rows.length}};
}

/**
 * Full-market candidate is recomputed from verified on-disk Parquet bytes,
 * never accepted from a caller-supplied 503-row/partial calculation. `manifest`
 * must be the independently approved source provenance ledger, not invented
 * from the file itself. No file is written here.
 */
export async function prepareFullMarketStaging({approvedSourceRoot,manifest,now=new Date(),readParquet=decodeStoredParquet}={}){
 const notReady=(status,reason)=>({status,prepared:false,reason});
 if(!approvedSourceRoot||!manifest?.current||!manifest?.previous)
  return notReady('SOURCE_MANIFEST_REQUIRED','TWO_COMPLETE_STORED_DATES_REQUIRED');
 const parsedNow=now instanceof Date?now:new Date(now);
 if(Number.isNaN(parsedNow.valueOf()))return notReady('CALCULATION_TIME_INVALID');
 let current,previous;
 try{
  [previous,current]=await Promise.all([
   loadVerifiedStoredDate({root:approvedSourceRoot,entry:manifest.previous,readParquet}),
   loadVerifiedStoredDate({root:approvedSourceRoot,entry:manifest.current,readParquet}),
  ]);
 }catch(error){return notReady('SAVED_SOURCE_NOT_VERIFIED',String(error?.message??error).slice(0,80));}
 const candidate=calculateFullMarketConfirmedCandidate({
  observationDate:manifest.current.date,previousDate:manifest.previous.date,
  currentRows:current.rows,previousRows:previous.rows,
  missingPricePolicy:'MISSING_AS_UNCHANGED',
 });
 if(candidate.status!=='CALCULATED_UNPUBLISHED')
  return {status:'FULL_MARKET_CANDIDATE_NOT_READY',prepared:false,reason:candidate.status,
   expectedCount:candidate.expectedCount??null,eligibleCount:candidate.eligibleCount??null};
 const body={version:2,phase:'CONFIRMED',status:'CANDIDATE',publicationStage:'STAGING_ONLY',
  market:'usa',universe:US_FULL_MARKET_UNIVERSE,source:US_FULL_MARKET_SOURCE,
  priceMode:US_FULL_MARKET_PRICE_MODE,methodologyVersion:candidate.methodologyVersion,
  calculatedAt:parsedNow.toISOString(),observationDate:candidate.observationDate,
  previousDate:candidate.previousDate,expectedCount:candidate.expectedCount,
  eligibleCount:candidate.eligibleCount,missingCount:candidate.missingCount,
  observedComparableCount:candidate.observedComparableCount,
  observedUnchangedCount:candidate.observedUnchangedCount,
  imputedUnchangedCount:candidate.imputedUnchangedCount,
  sourcePairCoverage:candidate.sourcePairCoverage,
  coverage:candidate.coverage,counts:candidate.counts,
  sourceEvidence:{verification:'SAVED_PARQUET_MANIFEST_SHA256_READBACK',
   current:current.evidence,previous:previous.evidence}};
 if(!validFullMarketStagingRecord(body))throw Error('STAGING_CONTRACT_INVALID');
 return {status:'PREPARED_STAGING_ONLY',prepared:true,body};
}

/** Writes ONLY the independent staging key when explicitly enabled and read-back verified. */
export async function publishFullMarketStaging(remote,database,prepared,{now=Date.now(),stageWriteEnabled=false}={}){
 if(!stageWriteEnabled)return {status:'STAGING_WRITE_DISABLED'};
 if(prepared?.prepared!==true)return {status:'SKIPPED_NOT_PREPARED'};
 const body=prepared.body;
 if(!validFullMarketStagingRecord(body))throw Error('STAGING_CONTRACT_INVALID');
 if(!Number.isSafeInteger(now)||now<=0)throw Error('PUBLICATION_TIME_INVALID');
 const read=()=>remote.query(database,
  'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[US_FULL_MARKET_STAGING_KEY]);
 const before=(await read()).results?.[0]??null;
 let old=null;
 try{old=before?.body?JSON.parse(before.body):null;}catch{}
 if(before&&!validFullMarketStagingRecord(old))return {status:'UNKNOWN_STAGING_RECORD_PRESERVED'};
 if(old?.observationDate>body.observationDate)return {status:'NEWER_STAGING_PRESERVED'};
 const encoded=JSON.stringify(body);
 if(before?.body===encoded)return {status:'ALREADY_VERIFIED'};
 if(old?.observationDate===body.observationDate)return {status:'SAME_DAY_STAGING_PRESERVED'};
 if(before&&Number(before.stored_at)>now)return {status:'NEWER_PUBLICATION_PRESERVED'};
 const upsert='INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE market_public_snapshots_v1.stored_at=? AND market_public_snapshots_v1.body=?';
 let failed=false;
 try{await remote.request(database,[{sql:upsert,params:[US_FULL_MARKET_STAGING_KEY,encoded,now,
  before?.stored_at??-1,before?.body??'']}]);}catch{failed=true;}
 const after=(await read()).results?.[0]??null;
 if(after?.body!==encoded)throw Error(failed?'STAGING_PUBLICATION_UNKNOWN':'STAGING_READBACK_MISMATCH');
 return {status:'VERIFIED_STAGING_ONLY',observationDate:body.observationDate,
  expectedCount:body.expectedCount,eligibleCount:body.eligibleCount};
}
