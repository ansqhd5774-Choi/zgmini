/** R18: PC-only read audit. Never collects, creates files, or publishes. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {latestCompletedSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {previousMarketSession} from '../../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {calculateFullMarketConfirmedCandidate} from '../../lib/market-breadth/us-marketparquet-confirmed-r2.mjs';

const dateOf=value=>{
  if(value instanceof Date)return Number.isFinite(value.valueOf())?value.toISOString().slice(0,10):null;
  if(Number.isInteger(value)&&value>10000&&value<100000)return new Date(value*86400000).toISOString().slice(0,10);
  return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}/.test(value)?value.slice(0,10):null;
};
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const nonnegative=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;

export function summarizeStockDaily(rows,tradeDate){
  if(!Array.isArray(rows))throw Error('PARQUET_ROWS_INVALID');
  const seen=new Set(),valid=new Set();
  let stockRows=0,delisted=0,duplicate=0,invalid=0,wrongDate=0;
  for(const row of rows){
    if(dateOf(row?.date??row?.timestamp)!==tradeDate){wrongDate++;continue;}
    if(row.asset_type!=null&&String(row.asset_type).toLowerCase()!=='stock')continue;
    stockRows++;
    const symbol=typeof row?.symbol==='string'?row.symbol.trim():'';
    if(!symbol){invalid++;continue;}
    if(seen.has(symbol)){duplicate++;continue;}
    seen.add(symbol);
    if(symbol.endsWith('-DELISTED')){delisted++;continue;}
    if(row.close==null||row.volume==null||!positive(Number(row.close))||!nonnegative(Number(row.volume))){invalid++;continue;}
    valid.add(symbol);
  }
  return {stockRows,activeValidSymbols:valid.size,delisted,duplicate,invalid,wrongDate,symbols:valid};
}

async function defaultReadParquet(file){
  const {parquetReadObjects}=await import('hyparquet');
  const bytes=fs.readFileSync(file);
  if(bytes.byteLength<12||bytes.byteLength>30_000_000||bytes.toString('ascii',0,4)!=='PAR1')
    throw Error('PARQUET_FILE_INVALID');
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  try{return await parquetReadObjects({file:buffer,columns:['date','symbol','asset_type','close','volume']});}
  catch(error){
    if(!/parquet column not found: date/i.test(String(error?.message??error)))throw error;
    return parquetReadObjects({file:buffer,columns:['timestamp','symbol','asset_type','close','volume']});
  }
}

function existingStockDailyFiles(dataRoot,pcHome,dates){
  const roots=[
    path.join(dataRoot,'theme-market-history-r131','marketparquet-r165'),
    path.join(dataRoot,'theme-market-history-r131','marketparquet-r167'),
    path.join(dataRoot,'marketparquet'),
    path.join(pcHome,'marketparquet'),
    path.join(pcHome,'raw','marketparquet'),
  ];
  const found=new Map();
  for(const root of roots){
    if(!fs.existsSync(root))continue;
    for(const date of dates){
      if(found.has(date))continue;
      for(const file of [path.join(root,`stock_daily_${date}.parquet`),
        path.join(root,'stock_daily',`${date}.parquet`),
        path.join(root,'stock_daily',`stock_daily_${date}.parquet`)]){
        if(fs.existsSync(file)&&fs.statSync(file).isFile()){found.set(date,file);break;}
      }
    }
  }
  return found;
}

function inspectCoreDb(file,dates){
  if(!fs.existsSync(file))return {status:'CORE_SQLITE_NOT_FOUND'};
  let db;
  try{
    db=new DatabaseSync(file,{readOnly:true});
    const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
    const result={status:'READ_ONLY',latestDates:dates,sourceRows:{},universeCount:{},localPublished:{}};
    if(tables.has('market_score_breadth_b1_r3_current_v1')){
      const query=db.prepare('SELECT COUNT(*) AS n FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=?');
      for(const date of dates)result.sourceRows[date]=Number(query.get(date)?.n??0);
    }
    if(tables.has('market_score_breadth_b1_r3_universe_v1')){
      const query=db.prepare('SELECT member_count FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date=?');
      for(const date of dates)result.universeCount[date]=query.get(date)?.member_count??null;
    }
    if(tables.has('market_public_snapshots_v1')){
      const query=db.prepare('SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?');
      const body=query.get('public:market-breadth-r1:usa')?.body;
      if(typeof body==='string'){
        try{
          const record=JSON.parse(body);
          result.localPublished={date:record.observationDate??null,universe:record.universe??null,
            source:record.source??null,expectedCount:record.expectedCount??null,eligibleCount:record.eligibleCount??null};
        }catch{result.localPublished={status:'UNREADABLE_BODY'};}
      }
      result.localDatedKeys=Number(db.prepare("SELECT COUNT(*) AS n FROM market_public_snapshots_v1 WHERE snapshot_key LIKE 'public:market-breadth-r1:usa:%'").get()?.n??0);
    }
    return result;
  }catch(error){return {status:'CORE_SQLITE_READ_FAILED',reason:String(error?.code??error?.message??'UNKNOWN').slice(0,90)};}
  finally{db?.close();}
}

export async function auditConfirmedSource({dataRoot,pcHome,now=new Date(),readParquet=defaultReadParquet}={}){
  if(typeof dataRoot!=='string'||!dataRoot||typeof pcHome!=='string'||!pcHome)throw Error('PATH_REQUIRED');
  const current=latestCompletedSession(now),previous=previousMarketSession(current);
  const dates=[previous,current];
  const report={revision:'US_BREADTH_CONFIRMED_SOURCE_AUDIT_R18',mode:'READ_ONLY',
    providerCalls:0,remoteWrites:0,localWrites:0,schedulerChanges:0,
    dates,core:inspectCoreDb(path.join(pcHome,'storage','core.sqlite'),dates),raw:{}};
  const found=existingStockDailyFiles(dataRoot,pcHome,dates);
  const symbols=new Map(),loadedRows=new Map();
  for(const date of dates){
    const file=found.get(date);
    if(!file){report.raw[date]={status:'STORED_STOCK_DAILY_NOT_FOUND'};continue;}
    try{
      const rows=await readParquet(file);
      const result=summarizeStockDaily(rows,date);
      report.raw[date]={status:result.duplicate?'DUPLICATE_SOURCE_SYMBOL':'INSPECTED',
        file,stockRows:result.stockRows,activeValidSymbols:result.activeValidSymbols,
        delisted:result.delisted,duplicate:result.duplicate,invalid:result.invalid,wrongDate:result.wrongDate};
      symbols.set(date,result.symbols);
      loadedRows.set(date,rows);
    }catch(error){report.raw[date]={status:'STORED_PARQUET_READ_FAILED',file,
      reason:String(error?.message??error).slice(0,90)};}
  }
  if(symbols.size===2){
    const previousSymbols=symbols.get(previous),currentSymbols=symbols.get(current);
    report.pairedActiveSymbols=[...currentSymbols].filter(s=>previousSymbols.has(s)).length;
    report.confirmedCandidate=calculateFullMarketConfirmedCandidate({
      observationDate:current,previousDate:previous,
      currentRows:loadedRows.get(current),previousRows:loadedRows.get(previous)});
  }else report.pairedActiveSymbols=null;
  if(!report.confirmedCandidate)report.confirmedCandidate={status:'WAITING_FOR_FULL_MARKET_SOURCE',publicationAllowed:false};
  report.status=dates.every(d=>report.raw[d]?.status==='INSPECTED')?'STORED_PAIR_INSPECTED':'FULL_MARKET_SOURCE_NOT_YET_VERIFIED';
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3||process.argv[2]!=='--inspect'){
    console.error('Usage: node scripts/pc-writer/us-breadth-confirmed-source-audit-r18.mjs --inspect');
    process.exitCode=2;
  }else{
    const dataRoot=process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data';
    const pcHome=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
    const report=await auditConfirmedSource({dataRoot,pcHome});
    console.log(JSON.stringify(report,null,2));
  }
}
