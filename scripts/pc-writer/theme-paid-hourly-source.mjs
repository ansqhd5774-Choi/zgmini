// Authenticated, stored-first MarketParquet 1-hour proxy closes. No GMH requests.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadLocalProviders} from './local-env.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(Error(code),{code});};
export {PAID_HOURLY_MODE} from '../../worker/theme-paid-contract.mjs';
import {PAID_HOURLY_MODE} from '../../worker/theme-paid-contract.mjs';
// Exact dates from the existing approved R25 selector, not a new market calendar.
export const PAID_EARLY_CLOSE=['2024-07-03','2024-11-29','2024-12-24','2025-07-03','2025-11-28','2025-12-24','2026-11-27','2026-12-24','2027-11-26','2028-07-03','2028-11-24'];
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const NY=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
export function easternBarToUtc(value){
 need(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.0+)?$/.test(value),'PAID_HOURLY_TIMESTAMP');
 const target=value.slice(0,19).replace(' ','T'),wall=Date.parse(target+'Z');need(Number.isFinite(wall),'PAID_HOURLY_TIMESTAMP');
 const parts=Object.fromEntries(NY.formatToParts(new Date(wall)).map(x=>[x.type,x.value]));
 const rendered=Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
 const actual=new Date(wall+(wall-rendered)),check=Object.fromEntries(NY.formatToParts(actual).map(x=>[x.type,x.value]));
 need(`${check.year}-${check.month}-${check.day}T${check.hour}:${check.minute}:${check.second}`===target,'PAID_HOURLY_TIMEZONE');
 return actual.toISOString();
}
export function selectedHourlySql(symbols){
 need(Array.isArray(symbols)&&symbols.length&&new Set(symbols).size===symbols.length&&symbols.every(s=>/^[A-Z][A-Z0-9.-]{0,15}$/.test(s)),'PAID_HOURLY_SYMBOLS');
 const early=PAID_EARLY_CLOSE.map(d=>"DATE '"+d+"'").join(',');
 return "SELECT CAST(timestamp AS DATE)::VARCHAR AS trade_date, to_json(list(struct_pack(symbol := symbol, bar_time := CAST(timestamp AS VARCHAR), close := close) ORDER BY symbol)) AS observations FROM bars WHERE symbol IN ("+symbols.map(s=>"'"+s+"'").join(',')+") AND hour(timestamp)=CASE WHEN CAST(timestamp AS DATE) IN ("+early+") THEN 12 ELSE 15 END GROUP BY 1 ORDER BY 1";
}
export function parseSelectedHourly(result,{symbols,start,end}={}){
 need(!result.error&&Array.isArray(result.columns)&&Array.isArray(result.rows)&&result.truncated===false,'PAID_HOURLY_QUERY_INCOMPLETE');
 const di=result.columns.indexOf('trade_date'),oi=result.columns.indexOf('observations');need(di>=0&&oi>=0,'PAID_HOURLY_QUERY_COLUMNS');
 const wanted=new Set(symbols),series=Object.fromEntries(symbols.map(s=>[s,[]]));let previous='';
 for(const row of result.rows){const d=row[di];need(date(d)&&d>=start&&d<=end&&d>previous,'PAID_HOURLY_DATE_ORDER');previous=d;const obs=typeof row[oi]==='string'?JSON.parse(row[oi]):row[oi];need(Array.isArray(obs),'PAID_HOURLY_OBSERVATIONS');const seen=new Set();
  for(const bar of obs){bar.timestamp=bar.timestamp??bar.bar_time;need(wanted.has(bar.symbol)&&!seen.has(bar.symbol)&&Number.isFinite(bar.close)&&bar.close>0&&bar.timestamp?.slice(0,10)===d,'PAID_HOURLY_BAR');seen.add(bar.symbol);
   const hour=PAID_EARLY_CLOSE.includes(d)?'12':'15';need(bar.timestamp.slice(11,13)===hour,'PAID_HOURLY_PROXY_HOUR');
   series[bar.symbol].push({date:d,close:bar.close,timestamp:easternBarToUtc(bar.timestamp)});
  }
 }
 return series;
}
function decodeMcp(text){const raw=text.trim();if(raw.startsWith('{'))return JSON.parse(raw);const blocks=raw.split(/\r?\n/).filter(s=>s.startsWith('data: '));need(blocks.length===1,'PAID_HOURLY_RPC_FORMAT');return JSON.parse(blocks[0].slice(6));}
export async function paidMcpCall(base,name,args,{fetchImpl=fetch,key=loadLocalProviders(base).MARKETPARQUET_API_KEY}={}){
 need(typeof key==='string'&&key,'PAID_HOURLY_KEY');const r=await fetchImpl('https://marketparquet.com/mcp',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-06-18'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}}),redirect:'error',signal:AbortSignal.timeout(100000)});
 need(r.ok,'PAID_HOURLY_HTTP_'+r.status);const bytes=Buffer.from(await r.arrayBuffer());need(bytes.length<=16000000,'PAID_HOURLY_RESPONSE_SIZE');const rpc=decodeMcp(bytes.toString('utf8'));need(!rpc.error&&!rpc.result?.isError,'PAID_HOURLY_RPC_ERROR');const value=rpc.result.structuredContent??JSON.parse(rpc.result.content.find(x=>x.type==='text').text);need(!value.error,'PAID_HOURLY_PROVIDER_ERROR');return {value,bytes};
}
const home=base=>path.join(base,'marketparquet-paid','hourly-selected');
const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export async function syncPaidHourly(base,{symbols,start='2023-01-01',fetchImpl=fetch,maxChunks=Infinity,onProgress=()=>{}}={}){
 selectedHourlySql(symbols);need(date(start),'PAID_HOURLY_START');const dir=home(base),universe=sha(JSON.stringify([...symbols].sort()));fs.mkdirSync(dir,{recursive:true});const universeRoot=path.join(dir,universe);fs.mkdirSync(universeRoot,{recursive:true});
 const lock=path.join(dir,'collection.lock');let fd;try{fd=fs.openSync(lock,'wx');}catch(e){if(e.code==='EEXIST')return {status:'RUNNING_OTHER_CONSUMER'};throw e;}
 fs.writeSync(fd,JSON.stringify({pid:process.pid,at:new Date().toISOString()}));fs.closeSync(fd);
 try{
 const catalogue=(await paidMcpCall(base,'list_datasets',{}, {fetchImpl})).value;
 need(catalogue.plan==='full'&&catalogue.mcp_included===true,'PAID_HOURLY_ENTITLEMENT');const dataset=catalogue.datasets?.find(d=>d.dataset==='etf_1hour');need(date(dataset?.coverage?.[1]),'PAID_HOURLY_CATALOGUE');const end=dataset.coverage[1],activeFile=path.join(universeRoot,'ACTIVE.json');
 const active=fs.existsSync(activeFile)?JSON.parse(fs.readFileSync(activeFile)):null;
 if(active)need(date(active.date)&&['.',`generations/${active.date}`].includes(active.directory),'PAID_HOURLY_ACTIVE_SCOPE');
 // Split-adjusted history may change at corporate actions. Acquire one coherent
 // warm-up generation per provider publication day, then reuse it within the day.
 const store=active&&active.date!==end?path.join(universeRoot,'generations',end):active?path.resolve(universeRoot,active.directory):universeRoot;
 fs.mkdirSync(store,{recursive:true});let acquired=0;
 for(let from=start;from<=end;){let through=[addDays(from,179),end].sort()[0];
  const previous=fs.readdirSync(store).filter(n=>n.endsWith('.receipt.json')).map(n=>JSON.parse(fs.readFileSync(path.join(store,n)))).filter(r=>r.start===from&&r.end<=through).sort((a,b)=>b.end.localeCompare(a.end))[0];
  if(previous)through=previous.end;
  const name=from+'_'+through,file=path.join(store,name+'.json'),receiptFile=file+'.receipt.json';
  if(fs.existsSync(receiptFile)){const receipt=JSON.parse(fs.readFileSync(receiptFile));need(receipt.sha256===sha(fs.readFileSync(file))&&receipt.universeSha256===universe,'PAID_HOURLY_STORED_SHA');}
  else{
   if(acquired>=maxChunks)return {status:'RUNNING',store,end,acquired};
   const {bytes,value}=await paidMcpCall(base,'query_sql',{asset:'etf',timeframe:'1hour',start_date:from,end_date:through,sql:selectedHourlySql(symbols),max_rows:200},{fetchImpl});
   parseSelectedHourly(value,{symbols,start:from,end:through});
   const receipt={schema:'ZGMINI_PAID_HOURLY_RESPONSE_V1',plan:'full',asset:'etf_1hour',priceMode:PAID_HOURLY_MODE,start:from,end:through,universeSha256:universe,symbols:[...symbols],sha256:sha(bytes),sourceStoredAt:new Date().toISOString(),rows:value.row_count};
   if(fs.existsSync(file))need(sha(fs.readFileSync(file))===receipt.sha256,'PAID_HOURLY_ORPHAN_BYTES');else fs.writeFileSync(file,bytes,{flag:'wx'});
   fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});acquired++;onProgress({status:'CHUNK_STORED',start:from,end:through,dates:value.row_count});
  }
  from=addDays(through,1);
 }
 const pointer=JSON.stringify({date:end,directory:path.relative(universeRoot,store).replaceAll('\\','/')||'.'});const temp=activeFile+'.'+process.pid+'.tmp';fs.writeFileSync(temp,pointer,{flag:'wx'});fs.renameSync(temp,activeFile);
 return {status:'STORED_READBACK_VERIFIED',store,end,acquired};
 }finally{fs.unlinkSync(lock);}
}
export function readPaidHourly(base,symbols){
 const universe=sha(JSON.stringify([...symbols].sort())),root=path.join(home(base),universe);need(fs.existsSync(root),'PAID_HOURLY_STORE_MISSING');
 const activeFile=path.join(root,'ACTIVE.json'),active=fs.existsSync(activeFile)?JSON.parse(fs.readFileSync(activeFile)):null;
 if(active)need(date(active.date)&&['.',`generations/${active.date}`].includes(active.directory),'PAID_HOURLY_ACTIVE_SCOPE');
 const dir=active?path.resolve(root,active.directory):root;const series=Object.fromEntries(symbols.map(s=>[s,[]])),proofs=[];
 for(const n of fs.readdirSync(dir).filter(n=>n.endsWith('.receipt.json')).sort()){
  const r=JSON.parse(fs.readFileSync(path.join(dir,n))),bytes=fs.readFileSync(path.join(dir,n.replace('.receipt.json','')));need(r.plan==='full'&&r.universeSha256===universe&&r.sha256===sha(bytes),'PAID_HOURLY_STORED_SHA');
  const rpc=decodeMcp(bytes.toString('utf8')),value=rpc.result.structuredContent??JSON.parse(rpc.result.content.find(x=>x.type==='text').text);
  const parsed=parseSelectedHourly(value,{symbols,start:r.start,end:r.end});for(const s of symbols)series[s].push(...parsed[s]);proofs.push(r);
 }
 for(const s of symbols){const map=new Map();for(const p of series[s]){const old=map.get(p.date);need(!old||old.close===p.close,'PAID_HOURLY_OVERLAP_CONFLICT');map.set(p.date,p);}series[s]=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
 return {series,proofs,priceMode:PAID_HOURLY_MODE,sourceStoredAt:proofs.map(r=>r.sourceStoredAt).sort().at(-1)};
}
