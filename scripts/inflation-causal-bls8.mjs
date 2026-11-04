// Research-only BLS PPI raw input collector. No production score, DB, publish or scheduler writes.
// The approved PC wrapper MUST inject the existing enforced quota fetch and its local BLS key.
import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';

export const BLS8_IDS=Object.freeze([
 'WPU1017','WPU102502','WPU081','WPU061',
 'WPU012','WPU0221','WPU029','WPUID61'
]);
export const BLS8_ENDPOINT='https://api.bls.gov/publicAPI/v2/timeseries/data/';
export const BLS8_OUTPUT_RELATIVE=path.join('inflation-causal-r1','bls-ppi8.json');

const sha256=value=>createHash('sha256').update(value).digest('hex');
const failure=code=>Object.assign(Error(code),{code});
const validIso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;

export function normalizeBls8Response(payload){
 if(payload?.status!=='REQUEST_SUCCEEDED')throw failure('BLS_STATUS_FAILED');
 const items=payload.Results?.series;
 if(!Array.isArray(items)||items.length!==BLS8_IDS.length)throw failure('BLS_SERIES_COUNT');
 const out={};
 for(const item of items){
  const id=item?.seriesID;
  if(!BLS8_IDS.includes(id)||Object.hasOwn(out,id))throw failure('BLS_ID_INVALID_OR_DUPLICATE');
  if(!Array.isArray(item.data))throw failure('BLS_ROWS_INVALID');
  const rows=[],seen=new Set();
  for(const row of item.data){
   if(row?.period==='M13')continue; // Annual average is NOT a monthly observation.
   if(!/^\d{4}$/.test(String(row?.year??''))||!/^M(0[1-9]|1[0-2])$/.test(row?.period??''))
    throw failure('BLS_MONTH_INVALID');
   const date=`${row.year}-${row.period.slice(1)}-01`;
   const value=Number(row.value);
   if(typeof row.value!=='string'||row.value.trim()===''||!Number.isFinite(value)||value<0)
    throw failure('BLS_VALUE_INVALID');
   if(seen.has(date))throw failure('BLS_MONTH_DUPLICATE');
   seen.add(date);
   rows.push({date,value,footnotes:Array.isArray(row.footnotes)?row.footnotes:[]});
  }
  if(!rows.length)throw failure('BLS_SERIES_EMPTY');
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  out[id]=rows;
 }
 for(const id of BLS8_IDS)if(!Object.hasOwn(out,id))throw failure('BLS_SERIES_MISSING');
 return out;
}

const isExistingDocument=x=>x?.schemaVersion===1&&x?.provider==='BLS'
 &&Array.isArray(x?.ids)&&x.ids.join('|')===BLS8_IDS.join('|')
 &&x?.series&&BLS8_IDS.every(id=>Array.isArray(x.series[id])&&x.series[id].length);

export function mergeBls8(previous,incoming){
 const merged={};
 for(const id of BLS8_IDS){
  const months=new Map();
  for(const row of (isExistingDocument(previous)?previous.series[id]:[])){
   if(/^\d{4}-(0[1-9]|1[0-2])-01$/.test(row?.date)&&Number.isFinite(row?.value))months.set(row.date,row);
  }
  // Provider's same-month revisions supersede historical stored values, even if no new month exists.
  for(const row of incoming[id])months.set(row.date,row);
  merged[id]=[...months.values()].sort((a,b)=>a.date.localeCompare(b.date));
 }
 return merged;
}

function atomicSaveAndVerify(file,document){
 const parent=path.dirname(file);
 fs.mkdirSync(parent,{recursive:true});
 const bytes=Buffer.from(JSON.stringify(document));
 const temporary=`${file}.tmp-${process.pid}-${randomUUID()}`;
 fs.writeFileSync(temporary,bytes,{flag:'wx'});
 try{fs.renameSync(temporary,file);}catch(error){
  try{fs.unlinkSync(temporary);}catch{}
  throw failure('LOCAL_ATOMIC_RENAME_FAILED');
 }
 let reread;
 try{reread=fs.readFileSync(file);}catch{throw failure('LOCAL_READBACK_FAILED');}
 if(sha256(reread)!==sha256(bytes))throw failure('LOCAL_READBACK_SHA_MISMATCH');
 try{
  const loaded=JSON.parse(reread.toString('utf8'));
  if(!isExistingDocument(loaded)||loaded.sourceStoredAt!==document.sourceStoredAt)
   throw failure('LOCAL_READBACK_CONTRACT_FAILED');
 }catch(error){throw error?.code==='LOCAL_READBACK_CONTRACT_FAILED'?error:failure('LOCAL_READBACK_JSON_INVALID');}
 return {fileSha256:sha256(bytes),storedBytes:bytes.length};
}

