import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';
import {loadLocalProviders} from './local-env.mjs';
import {localDatabase} from './local-db.mjs';
import {publicFeedStore} from '../../worker/public-feed-store.mjs';
import {loadSectorFearGreedR3RollingInputs} from './sector-fear-greed-r3-rolling-local.mjs';
import {parseSectorFearGreedR3PitCsv,SECTOR_FEAR_GREED_R3_BENCHMARKS,buildSectorFearGreedR3RollingSource} from '../../lib/market-score/sector-fear-greed-r3-rolling.mjs';
import {buildSectorFearGreedR3Public} from '../../lib/market-score/sector-fear-greed-r3-public.mjs';
import {newYorkClock,provisionalCollectionWindow,SECTOR_PROVISIONAL_KEY} from '../../lib/market-score/sector-provisional.mjs';
const save=(f,x)=>{const t=f+'.tmp-'+process.pid;fs.writeFileSync(t,JSON.stringify(x));fs.renameSync(t,f);};
export function calculateSectorProvisional(inputs,snapshot){
 const {date,asOf,bars}=snapshot;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(asOf))||Date.parse(asOf)>Date.parse(snapshot.retrievedAt)||newYorkClock(Date.parse(asOf)).date!==date)throw Error('SECTOR_PROVISIONAL_TIME_INVALID');
 const pit=parseSectorFearGreedR3PitCsv(inputs.pitCsv);
 const members=pit.entries.filter(x=>x.dateAdded<=date&&(!x.dateRemoved||date<x.dateRemoved)).map(x=>x.ticker);
 const symbols=[...new Set([...members,...SECTOR_FEAR_GREED_R3_BENCHMARKS])];
 const fresh=new Map();
 for(const t of symbols){const list=bars?.[t]?.filter(b=>String(b.t).slice(0,10)===date);if(!Array.isArray(list)||list.length!==1)throw Error('SECTOR_PROVISIONAL_INCOMPLETE_SYMBOLS');const b=list[0];if(!Number.isFinite(b.c)||b.c<=0||!Number.isFinite(b.v)||b.v<0)throw Error('SECTOR_PROVISIONAL_INVALID_BAR');fresh.set(t,b);}
 // A current split/revision must not silently combine with stale historical prices.
 const anchorBars=new Map();
 if(snapshot.anchorDate){const anchor=new Map(inputs.stockRows.filter(x=>x.tradeDate===snapshot.anchorDate).map(x=>[x.ticker,x.currentClose]));for(const t of SECTOR_FEAR_GREED_R3_BENCHMARKS)anchor.set(t,inputs.series[t].find(x=>x.date===snapshot.anchorDate)?.close);for(const t of symbols){const old=anchor.get(t),check=bars[t]?.find(b=>String(b.t).slice(0,10)===snapshot.anchorDate);if(!Number.isFinite(old)&&!SECTOR_FEAR_GREED_R3_BENCHMARKS.includes(t))continue;const tolerance=SECTOR_FEAR_GREED_R3_BENCHMARKS.includes(t)?0.01:1e-8;if(!Number.isFinite(old)||!check||!Number.isFinite(check.c)||check.c<=0||!Number.isFinite(check.v)||check.v<0||Math.abs(check.c/old-1)>tolerance)throw Error('SECTOR_PROVISIONAL_ADJUSTMENT_RECONCILIATION_REQUIRED');anchorBars.set(t,check);}}
 if(members.length<490)throw Error('SECTOR_PROVISIONAL_PIT_INCOMPLETE');
 // Match the existing ETF collector's 1% overlap guard, with official prior-bar
 // revisions applied in memory only. Finalized files and scores remain intact.
 const stockRows=[...inputs.stockRows.filter(x=>x.tradeDate<date),...members.map(t=>({ticker:t,tradeDate:date,currentClose:fresh.get(t).c,currentVolume:fresh.get(t).v}))];
 const series=Object.fromEntries(SECTOR_FEAR_GREED_R3_BENCHMARKS.map(t=>[t,[...inputs.series[t].filter(x=>x.date<date).map(x=>x.date===snapshot.anchorDate&&anchorBars.has(t)?{date:x.date,close:anchorBars.get(t).c,volume:anchorBars.get(t).v}:x),{date,close:fresh.get(t).c,volume:fresh.get(t).v}]]));
 const source=buildSectorFearGreedR3RollingSource({stockRows,pitCsv:inputs.pitCsv,series,generatedAt:snapshot.retrievedAt,cutoffDate:date});
 const result=buildSectorFearGreedR3Public(source,{now:Date.parse(snapshot.retrievedAt)});
 if(result.observationDate!==date)throw Error('SECTOR_PROVISIONAL_AXES_NOT_ALIGNED');
 return {status:'READY',phase:'PROVISIONAL',source:'ALPACA_IEX_SPLIT',delayMinutes:15,asOf,updatedAt:snapshot.retrievedAt,observationDate:date,point:result.history.at(-1),coverage:{expected:members.length,observed:members.length},methodologyVersion:result.methodologyVersion};
}
export async function runSectorProvisional(base,{now=Date.now(),fetchImpl=fetch,snapshot=null,write=false}={}){
 const reportFile=path.join(base,'local-sector-provisional-last-run.json');const report={at:new Date(now).toISOString(),status:'SKIPPED',providerCalls:0};
 if(!snapshot&&!provisionalCollectionWindow(now))return {...report,reason:'OUTSIDE_REGULAR_SESSION_DELAYED_WINDOW'};
 if(!snapshot&&fs.existsSync(reportFile)){const old=JSON.parse(fs.readFileSync(reportFile,'utf8'));if(now-Date.parse(old.at)>=0&&now-Date.parse(old.at)<5*60000)return {...report,status:'CACHED'};}
 try{
  const inputs=loadSectorFearGreedR3RollingInputs(base);
  const date=newYorkClock(now).date;
  if(inputs.diagnostics.stockLastDate>=date)return {...report,status:'CONFIRMED_INPUT_PRESENT'};
  if(!snapshot){
   const pit=parseSectorFearGreedR3PitCsv(inputs.pitCsv),members=pit.entries.filter(x=>x.dateAdded<=date&&(!x.dateRemoved||date<x.dateRemoved)).map(x=>x.ticker);
   const symbols=[...new Set([...members,...SECTOR_FEAR_GREED_R3_BENCHMARKS])];
   const env=loadLocalProviders(base);if(!env.APCA_API_KEY_ID||!env.APCA_API_SECRET_KEY)throw Error('SECTOR_PROVISIONAL_CREDENTIALS_MISSING');
   const asOf=new Date(now-15*60000).toISOString(),url=new URL('https://data.alpaca.markets/v2/stocks/bars');
   // Midnight UTC is before the US regular session in both DST regimes.
   const anchorDate=inputs.diagnostics.stockLastDate;
   url.search=new URLSearchParams({symbols:symbols.join(','),timeframe:'1Day',start:anchorDate+'T00:00:00Z',end:asOf,feed:'iex',adjustment:'split',limit:'10000'});
   report.providerCalls=1;
   const r=await fetchImpl(url,{headers:{'APCA-API-KEY-ID':env.APCA_API_KEY_ID,'APCA-API-SECRET-KEY':env.APCA_API_SECRET_KEY},signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw Error('SECTOR_PROVISIONAL_HTTP_'+r.status);const body=await r.json();if(body.next_page_token)throw Error('SECTOR_PROVISIONAL_PAGE_BUDGET');
   snapshot={date,asOf,retrievedAt:new Date(now).toISOString(),anchorDate,bars:body.bars};
  }
  // Separate raw cache: never append partial bars to finalized stock/ETF files.
  if(write)save(path.join(base,'local-sector-provisional-input.json'),snapshot);
  const output=calculateSectorProvisional(inputs,snapshot);
  if(write){const db=localDatabase(path.join(base,'storage','core.sqlite'));try{const store=publicFeedStore(db);await store.writeOutput(SECTOR_PROVISIONAL_KEY,output,now);const check=await store.readOutput(SECTOR_PROVISIONAL_KEY);if(JSON.stringify(check?.body)!==JSON.stringify(output))throw Error('SECTOR_PROVISIONAL_READBACK_FAILED');}finally{db.close();}}
  Object.assign(report,{status:write?'LOCAL_READY':'CHECK_READY',observationDate:output.observationDate,asOf:output.asOf,coverage:output.coverage,output});
 }catch(e){Object.assign(report,{status:'FAILED_PREVIOUS_CONFIRMED_PRESERVED',error:/^SECTOR_[A-Z0-9_]+$/.test(e.message)?e.message:'SECTOR_PROVISIONAL_FAILED'});}
 if(write)save(reportFile,{...report,output:undefined});return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
 const result=await runSectorProvisional(base,{write:process.argv.includes('--write-local')});console.log(JSON.stringify({...result,output:undefined}));
}
