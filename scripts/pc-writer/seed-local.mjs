import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {localDatabase} from './local-db.mjs';
import {client,credential,read,save,hash} from './d1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const config=read(path.join(base,'config.json'));
const remote=client(config,credential(root));
const progressFile=path.join(base,'local-seed-progress.json');
const progress=fs.existsSync(progressFile)?read(progressFile):{};
const allowed=name=>/^(api_history_|c1_r3_|growth_r2_|market_|public_feed_|kfg_rev7_)/.test(name)&&/^[a-z0-9_]+$/.test(name);
let activeTable;
try{
 for(const kind of ['core','history']){
  const db=localDatabase(path.join(base,'storage',kind+'.sqlite'));
  try{
   const schemas=(await remote.query(config[kind],"SELECT name,sql FROM sqlite_master WHERE type='table'")).results.filter(x=>allowed(x.name));
   // Restore all related financial tables before validating their foreign keys.
   await db.exec('PRAGMA foreign_keys=OFF');
   for(const {sql} of schemas)await db.exec(sql.replace(/^CREATE TABLE\s+/i,'CREATE TABLE IF NOT EXISTS '));
   for(const {name,sql} of schemas){
    activeTable=name;
    await db.exec(sql.replace(/^CREATE TABLE\s+/i,'CREATE TABLE IF NOT EXISTS '));
    const key=kind+':'+name;
    if(progress[key]?.complete)continue;
    let cursor=progress[key]?.cursor??0,total=progress[key]?.rows??0;
    // Reuse checksummed PC history; fetch only dates not already complete locally.
    if(name==='kfg_rev7_kospi_rows'){
     if(!progress[key]?.cacheImported){
      const directory=path.join(base,'korea-inputs');
      for(const file of fs.existsSync(directory)?fs.readdirSync(directory):[]){
       if(!/^[a-f0-9]{64}\.json$/.test(file))continue;
       const cached=read(path.join(directory,file));
       if(!Array.isArray(cached.rows)||cached.hash!==hash(cached.rows))throw Error('KOREA_CACHE_CORRUPT');
       await db.batch(cached.rows.map(r=>db.prepare('INSERT OR IGNORE INTO kfg_rev7_kospi_rows(date,security_id,short_code,close,high,low,change_amount,share_volume) VALUES(?,?,?,?,?,?,?,?)').bind(r.date,r.securityId,r.shortCode,r.close,r.high,r.low,r.changeAmount,r.shareVolume)));
      }
      progress[key]={cacheImported:true};save(progressFile,progress);
     }
     const dates=(await remote.query(config[kind],"SELECT date,rows_stored FROM kfg_rev7_market_dates WHERE status='COMPLETE' ORDER BY date")).results;
     for(const date of dates){
      const count=await db.prepare('SELECT COUNT(*) AS n FROM kfg_rev7_kospi_rows WHERE date=?').bind(date.date).first('n');
      if(count===date.rows_stored)continue;
      const rows=(await remote.query(config[kind],'SELECT * FROM kfg_rev7_kospi_rows WHERE date=? ORDER BY security_id',[date.date])).results;
      if(rows.length!==date.rows_stored)throw Error('KOREA_SEED_COUNT_MISMATCH');
      await insert(db,name,rows);
     }
     progress[key]={complete:true,rows:await db.prepare('SELECT COUNT(*) AS n FROM kfg_rev7_kospi_rows').first('n')};save(progressFile,progress);console.log(JSON.stringify({table:name,status:'SEEDED',rows:progress[key].rows}));continue;
    }
    for(;;){
     const limit=/chunks|snapshots|batches|provider/.test(name)?20:1000;
     const rows=(await remote.query(config[kind],`SELECT rowid AS __seed_rowid,* FROM ${name} WHERE rowid>? ORDER BY rowid LIMIT ${limit}`,[cursor])).results;
     if(!rows.length)break;
     cursor=rows.at(-1).__seed_rowid;
     await insert(db,name,rows.map(({__seed_rowid,...row})=>row));
     total+=rows.length;progress[key]={cursor,rows:total};save(progressFile,progress);
    }
    progress[key]={complete:true,cursor,rows:total};save(progressFile,progress);
    console.log(JSON.stringify({table:name,status:'SEEDED',rows:total}));
   }
   const violations=(await db.prepare('PRAGMA foreign_key_check').all()).results;
   if(violations.length)throw Error('LOCAL_SEED_FOREIGN_KEY_CHECK_FAILED');
   await db.exec('PRAGMA foreign_keys=ON');
  }finally{db.close();}
 }
 console.log(JSON.stringify({status:'LOCAL_SEED_COMPLETE',remoteWrites:remote.stats.rowsWritten}));
}catch(error){console.log(JSON.stringify({status:'SEED_INTERRUPTED',table:activeTable,code:/^[A-Z0-9_]+$/.test(error.message)?error.message:error.code??'SEED_ERROR',...(error.code==='ERR_SQLITE_ERROR'?{sqliteError:error.message}:{})}));process.exitCode=1;}
async function insert(db,table,rows){
 if(!rows.length)return;
 const columns=Object.keys(rows[0]);if(columns.some(x=>!/^[a-zA-Z0-9_]+$/.test(x)))throw Error('INVALID_SEED_COLUMN');
 const sql=`INSERT OR REPLACE INTO ${table}(${columns.map(x=>'"'+x+'"').join(',')}) VALUES(${columns.map(()=>'?').join(',')})`;
 await db.batch(rows.map(row=>db.prepare(sql).bind(...columns.map(key=>row[key]))));
}
