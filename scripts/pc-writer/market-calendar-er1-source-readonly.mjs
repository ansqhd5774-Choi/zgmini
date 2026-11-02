// ER1 single-shot PC input inventory. Read-only SQLite/file metadata only.
// Never call providers, write to PC storage, print EPS/revenue actuals, or read secrets.
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';

const pcHome = process.argv[3] || 'E:\\ZGmini\\data\\pc-writer';
const defaultResult = path.resolve('ER1_PC_INPUT_SOURCE_RESULT.txt');
const resultFile = path.resolve(process.argv[2] || defaultResult);
const report = {
  audit:'ER1_PC_INPUT_SOURCE_READONLY_20261102',
  status:'STARTED', providerRequests:0, dbWrites:0, d1Writes:0,
  basePresent:false, dbPresent:false, dbOpened:false,
  candidateFileCount:0, candidateFiles:[],
  relevantTableCount:0, relevantTables:[],
  numericShapeTables:[], publicEarningsSnapshotCount:null,
  approvedRosterConfirmed:false, fourReleasesConfirmed:false,
  readyForPublish:false,
};

const filePattern=/(earning|release|fundamental|financial|issuer|roster|reviewed)/i;
const fileExtension=/\.(?:json|jsonl|csv|sqlite|db|parquet)$/i;
const sqlId = name=>'"'+name.replaceAll('"','""')+'"';

function inspectFiles(){
  const dirs=[pcHome,path.join(pcHome,'storage'),path.join(pcHome,'input'),
    path.join(pcHome,'sources'),path.join(pcHome,'market-calendar'),
    path.join(pcHome,'approved'),'E:\\ZGmini\\data\\market-calendar'];
  report.basePresent=fs.existsSync(pcHome);
  for(const folder of dirs){
    if(!fs.existsSync(folder)) continue;
    let entries=[];
    try{entries=fs.readdirSync(folder,{withFileTypes:true});}catch{continue;}
    for(const e of entries){
      if(!e.isFile()||!filePattern.test(e.name)||!fileExtension.test(e.name))continue;
      report.candidateFileCount++;
      if(report.candidateFiles.length<30)
        report.candidateFiles.push(path.join(path.basename(folder),e.name));
    }
  }
  // Only a file name is checked; contents/eligibility are never assumed approved.
  const explicit=path.join(pcHome,'local-market-calendar-r43-reviewed-issuers.json');
  report.expectedReviewedRosterFileExists=fs.existsSync(explicit);
}

function inspectDb(){
  const dbPath=path.join(pcHome,'storage','core.sqlite');
  report.dbPresent=fs.existsSync(dbPath);
  if(!report.dbPresent)return;
  const db=new DatabaseSync(dbPath,{readOnly:true});
  report.dbOpened=true;
  try{
    db.exec('PRAGMA query_only=ON');
    db.exec('PRAGMA busy_timeout=0');
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    for(const t of tables){
      if(!/(earning|release|financial|fundamental|issuer|roster|provider|calendar)/i.test(t.name))continue;
      report.relevantTableCount++;
      if(report.relevantTables.length<40)report.relevantTables.push(t.name);
      if(report.numericShapeTables.length>=15)continue;
      const cols=db.prepare(`PRAGMA table_info(${sqlId(t.name)})`).all().map(c=>c.name);
      const lower=cols.map(x=>x.toLowerCase());
      const epsAt=lower.indexOf('eps'), revenueAt=lower.indexOf('revenue');
      const dateAt=lower.findIndex(x=>['date','release_date','earnings_date'].includes(x));
      const symAt=lower.findIndex(x=>['symbol','ticker'].includes(x));
      if(epsAt<0||revenueAt<0||dateAt<0||symAt<0)continue;
      const pick=[epsAt,revenueAt,dateAt,symAt].map(i=>sqlId(cols[i]));
      let sampled=[], readStatus='OK';
      try{sampled=db.prepare(`SELECT ${pick.join(',')} FROM ${sqlId(t.name)} LIMIT 500`).all();}
      catch{readStatus='CANNOT_SAMPLE';}
      const populated=sampled.filter(r=>r[cols[epsAt]]!=null ||r[cols[revenueAt]]!=null);
      const issuers=new Set(populated.map(r=>r[cols[symAt]]).filter(x=>typeof x==='string'));
      report.numericShapeTables.push({table:t.name,sampleStatus:readStatus,
        sampleRows:sampled.length,sampleWithAnyActual:populated.length,
        distinctSampleTickers:issuers.size});
    }
    // Avoid touching body; the public key is known to carry HTML rather than four actual reports.
    const tablesSet=new Set(tables.map(x=>x.name));
    if(tablesSet.has('public_feed_snapshots_v1')){
      try{
        const n=db.prepare("SELECT COUNT(*) AS n FROM public_feed_snapshots_v1 WHERE feed_key LIKE '%earnings%' ").get();
        report.publicEarningsSnapshotCount=n.n;
      }catch{report.publicEarningsSnapshotCount='UNAVAILABLE';}
    }
  }finally{db.close();}
}

try{
  inspectFiles();
  inspectDb();
  report.status=!report.basePresent?'PC_HOME_NOT_FOUND':
    !report.dbPresent?'PC_CORE_SQLITE_NOT_FOUND':'READONLY_INVENTORY_COMPLETE';
}catch(error){
  report.status='READONLY_INVENTORY_ERROR';
  report.errorCode=typeof error.code==='string'?error.code:'UNKNOWN';
}

const text=Object.entries(report).map(([k,v])=>
  `${k.toUpperCase()}=${JSON.stringify(v)}`).join('\r\n')+'\r\n';
fs.writeFileSync(resultFile,text,{encoding:'utf8',flag:'w'});
process.stdout.write('ER1_RESULT_FILE='+resultFile+'\nSTATUS='+report.status+'\n');
if(report.status!=='READONLY_INVENTORY_COMPLETE')process.exitCode=1;
