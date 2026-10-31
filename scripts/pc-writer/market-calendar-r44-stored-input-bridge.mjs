// R44: locate existing approved PC-local inputs for R43 without collecting,
// changing the Core worktree, or exposing raw ticker/vendor data.
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

export const R44_REPORT='MARKET_CALENDAR_R44_STORED_INPUT_BRIDGE';
const FULL_INPUT='local-market-calendar-r43-input.json';
const R43_OUTPUT='local-market-calendar-r43-ranked.json';
const DATE=/^20\d\d-\d\d-\d\d$/;
const boundedJson=(file,limit)=>{
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()||fs.statSync(file).size>limit)return null;
  try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}
};
const knownTable=(db,table)=>Boolean(db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' AND name=?').get(table));

export function inspectR44StoredInput({base,now=Date.now()}={}){
 const report={report:R44_REPORT,checkedAt:new Date(now).toISOString(),status:'INPUT_NOT_MAPPED',
  providerCalls:0,pcDataWrites:0,dbWrites:0,gitWrites:0,schedulerWrites:0,published:false,
  dataRootPresent:false,source:{},recommendation:null};
 if(typeof base!=='string'||!path.isAbsolute(base)||!fs.existsSync(base)){
  report.status='PC_DATA_ROOT_NOT_PRESENT';return report;
 }
 report.dataRootPresent=true;
 const submitted=boundedJson(path.join(base,FULL_INPUT),8_000_000);
 if(submitted){
  const rows=Array.isArray(submitted.rows)?submitted.rows:[];
  const eligible=rows.filter(row=>row?.eligible===true);
  report.source.r43Input={exists:true,asOf:submitted.asOf??null,records:rows.length,
    eligibleRecords:eligible.length,
    priceVolumeRecords:eligible.filter(row=>Number.isFinite(row.price)&&row.price>0&&Number.isFinite(row.volume)&&row.volume>=0).length,
    relativeVolumeRecords:eligible.filter(row=>Number.isFinite(row.relativeVolume)&&row.relativeVolume>0).length,
    provenanceApproved:submitted.provenance==='APPROVED_PC_STORED_DATA'&&submitted.permissionForDerivedScores===true&&submitted.marketCapApiUsed===false};
 }else report.source.r43Input={exists:false};
 report.source.r43Output={exists:fs.existsSync(path.join(base,R43_OUTPUT))};
 const coreFile=path.join(base,'storage','core.sqlite');
 if(fs.existsSync(coreFile)&&fs.statSync(coreFile).isFile()){
  let db;
  try{
   db=new DatabaseSync(coreFile,{readOnly:true});db.exec('PRAGMA query_only=ON');
   if(knownTable(db,'market_score_breadth_b1_r3_current_v1')){
    const latest=db.prepare('SELECT MAX(trade_date) AS trade_date FROM market_score_breadth_b1_r3_current_v1').get()?.trade_date??null;
    const stats=latest?db.prepare('SELECT COUNT(*) AS records,COUNT(DISTINCT ticker) AS symbols,SUM(CASE WHEN current_close>0 AND current_volume>=0 THEN 1 ELSE 0 END) AS valid_price_volume FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=?').get(latest):null;
    const dates=db.prepare('SELECT COUNT(DISTINCT trade_date) AS sessions FROM market_score_breadth_b1_r3_current_v1').get()?.sessions??0;
    report.source.breadthStored={present:true,latestTradeDate:latest,latestTickerCount:Number(stats?.symbols??0),
      latestPriceVolumeCount:Number(stats?.valid_price_volume??0),storedTradingSessions:Number(dates)};
   }else report.source.breadthStored={present:false};
   if(knownTable(db,'public_feed_snapshots_v1')){
    const row=db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='input' AND feed_key='release-calendar:earnings-api:private-events' AND snapshot_key='current'").get();
    if(row&&Buffer.byteLength(row.body,'utf8')<=1_800_000){
     try{const data=JSON.parse(row.body),events=Array.isArray(data.events)?data.events:[];
      report.source.earningsPrivate={present:true,coveredDays:events.length&&data.coveredDays?.length||null,
       eventCount:events.length,uniqueTickerCount:new Set(events.map(e=>e.ticker).filter(Boolean)).size,
       checkedAt:data.checkedAt??null};
     }catch{report.source.earningsPrivate={present:true,parseFailed:true};}
    }else report.source.earningsPrivate={present:false};
   }else report.source.earningsPrivate={present:false};
  }catch{report.source.sqlite={status:'READ_ONLY_OPEN_OR_QUERY_FAILED'};}
  finally{db?.close();}
 }else report.source.sqlite={status:'CORE_SQLITE_NOT_PRESENT'};
 const alpacaDir=path.join(base,'asset-r10-alpaca');
 if(fs.existsSync(alpacaDir)&&fs.statSync(alpacaDir).isDirectory()){
  const groups=fs.readdirSync(alpacaDir).filter(name=>/^group-\d+\.json$/.test(name)).slice(0,200);
  const symbols=new Set();let validGroups=0;
  for(const name of groups){
   const rows=boundedJson(path.join(alpacaDir,name),5_000_000);
   if(!Array.isArray(rows))continue;validGroups++;
   for(const row of rows)if(typeof row?.ticker==='string')symbols.add(row.ticker);
  }
  report.source.alpacaStored={present:true,groupFiles:groups.length,validGroups,uniqueTickerCount:symbols.size};
 }else report.source.alpacaStored={present:false};
 const input=report.source.r43Input;
 if(input.exists&&input.provenanceApproved&&DATE.test(String(input.asOf??''))&&input.eligibleRecords>=2582&&
  input.priceVolumeRecords>=Math.ceil(input.eligibleRecords*.98)&&
  input.relativeVolumeRecords>=Math.ceil(input.eligibleRecords*.9)){
  report.status='R43_INPUT_PRESENT_READY_FOR_EXISTING_SCORER';
  report.recommendation='RUN_EXISTING_R43_CLI_DRY_RUN';
 }else{
  report.status='R43_FULL_UNIVERSE_INPUT_NOT_AVAILABLE';
  report.recommendation='MAP_MISSING_FIELDS_FROM_EXISTING_PC_STORES_ONLY';
 }
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=Object.fromEntries(process.argv.slice(2).map(arg=>arg.match(/^--([^=]+)=(.*)$/)).filter(Boolean).map(m=>[m[1],m[2]]));
 const base=args.base??process.env.ZGMINI_PC_HOME??'E:/ZGmini/data/pc-writer';
 const result=inspectR44StoredInput({base});
 const output=args.output;
 if(output){
  const target=path.resolve(output);
  // Never use an output location within the PC data root or mutate a prior report.
  const underBase=path.relative(path.resolve(base),target);
  if(!path.isAbsolute(target)||(!underBase.startsWith('..')&&!path.isAbsolute(underBase)))throw Error('R44_REPORT_TARGET_INVALID');
  fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 }
 console.log(JSON.stringify(result));
}