/**
 * Caller supplies an approved `createQuotaFetch({base,originalFetch,mode:'enforce'}).fetch`.
 * `base` is the exact PC writer data base; never infer a C: default on missing E: drive.
 * No HTTP request occurs when the local provider key or quota-injected fetch is missing.
 */
export async function collectInflationCausalBls8({base,blsKey,quotaFetch,now=new Date(),startYear}={}){
 if(typeof base!=='string'||!base.trim()||!fs.existsSync(base)||!fs.statSync(base).isDirectory())
  throw failure('PC_DATA_BASE_UNAVAILABLE');
 if(typeof blsKey!=='string'||!blsKey.trim())throw failure('BLS_REGISTRATION_KEY_MISSING');
 if(typeof quotaFetch!=='function')throw failure('APPROVED_QUOTA_FETCH_REQUIRED');
 const moment=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(moment.getTime()))throw failure('NOW_INVALID');
 const year=moment.getUTCFullYear();
 const begin=startYear??year-19;
 if(!Number.isInteger(begin)||begin>year||begin<year-19)throw failure('BLS_20_YEAR_RANGE_EXCEEDED');
 const body=JSON.stringify({seriesid:BLS8_IDS,startyear:String(begin),endyear:String(year),registrationkey:blsKey.trim()});
 const response=await quotaFetch(BLS8_ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body,signal:AbortSignal.timeout(20_000)});
 if(!response?.ok)throw failure(`BLS_HTTP_${Number.isInteger(response?.status)?response.status:'FAILED'}`);
 let responseText;
 try{responseText=await response.text();}catch{throw failure('BLS_RESPONSE_READ_FAILED');}
 let payload;
 try{payload=JSON.parse(responseText);}catch{throw failure('BLS_JSON_INVALID');}
 const incoming=normalizeBls8Response(payload); // Validate ALL 8 before even opening output for write.
 const file=path.join(path.resolve(base),BLS8_OUTPUT_RELATIVE);
 let old=null;
 if(fs.existsSync(file)){
  try{old=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw failure('EXISTING_BLS_INPUT_INVALID_PRESERVED');}
  if(!isExistingDocument(old)||!validIso(old.sourceStoredAt))
   throw failure('EXISTING_BLS_INPUT_INVALID_PRESERVED');
 }
 const merged=mergeBls8(old,incoming);
 if(old&&JSON.stringify(old.series)===JSON.stringify(merged)){
  return {status:'UNCHANGED_VALID_INPUT_PRESERVED',providerCalls:1,stored:false,
   ids:BLS8_IDS.length,counts:Object.fromEntries(BLS8_IDS.map(id=>[id,old.series[id].length])),
   latest:Object.fromEntries(BLS8_IDS.map(id=>[id,old.series[id].at(-1).date]))};
 }
 const sourceStoredAt=moment.toISOString();
 const document={schemaVersion:1,provider:'BLS',ids:[...BLS8_IDS],frequency:'MONTHLY',seasonalAdjustment:'NSA',
  sourceStoredAt,sourceVersion:'BLS_API_V2_PPI_BATCH8_R1',requestYears:[begin,year],
  responseSha256:sha256(responseText),providerRawSeries:payload.Results.series,series:merged};
 const proof=atomicSaveAndVerify(file,document);
 return {status:'SAVED_READBACK',providerCalls:1,stored:true,ids:BLS8_IDS.length,
  counts:Object.fromEntries(BLS8_IDS.map(id=>[id,merged[id].length])),
  latest:Object.fromEntries(BLS8_IDS.map(id=>[id,merged[id].at(-1).date])),
  sourceStoredAt,sourceVersion:document.sourceVersion,...proof};
}
