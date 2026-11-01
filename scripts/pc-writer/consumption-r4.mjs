import {marketOperationalStore} from '../../worker/market-operational-store.mjs';
import {calculateConsumptionR4} from '../../lib/market-score/consumption-r4.mjs';
import {hash} from './d1.mjs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {localDatabase} from './local-db.mjs';
import {loadStoredConsumptionR4} from '../../worker/consumption-r4-reader.mjs';

export function parseRealPceCsv(text) {
  const lines=text.trim().split(/\r?\n/);
  if(!/^\s*(observation_date|DATE),PCEC96\s*$/.test(lines[0]))throw Error('CONSUMPTION_R4_CSV_SCHEMA');
  return lines.slice(1).map(line=>{
    const [observationDate,raw,...extra]=line.split(',');
    if(extra.length||!/^\d{4}-\d{2}-01$/.test(observationDate))throw Error('CONSUMPTION_R4_CSV_ROW');
    const value=raw==='.'||raw===''?null:Number(raw);
    if(value!==null&&(!Number.isFinite(value)||value<=0))throw Error('CONSUMPTION_R4_CSV_VALUE');
    return {observationDate,value};
  });
}

// PC collection only. Saved raw input precedes all calculation/publication.
export async function collectConsumptionR4({db,fetchImpl=globalThis.fetch,now=Date.now()}={}) {
  const store=marketOperationalStore(db);
  const previous=await store.readInput('consumption-r4');
  if(previous&&now-previous.storedAt<86400000&&now>=previous.storedAt)return {status:'COMPLETE',providerRequests:0};
  const response=await fetchImpl('https://fred.stlouisfed.org/graph/fredgraph.csv?id=PCEC96',{signal:AbortSignal.timeout(20000)});
  if(!response.ok)return {status:'FAILED',providerRequests:1};
  const rows=parseRealPceCsv(await response.text());
  if(rows.length<24||new Set(rows.map(row=>row.observationDate)).size!==rows.length)throw Error('CONSUMPTION_R4_HISTORY_INVALID');
  const body={series:{PCEC96:rows},sourceVersion:'CONSUMPTION_R4:'+hash(rows),historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false};
  await store.writeInput('consumption-r4',body,now);
  const check=await store.readInput('consumption-r4');
  if(hash(check?.body)!==hash(body))throw Error('CONSUMPTION_R4_INPUT_READBACK');
  const result=calculateConsumptionR4(check.body.series.PCEC96,{asOfDate:new Date(now).toISOString().slice(0,10)});
  return {status:result.status==='READY'?'COMPLETE':'FAILED',providerRequests:1,observationDate:result.updatedAt};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
  const db=localDatabase(path.join(base,'storage','core.sqlite'));
  try {
    const collected=process.argv.includes('--collect')?await collectConsumptionR4({db}):null;
    const result=await loadStoredConsumptionR4(db,{asOf:new Date().toISOString().slice(0,10)});
    console.log(JSON.stringify({collection:collected,status:result.status,score:result.score,observationDate:result.updatedAt,trendPoints:result.trend.length,methodologyVersion:result.methodologyVersion,remoteWrites:0}));
    if(result.status!=='READY')process.exitCode=1;
  } catch {console.log(JSON.stringify({status:'FAILED',reason:'CONSUMPTION_R4_COLLECTION_OR_STORAGE_FAILED',remoteWrites:0}));process.exitCode=1;}
  finally {db.close();}
}
