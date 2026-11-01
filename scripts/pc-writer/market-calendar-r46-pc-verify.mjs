// R46: read-only PC evidence check; never fetches, collects, publishes or edits.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const sha=value=>createHash('sha256').update(value).digest('hex');
const READ_LIMIT=4_000_000;
const cleanDate=v=>/^20\d{2}-\d{2}-\d{2}$/.test(v);

function checkDay(full,date){
 try{
  if(fs.statSync(full).size>READ_LIMIT)return {date,status:'PRIVATE_FILE_SIZE_INVALID'};
  const obj=JSON.parse(fs.readFileSync(full,'utf8'));
  const rows=obj?.rows;
  const good=obj.version===1&&obj.method==='MARKET_CALENDAR_R45_FULL_STOCK_REUSE_R1'&&
   obj.sourceContract==='ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5'&&
   obj.scope==='PC_PRIVATE_ONLY'&&obj.publicFeed===false&&obj.redistribution===false&&
   obj.observationDate===date&&Number.isInteger(obj.tickerCount)&&obj.tickerCount>=2000&&
   obj.tickerCount<=25000&&Array.isArray(rows)&&rows.length===obj.tickerCount&&
   sha(JSON.stringify(rows))===obj.rowsSha256;
  return {date,status:good?'PRIVATE_INTEGRITY_OK':'PRIVATE_INTEGRITY_FAILED',
   tickerCount:good?obj.tickerCount:null};
 }catch{return {date,status:'PRIVATE_FILE_UNREADABLE'};}
}

export function verifyR46PrivateDays({
 base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
}={}){
 const report={audit:'MARKET_CALENDAR_R46_PC_R45_VERIFY',at:new Date().toISOString(),
  status:'WAITING_EXISTING_B1_COLLECTION',providerCalls:0,dbWrites:0,
  networkCalls:0,published:false,filesystemMutations:0,
  privateDayCount:0,recentDays:[],lastCollectorStatus:null};
 try{
  if(!fs.statSync(base).isDirectory())throw Error('R46_PC_HOME_INVALID');
  const last=path.join(base,'local-collection-last-run.json');
  if(fs.existsSync(last)){
   const raw=fs.readFileSync(last,'utf8');
   if(Buffer.byteLength(raw,'utf8')<=READ_LIMIT){
    const obj=JSON.parse(raw);
    const s=obj.marketCalendarR45?.status;
    if(typeof s==='string'&&/^[A-Z0-9_]{3,90}$/.test(s))report.lastCollectorStatus=s;
   }
  }
  const dir=path.join(base,'market-calendar-r45-marketparquet');
  if(!fs.existsSync(dir))return report;
  const files=fs.readdirSync(dir).filter(name=>name.startsWith('stock_daily_')&&
   name.endsWith('.json')&&cleanDate(name.slice(12,-5))).sort().reverse();
  report.privateDayCount=files.length;
  report.recentDays=files.slice(0,3).map(name=>checkDay(path.join(dir,name),name.slice(12,-5)));
  report.status=report.recentDays.some(x=>x.status!=='PRIVATE_INTEGRITY_OK')?
   'R46_PRIVATE_INTEGRITY_FAILURE':files.length>=2?
   'R46_PRIVATE_TWO_OR_MORE_DAYS_VERIFIED':'R46_PRIVATE_ONE_DAY_ONLY';
  return report;
 }catch{report.status='R46_READ_ONLY_INSPECTION_FAILED';return report;}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const baseArg=process.argv.find(v=>v.startsWith('--base='));
 const result=verifyR46PrivateDays(baseArg?{base:baseArg.slice(7)}:{});
 console.log(JSON.stringify(result));
 if(result.status.includes('FAIL'))process.exitCode=2;
}
