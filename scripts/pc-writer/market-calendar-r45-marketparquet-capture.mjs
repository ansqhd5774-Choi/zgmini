// R45: PC-private reuse of a MarketParquet stock_daily file already fetched by
// the existing B1 collector. No HTTP, D1 or Core SQLite writes occur here.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

export const R45_CAPTURE_VERSION='MARKET_CALENDAR_R45_FULL_STOCK_REUSE_R1';
export const R45_CAPTURE_DIR='market-calendar-r45-marketparquet';
const DATE=/^20\d{2}-\d{2}-\d{2}$/;
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const MIN_ROWS=2000,MAX_ROWS=25000,MAX_BYTES=4_000_000;
const digest=value=>createHash('sha256').update(value).digest('hex');
const day=value=>value instanceof Date&&!Number.isNaN(value.valueOf())?
  value.toISOString().slice(0,10):
  /^20\d{2}-\d{2}-\d{2}/.test(String(value??''))?String(value).slice(0,10):null;
const finite=value=>typeof value==='number'&&Number.isFinite(value);

function preparedDaily({rows,date,now}){
  if(!Array.isArray(rows)||!DATE.test(String(date??''))||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)!==date||
    date>new Date(now+86400000).toISOString().slice(0,10)||rows.length>MAX_ROWS)
    throw Error('R45_DAILY_INPUT_INVALID');
  const byTicker=new Map();
  for(const row of rows){
    if(String(row?.asset_type??'').toLowerCase()!=='stock')continue;
    if(day(row?.date??row?.timestamp)!==date)continue;
    const ticker=String(row?.symbol??'').trim().toUpperCase();
    const close=Number(row?.close),volume=Number(row?.volume);
    if(!TICKER.test(ticker)||!finite(close)||close<=0||
      !finite(volume)||volume<0||!Number.isSafeInteger(volume))continue;
    const previous=byTicker.get(ticker);
    if(previous){
      if(previous.close!==close||previous.volume!==volume)throw Error('R45_DUPLICATE_TICKER_CONFLICT');
    }else byTicker.set(ticker,{ticker,close,volume});
  }
  if(byTicker.size<MIN_ROWS||byTicker.size>MAX_ROWS)throw Error('R45_FULL_STOCK_COVERAGE_INVALID');
  const selected=[...byTicker.values()].sort((a,b)=>a.ticker.localeCompare(b.ticker));
  const hash=digest(JSON.stringify(selected));
  const payload={version:1,method:R45_CAPTURE_VERSION,scope:'PC_PRIVATE_ONLY',
    source:'MARKETPARQUET_FREE_SAMPLE',sourceContract:'ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5',
    observationDate:date,priceAdjustment:'SPLIT_ADJUSTED',
    publicFeed:false,redistribution:false,providerCallsAdded:0,
    tickerCount:selected.length,rowsSha256:hash,rows:selected};
  const encoded=JSON.stringify(payload);
  if(Buffer.byteLength(encoded,'utf8')>MAX_BYTES)throw Error('R45_PRIVATE_FILE_SIZE_LIMIT');
  return {payload,encoded,hash};
}

function persistDaily(base,prepared){
  const date=prepared.payload.observationDate;
  const dir=path.join(base,R45_CAPTURE_DIR);
  const target=path.join(dir,`stock_daily_${date}.json`);
  if(fs.existsSync(target)){
    let prior=null;
    try{if(fs.statSync(target).size<=MAX_BYTES)prior=JSON.parse(fs.readFileSync(target,'utf8'));}catch{}
    return {date,tickerCount:prepared.payload.tickerCount,
      status:prior?.rowsSha256===prepared.hash&&prior?.method===R45_CAPTURE_VERSION&&
        prior?.observationDate===date&&prior?.tickerCount===prepared.payload.tickerCount&&
        Array.isArray(prior?.rows)&&digest(JSON.stringify(prior.rows))===prepared.hash?
        'ALREADY_STORED':'CONFLICT_PRESERVED',written:false};
  }
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const stage=target+`.tmp-${process.pid}-${randomUUID()}`;
  try{
    fs.writeFileSync(stage,prepared.encoded,{flag:'wx',mode:0o600});
    try{fs.linkSync(stage,target);}
    catch(error){
      if(error?.code==='EEXIST')return {date,tickerCount:prepared.payload.tickerCount,
        status:'RACE_PRESERVED',written:false};
      throw error;
    }
  }finally{if(fs.existsSync(stage))fs.unlinkSync(stage);}
  const check=JSON.parse(fs.readFileSync(target,'utf8'));
  if(check.rowsSha256!==prepared.hash||check.tickerCount!==prepared.payload.tickerCount)
    throw Error('R45_PRIVATE_READBACK_MISMATCH');
  return {date,tickerCount:prepared.payload.tickerCount,status:'STORED_PRIVATE',written:true};
}

export function captureR45MarketParquetPair({base,tradeDate,previousDate,
 currentRows,previousRows,now=Date.now()}={}){
  if(typeof base!=='string'||!path.isAbsolute(base)||!fs.existsSync(base)||
    !fs.statSync(base).isDirectory()||!DATE.test(String(previousDate??''))||
    !DATE.test(String(tradeDate??''))||previousDate>=tradeDate)
    throw Error('R45_PC_STORAGE_OR_DATES_INVALID');
  // Validate both complete daily files before any local write.
  const previous=preparedDaily({rows:previousRows,date:previousDate,now});
  const current=preparedDaily({rows:currentRows,date:tradeDate,now});
  const priorResult=persistDaily(base,previous);
  const currentResult=persistDaily(base,current);
  return {status:[priorResult,currentResult].some(r=>r.status==='CONFLICT_PRESERVED')?
    'R45_SOURCE_CONFLICT_PRESERVED':'R45_PRIVATE_REUSE_READY',
    previous:priorResult,current:currentResult,
    providerCalls:0,dbWrites:0,remoteWrites:0,published:false};
}
