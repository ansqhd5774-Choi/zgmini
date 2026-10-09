import {DatabaseSync} from 'node:sqlite';
import {gunzipSync} from 'node:zlib';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const database=path.join(process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),'storage/core.sqlite');
const db=new DatabaseSync(database,{readOnly:true});
db.exec('PRAGMA query_only=ON');
const summary=[];
try {
 for(const prefix of ['macro','projection-macro:supplyShock']) {
  const batch=db.prepare('SELECT batch_key,body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 1').get(prefix+':%');
  if(!batch){summary.push({prefix,status:'MISSING'});continue;}
  const text=String(batch.body);
  const body=JSON.parse(text.startsWith('gzip:')?gunzipSync(Buffer.from(text.slice(5),'base64')).toString():text);
  const keys=['MCOILWTICO','GASREGCOVM','INDPRO','CPIAUCSL','CPILFESL','PCEC96'];
  const series=Object.fromEntries(keys.map(id=>[id,body.series?.[id]??[]]));
  for(const id of ['gscpiRows','copperRows'])series[id]=body.external?.[id]??[];
  summary.push({prefix,sourceVersion:batch.batch_key,sourceStoredAt:batch.stored_at,bodyKeys:Object.keys(body),series:Object.fromEntries(Object.entries(series).map(([id,rows])=>{
   const dates=rows.map(row=>row.observationDate??row.date).filter(Boolean).sort();
   return [id,{count:rows.length,first:dates[0]??null,last:dates.at(-1)??null,releaseDateCount:rows.filter(row=>row.releaseDate||row.publishedAt).length}];
  }))});
 }
}finally{db.close();}
fs.mkdirSync('work/supply-r10-sources',{recursive:true});
fs.writeFileSync('work/supply-r10-sources/stored-audit.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
