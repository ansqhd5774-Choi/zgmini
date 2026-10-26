// R12: bounded live availability probe; no raw-bar storage, scores or publishing.
// Catalog indexes the stored 1m timeframe; free bar samples are resampled 1h.
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const SPACE_CANDIDATES = Object.freeze([
  'UFO','NASA','WARP','ORBX','MARS','ARKX','ROKT','DIPR','WSPC',
]);
const HOST='https://getmarkethistory.com';
const TICKER=/^[A-Z][A-Z0-9.-]{0,15}$/;

function validatedSymbols(symbols){
  if(!Array.isArray(symbols)||!symbols.length||
     symbols.some(s=>typeof s!=='string'||!TICKER.test(s))||
     new Set(symbols).size!==symbols.length)throw Error('R12_INVALID_SYMBOLS');
  return symbols;
}

async function readSmallJson(fetchImpl,url){
  const res=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!res?.ok)throw Error(`HTTP_${res?.status??'UNKNOWN'}`);
  const body=await res.text();
  if(body.length>50_000)throw Error('R12_RESPONSE_TOO_LARGE');
  return {data:JSON.parse(body),through:res.headers?.get('x-data-through')??null};
}

export function validatePreview({ticker,date,catalog,preview,through}){
  if(!catalog||catalog.symbol!==ticker||!Number.isFinite(Date.parse(catalog.last_timestamp)))
    throw Error('R12_CATALOG_IDENTITY');
  if(!Array.isArray(preview?.bars)||preview.bars.length>3||
     (preview.count!==undefined&&preview.count!==preview.bars.length))
    throw Error('R12_PREVIEW_SHAPE');
  for(const row of preview.bars){
    if(row.symbol!==ticker||typeof row.timestamp!=='string'||
       row.timestamp.slice(0,10)!==date||!Number.isFinite(Date.parse(row.timestamp))||
       !Number.isFinite(row.close)||row.close<=0)
      throw Error('R12_PREVIEW_BAR_INVALID');
  }
  const valid=preview.bars.filter(b=>b.is_gap===false);
  return {stage:valid.length?'LIVE_FREE_1H_PREVIEW_PASS':'NO_NONGAP_1H_ON_LAST_UTC_DATE',
    previewUtcDate:date,previewRows:preview.bars.length,nonGapRows:valid.length,
    dataThrough:through,catalogFirstTimestamp:catalog.first_timestamp,
    catalogLastTimestamp:catalog.last_timestamp,catalogMinuteRows:catalog.rows};
}

export async function probeProvider({symbols=SPACE_CANDIDATES,fetchImpl=fetch}={}){
  validatedSymbols(symbols);
  if(typeof fetchImpl!=='function')throw Error('R12_INVALID_FETCH');
  const rows=[];let providerCalls=0;
  // Sequential and intentionally small requests; selecting ETFs is NOT count-limited.
  for(const ticker of symbols){
    try{
      const catalogUrl=new URL('/api/v1/symbols',HOST);
      for(const [k,v] of Object.entries({source:'stocks',timeframe:'1m',prefix:ticker,limit:'10'}))
        catalogUrl.searchParams.set(k,v);
      providerCalls++;
      const {data:index}=await readSmallJson(fetchImpl,catalogUrl);
      if(!Array.isArray(index.symbols))throw Error('R12_CATALOG_FORMAT');
      const catalog=index.symbols.find(s=>s.symbol===ticker);
      if(!catalog){rows.push({ticker,stage:'NOT_IN_LIVE_CATALOG'});continue;}
      if(!Number.isFinite(Date.parse(catalog.last_timestamp)))
        throw Error('R12_CATALOG_TIMESTAMP_INVALID');
      const date=catalog.last_timestamp.slice(0,10);
      const url=new URL(`/api/v1/bars/stocks/${ticker}/1h`,HOST);
      for(const [k,v] of Object.entries({start:date,end:date,limit:'3',format:'json'}))
        url.searchParams.set(k,v);
      providerCalls++;
      const {data:preview,through}=await readSmallJson(fetchImpl,url);
      rows.push({ticker,...validatePreview({ticker,date,catalog,preview,through})});
    }catch(error){
      rows.push({ticker,stage:'PROBE_ERROR',reason:String(error?.message??error).slice(0,90)});
    }
  }
  return {report:'SPACE_SATELLITE_R12_LIVE_AVAILABILITY',
    status:'READ_ONLY_PROVIDER_PREFLIGHT_NOT_R2_SCORE_AUDIT',
    candidateCount:symbols.length,providerCalls,records:rows,
    availabilityCount:rows.filter(r=>r.stage==='LIVE_FREE_1H_PREVIEW_PASS').length,
    fullRawShaAudited:false,sharedSpyCommonDatesAudited:false,
    r2ScoresVerified:false,rightsVerified:false,finalBasketSelected:false,
    publicationAuthorized:false,publicWrites:0,d1Writes:0,schedulerWrites:0,
    rawFilesWritten:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length<1||args[0]!=='--probe'||args.length>2||
     (args[1]&&!args[1].startsWith('--symbols='))){
    console.log('READ_ONLY_DEFAULT: --probe [--symbols=WARP,ORBX,...]; catalog 1m + free 1h preview, 2 GETs per ETF max; no local or public writes.');
  }else{
    const symbols=args[1]?args[1].slice('--symbols='.length).split(','):SPACE_CANDIDATES;
    probeProvider({symbols}).then(r=>{console.log(JSON.stringify(r,null,2));
      if(r.records.some(x=>x.stage==='PROBE_ERROR'))process.exitCode=2;
    }).catch(e=>{console.error(`R12_STOP_${String(e.message).slice(0,60)}`);process.exitCode=1;});
  }
}
