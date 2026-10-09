import {DatabaseSync} from 'node:sqlite';
import {gunzipSync} from 'node:zlib';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
export const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
export function readR10Inputs(){
 const db=new DatabaseSync(path.join(base,'storage/core.sqlite'),{readOnly:true});db.exec('PRAGMA query_only=ON');
 try{
  const batch=prefix=>{const r=db.prepare('SELECT batch_key,body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 1').get(prefix+':%');if(!r)return null;const s=String(r.body);return {key:r.batch_key,storedAt:Number(r.stored_at),body:JSON.parse(s.startsWith('gzip:')?gunzipSync(Buffer.from(s.slice(5),'base64')).toString():s)};};
  return {macro:batch('macro'),slice:batch('projection-macro:assetBubble'),price:batch('shadowSp500Benchmark')};
 }finally{db.close();}
}
export function saveReport(name,value){fs.mkdirSync(base,{recursive:true});const json=JSON.stringify(value,null,2);for(const extension of ['json','txt'])fs.writeFileSync(path.join(base,`local-asset-bubble-r10-${name}.${extension}`),json+'\n');}
export const seriesIds=['BOGZ1LM793164115Q','BOGZ1LM103164115Q','GDP','BOGZ1FL153064486Q','M2SL','BOGZ1FA153064475Q','BOGZ1FL153064475Q'];
export function r10InputSlice(macro){return {series:Object.fromEntries(seriesIds.map(id=>[id,macro?.body?.series?.[id]??[]])),sourceVersion:macro?.key??null,sourceStoredAt:macro?.storedAt??null};}
