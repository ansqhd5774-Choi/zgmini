/** Read-only PC inventory for the three missing Asset Bubble R10 inputs.
 * No network, database writes, publication, or secret reads.
 * Node >=24; operates on existing %USERPROFILE%/.zgmini/pc-writer.
 */
import {DatabaseSync} from 'node:sqlite';
import {gunzipSync} from 'node:zlib';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base=process.env.ZGMINI_PC_HOME||path.join(os.homedir(),'.zgmini','pc-writer');
const dbPath=path.join(base,'storage','core.sqlite');
const report={task:'ASSET_BUBBLE_R10_MISSING_INPUTS',mode:'READ_ONLY',checkedAt:new Date().toISOString(),
  providerRequests:0,dbWrites:0,publication:false,formulasChanged:false};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
const msDate=x=>finite(x)&&x>0?new Date(x).toISOString():null;
const summarize=rows=>{
  const valid=(Array.isArray(rows)?rows:[]).filter(x=>validDate(x?.observationDate)&&finite(x?.value));
  valid.sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  return {count:valid.length,first:valid[0]?.observationDate??null,last:valid.at(-1)?.observationDate??null};
};
const fileState=name=>{
  const f=path.join(base,name);
  if(!fs.existsSync(f))return {exists:false};
  const stat=fs.statSync(f);
  return {exists:true,bytes:stat.size,modifiedAt:stat.mtime.toISOString()};
};
if(!fs.existsSync(dbPath)){
  report.status='AUTOMATION_BLOCKED';report.reason='LOCAL_CORE_SQLITE_NOT_FOUND';
  console.log(JSON.stringify(report,null,2));process.exitCode=2;
}else{
  let db;
  try{
    db=new DatabaseSync(dbPath,{readOnly:true});
    db.exec('PRAGMA query_only=ON');
    const readBatch=prefix=>{
      const row=db.prepare('SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 1').get(prefix+':%');
      if(!row)return {exists:false,storedAt:null,body:{}};
      const raw=String(row.body);
      const decoded=raw.startsWith('gzip:')?gunzipSync(Buffer.from(raw.slice(5),'base64'),{maxOutputLength:32000000}).toString('utf8'):raw;
      return {exists:true,storedAt:Number(row.stored_at),body:JSON.parse(decoded)};
    };
    const full=readBatch('macro'),slice=readBatch('projection-macro:assetBubble');
    const benchmark=readBatch('shadowSp500Benchmark');
    const ids=['BOGZ1FA153064475Q','BOGZ1FL153064475Q'];
    report.macro={exists:full.exists,storedAt:msDate(full.storedAt),
      series:Object.fromEntries(ids.map(id=>[id,summarize(full.body?.series?.[id])]))};
    report.assetBubbleSlice={exists:slice.exists,storedAt:msDate(slice.storedAt),
      matchesMacro:slice.exists&&full.exists&&slice.storedAt===full.storedAt,
      series:Object.fromEntries(ids.map(id=>[id,summarize(slice.body?.series?.[id])]))};
    report.sp500Shadow={exists:benchmark.exists,storedAt:msDate(benchmark.storedAt),
      historyMode:benchmark.body?.historyMode??null,
      rows:summarize(benchmark.body?.series?.SP500)};
    report.breadthPit={
      universe:fileState('local-breadth-r7-pit-universe.json'),
      priceHistory:fileState('local-breadth-r7-pit-price-history.json'),
      prospectiveReport:fileState('local-breadth-r7-prospective-last-run.json'),
    };
    report.status='COMPLETED_READ_ONLY';
    report.findings=[
      ...ids.filter(id=>report.macro.series[id].count===0).map(id=>'FULL_MACRO_MISSING_'+id),
      ...ids.filter(id=>report.macro.series[id].count>0&&report.assetBubbleSlice.series[id].count===0).map(id=>'PROJECTION_SLICE_MISSING_'+id),
      ...(report.sp500Shadow.rows.count<250?['SHADOW_SP500_HISTORY_UNVERIFIED_OR_SHORT']:[]),
      ...(!report.breadthPit.universe.exists||!report.breadthPit.priceHistory.exists?['BREADTH_R7_PIT_FILES_MISSING']:[]),
    ];
    console.log(JSON.stringify(report,null,2));
  }catch(e){
    report.status='AUTOMATION_BLOCKED';report.reason=String(e?.code??'SQLITE_READ_ERROR');
    console.log(JSON.stringify(report,null,2));process.exitCode=2;
  }finally{try{db?.close()}catch{}}
}
